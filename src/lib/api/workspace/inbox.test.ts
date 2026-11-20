import { uid } from "@/test/ids";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  fetchConversation,
  fetchConversations,
  fetchInboxCheck,
  fetchInboxPeople,
  sendInboxMessage,
} from "./inbox";
import { jsonResponse } from "../core/test-helpers";

const NABIN = { id: uid(1), name: "Nabin Adhikari", job_title: "Director", has_left: false };
const SENT_AT = "2026-11-15T09:20:00+05:45";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sentJson(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

describe("fetchInboxCheck", () => {
  it("GETs the unread count and the newest message's id", async () => {
    const fetchFn = answering(jsonResponse({ unread: 2, latest: uid(907) }));

    const check = await fetchInboxCheck(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/inbox/check/");
    expect(check).toEqual({ unread: 2, latest: uid(907) });
  });

  it("accepts no messages yet", async () => {
    const check = await fetchInboxCheck(answering(jsonResponse({ unread: 0, latest: null })));

    expect(check).toEqual({ unread: 0, latest: null });
  });

  it.each([
    ["a negative count", { unread: -1, latest: null }],
    ["a text count", { unread: "2", latest: null }],
    ["a missing id", { unread: 0 }],
  ])("refuses %s", async (_, body) => {
    await expect(fetchInboxCheck(answering(jsonResponse(body)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("fetchConversations", () => {
  it("GETs my conversations in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({
        conversations: [
          {
            person: NABIN,
            last: { text: "Thanks.", from_me: true, sent_at: SENT_AT },
            unread: true,
          },
        ],
      }),
    );

    const found = await fetchConversations(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/inbox/");
    expect(found).toEqual([
      {
        person: { id: uid(1), name: "Nabin Adhikari", jobTitle: "Director", hasLeft: false },
        last: { text: "Thanks.", fromMe: true, sentAt: SENT_AT },
        unread: true,
      },
    ]);
  });

  it("refuses a date that isn't one", async () => {
    const body = {
      conversations: [
        { person: NABIN, last: { text: "Hi", from_me: true, sent_at: "today" }, unread: false },
      ],
    };

    await expect(fetchConversations(answering(jsonResponse(body)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("fetchInboxPeople", () => {
  it("GETs who I can write to", async () => {
    const fetchFn = answering(
      jsonResponse({ people: [{ id: uid(4), name: "Pooja Shrestha", job_title: "" }] }),
    );

    expect(await fetchInboxPeople(fetchFn)).toEqual([
      { id: uid(4), name: "Pooja Shrestha", jobTitle: "" },
    ]);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/inbox/people/");
  });
});

describe("fetchConversation", () => {
  it("GETs one conversation, oldest first", async () => {
    const fetchFn = answering(
      jsonResponse({
        person: { ...NABIN, has_left: true },
        can_write: false,
        messages: [{ id: uid(901), text: "<b>Hi</b>", from_me: false, sent_at: SENT_AT }],
        more: false,
      }),
    );

    const thread = await fetchConversation(uid(1), fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/inbox/${uid(1)}/`);
    expect(thread).toEqual({
      person: { id: uid(1), name: "Nabin Adhikari", jobTitle: "Director", hasLeft: true },
      canWrite: false,
      messages: [{ id: uid(901), text: "<b>Hi</b>", fromMe: false, sentAt: SENT_AT }],
      hasMore: false,
    });
  });

  it("refuses a message over 2,000 characters", async () => {
    const body = {
      person: NABIN,
      can_write: true,
      messages: [{ id: uid(1), text: "a".repeat(2001), from_me: false, sent_at: SENT_AT }],
      more: false,
    };

    await expect(fetchConversation(uid(1), answering(jsonResponse(body)))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("sendInboxMessage", () => {
  it("POSTs only the text and returns the stored message", async () => {
    const fetchFn = answering(
      jsonResponse({ id: uid(910), text: "On my way", from_me: true, sent_at: SENT_AT }, 201),
    );

    const sent = await sendInboxMessage(uid(4), "On my way", fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/inbox/${uid(4)}/`);
    expect(init?.method).toBe("POST");
    expect(sentJson(init)).toEqual({ text: "On my way" });
    expect(sent).toEqual({ id: uid(910), text: "On my way", fromMe: true, sentAt: SENT_AT });
  });

  it("turns a refused text into a field error", async () => {
    const fetchFn = answering(jsonResponse({ text: ["Write a message."] }, 400));

    const failure = await sendInboxMessage(uid(4), " ", fetchFn).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(InvalidFieldsError);
    expect(failure).toMatchObject({ fieldErrors: { text: ["Write a message."] } });
  });

  it("passes on any other refusal", async () => {
    const fetchFn = answering(jsonResponse({ detail: "This person has left." }, 403));

    await expect(sendInboxMessage(uid(4), "Hi", fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
