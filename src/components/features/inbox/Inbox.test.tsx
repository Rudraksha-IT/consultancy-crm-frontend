import type { RecordId } from "@/lib/recordId";
import { uid } from "@/test/ids";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { InboxCheckContext, type InboxCheckState } from "@/components/features/shell/inboxCheck";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { INBOX_TEXT } from "@/constants/inbox";
import { consultancySummary } from "@/test/consultancy";
import { fakeMatchMedia } from "@/test/matchMedia";
import { testHost } from "@/test/hosts";

import { InboxPage } from "./InboxPage";
import { openIdFrom } from "./InboxRoute";

const SITA: StaffContext = {
  staff: { id: uid(2), name: "Sita Karki", email: "counsellor@office.com", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const PLATFORM_VISIT: StaffContext = {
  ...SITA,
  staff: { ...SITA.staff, role: "admin" },
  supportAccess: { platformAdminName: "Platform Ops", platformHost: testHost("admin") },
};

const LIST = "/api/inbox/";
const PEOPLE = "/api/inbox/people/";
const WITH_NABIN = `/api/inbox/${uid(1)}/`;
const WITH_ROHAN = `/api/inbox/${uid(6)}/`;

const NABIN = { id: uid(1), name: "Nabin Adhikari", job_title: "Director", has_left: false };
const POOJA = { id: uid(4), name: "Pooja Shrestha", job_title: "Front desk", has_left: false };
const ROHAN = { id: uid(6), name: "Rohan Shah", job_title: "Counsellor", has_left: true };
const EARLIER = "2026-10-28T09:20:00+05:45";
const LATER = "2026-10-28T09:43:00+05:45";

const CONVERSATIONS = {
  conversations: [
    {
      person: POOJA,
      last: { text: "Shall I send her up?", from_me: false, sent_at: LATER },
      unread: true,
    },
    {
      person: NABIN,
      last: { text: "Yes, after lunch.", from_me: true, sent_at: EARLIER },
      unread: false,
    },
    {
      person: ROHAN,
      last: { text: "Handing over Rohan's notes.", from_me: false, sent_at: EARLIER },
      unread: false,
    },
  ],
};

const THREAD_WITH_NABIN = {
  person: NABIN,
  can_write: true,
  messages: [
    { id: uid(901), text: "Can you call Anjali's father?", from_me: false, sent_at: EARLIER },
    { id: uid(902), text: "Yes, after lunch.", from_me: true, sent_at: LATER },
  ],
  more: false,
};

function checkOf(overrides: Partial<InboxCheckState> = {}): InboxCheckState {
  return { unread: 1, latest: uid(902), refresh: vi.fn<() => void>(), ...overrides };
}

/** The page with its open conversation kept in state, as the route keeps it in the address. */
function Harness({ initial }: { initial: RecordId | null }) {
  const [openId, setOpenId] = useState(initial);
  return <InboxPage openId={openId} onOpen={setOpenId} />;
}

function renderInbox(
  options: { context?: StaffContext; check?: InboxCheckState; openId?: RecordId | null } = {},
) {
  const check = options.check ?? checkOf();
  const view = render(
    <StaffContextContext value={options.context ?? SITA}>
      <InboxCheckContext value={check}>
        <Harness initial={options.openId ?? null} />
      </InboxCheckContext>
    </StaffContextContext>,
  );
  return { check, view };
}

function sentJson(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("The conversation list", () => {
  it("lists my conversations newest first, with who wrote last and what is unread", async () => {
    backend(on("GET", LIST, CONVERSATIONS));

    renderInbox();

    const list = await screen.findByRole("list", { name: "Conversations" });
    const rows = within(list).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Pooja Shrestha"),
      expect.stringContaining("Nabin Adhikari"),
      expect.stringContaining("Rohan Shah (has left)"),
    ]);
    const pooja = within(list).getByRole("button", { name: /Pooja Shrestha/ });
    const nabin = within(list).getByRole("button", { name: /Nabin Adhikari/ });
    expect(pooja).toHaveTextContent("Shall I send her up?");
    expect(within(pooja).getByText("Unread")).toBeInTheDocument();
    expect(nabin).toHaveTextContent("You: Yes, after lunch.");
    expect(within(nabin).queryByText("Unread")).not.toBeInTheDocument();
    expect(screen.getByText("Pick a conversation, or start a new one.")).toBeInTheDocument();
  });

  it("says when there are no conversations yet", async () => {
    backend(on("GET", LIST, { conversations: [] }));

    renderInbox();

    expect(await screen.findByText("No conversations yet.")).toBeInTheDocument();
  });

  it("says the Inbox couldn't load when the answer isn't one", async () => {
    backend(on("GET", LIST, { conversations: [{ person: NABIN }] }));

    renderInbox();

    expect(
      await screen.findByText("The Inbox couldn't be loaded. Try again in a moment."),
    ).toBeInTheDocument();
  });

  it("loads again when the check finds a new message", async () => {
    const fetchFn = backend(on("GET", LIST, CONVERSATIONS));
    const { view } = renderInbox();
    await screen.findByRole("list", { name: "Conversations" });
    const before = callsTo(fetchFn, "GET", LIST).length;

    view.rerender(
      <StaffContextContext value={SITA}>
        <InboxCheckContext value={checkOf({ latest: uid(950) })}>
          <Harness initial={null} />
        </InboxCheckContext>
      </StaffContextContext>,
    );

    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", LIST).length).toBe(before + 1);
    });
  });
});

describe("A conversation", () => {
  it("opens from the list, oldest first, mine and theirs told apart, and updates the count", async () => {
    const fetchFn = backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, THREAD_WITH_NABIN),
    );
    const { check } = renderInbox();

    await userEvent.click(await screen.findByRole("button", { name: /Nabin Adhikari/ }));

    const thread = await screen.findByRole("log", { name: "Conversation with Nabin Adhikari" });
    const messages = within(thread).getAllByRole("article");
    expect(messages.map((message) => message.textContent)).toEqual([
      expect.stringContaining("Nabin Adhikari: Can you call Anjali's father?"),
      expect.stringContaining("You: Yes, after lunch."),
    ]);
    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", WITH_NABIN)).toHaveLength(1);
    await waitFor(() => {
      expect(check.refresh).toHaveBeenCalled();
    });
  });

  it("shows text exactly as written, never as HTML", async () => {
    const html = '<img src=x onerror="alert(1)">';
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, {
        ...THREAD_WITH_NABIN,
        messages: [{ id: uid(1), text: html, from_me: false, sent_at: EARLIER }],
      }),
    );

    const { view } = renderInbox({ openId: uid(1) });

    expect(await screen.findByText(html)).toBeInTheDocument();
    expect(view.container.querySelector("img")).toBeNull();
  });

  it("invites a first message when the conversation is new", async () => {
    backend(
      on("GET", LIST, { conversations: [] }),
      on("GET", WITH_NABIN, { ...THREAD_WITH_NABIN, messages: [] }),
    );

    renderInbox({ openId: uid(1) });

    expect(await screen.findByText("Say hello to Nabin.")).toBeInTheDocument();
  });

  it("says only the newest 200 are shown when there are more", async () => {
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, { ...THREAD_WITH_NABIN, more: true }),
    );

    renderInbox({ openId: uid(1) });

    expect(await screen.findByText("Only the newest 200 messages are shown.")).toBeInTheDocument();
  });

  it("goes back to the list", async () => {
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    await userEvent.click(screen.getByRole("button", { name: "Back to conversations" }));

    expect(screen.queryByRole("log")).not.toBeInTheDocument();
    expect(screen.getByText("Pick a conversation, or start a new one.")).toBeInTheDocument();
  });

  it("on a phone, gives the whole page to an open conversation, and brings the header back on the list", async () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query.includes("40.0625rem"),
      ).matchMedia,
    );
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    expect(screen.queryByRole("button", { name: "New message" })).not.toBeInTheDocument();
    expect(screen.queryByText(INBOX_TEXT.intro)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).toHaveClass("sr-only");

    await userEvent.click(screen.getByRole("button", { name: "Back to conversations" }));

    expect(screen.getByRole("button", { name: "New message" })).toBeInTheDocument();
    expect(screen.getByText(INBOX_TEXT.intro)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Inbox" })).not.toHaveClass("sr-only");
  });

  it("keeps the title and New message beside an open conversation above 640", async () => {
    backend(on("GET", LIST, CONVERSATIONS), on("GET", WITH_NABIN, THREAD_WITH_NABIN));
    renderInbox({ openId: uid(1) });
    await screen.findByRole("log");

    expect(screen.getByRole("button", { name: "New message" })).toBeInTheDocument();
    expect(screen.getByText(INBOX_TEXT.intro)).toBeInTheDocument();
  });

  it("lets me read someone who has left, but not write to them", async () => {
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_ROHAN, {
        person: ROHAN,
        can_write: false,
        messages: [
          { id: uid(908), text: "Handing over Rohan's notes.", from_me: false, sent_at: EARLIER },
        ],
        more: false,
      }),
    );

    renderInbox({ openId: uid(6) });

    const thread = await screen.findByRole("log", { name: "Conversation with Rohan Shah" });
    expect(within(thread).getByText("Handing over Rohan's notes.")).toBeInTheDocument();
    expect(
      screen.getByText("Rohan Shah has left. You can read past messages, but not write."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says so when the person isn't in the office", async () => {
    backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", `/api/inbox/${uid(77)}/`, { detail: "Not found." }, 404),
    );

    renderInbox({ openId: uid(77) });

    expect(await screen.findByText("This person isn't in the office.")).toBeInTheDocument();
  });
});

describe("Writing", () => {
  /** The conversation with Nabin, where sending answers with `answer`. */
  function sendingBackend(answer: { body: unknown; status: number }) {
    return backend(
      on("GET", LIST, CONVERSATIONS),
      on("GET", WITH_NABIN, THREAD_WITH_NABIN),
      on("POST", WITH_NABIN, answer.body, answer.status),
    );
  }

  const SENT = { id: uid(903), text: "On my way", from_me: true, sent_at: LATER };

  it("sends on Enter, shows the message and empties the box", async () => {
    const fetchFn = sendingBackend({ body: SENT, status: 201 });
    const { check } = renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "On my way{Enter}");

    await waitFor(() => {
      expect(callsTo(fetchFn, "POST", WITH_NABIN)).toHaveLength(1);
    });
    expect(sentJson(callsTo(fetchFn, "POST", WITH_NABIN)[0]?.[1])).toEqual({ text: "On my way" });
    expect(await screen.findByText("On my way")).toBeInTheDocument();
    expect(box).toHaveValue("");
    expect(check.refresh).toHaveBeenCalled();
  });

  it("makes a new line on Shift + Enter, and sends with the button", async () => {
    const fetchFn = sendingBackend({ body: { ...SENT, text: "Line one\nLine two" }, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Line one{Shift>}{Enter}{/Shift}Line two");
    expect(callsTo(fetchFn, "POST", WITH_NABIN)).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sentJson(callsTo(fetchFn, "POST", WITH_NABIN)[0]?.[1])).toEqual({
        text: "Line one\nLine two",
      });
    });
  });

  it("counts characters and tells the keys", async () => {
    sendingBackend({ body: SENT, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hello");

    expect(box).toHaveAccessibleDescription(
      "5 of 2,000. Enter sends, Shift + Enter for a new line.",
    );
    expect(box).toHaveAttribute("maxlength", "2000");
  });

  it("sends nothing when the box is empty or only spaces", async () => {
    const fetchFn = sendingBackend({ body: SENT, status: 201 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "   {Enter}");

    expect(callsTo(fetchFn, "POST", WITH_NABIN)).toHaveLength(0);
  });

  it("shows the server's reason when the text is refused, keeping what was typed", async () => {
    sendingBackend({ body: { text: ["Write a message."] }, status: 400 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hi{Enter}");

    expect(await screen.findByText("Write a message.")).toBeInTheDocument();
    expect(box).toHaveValue("Hi");
  });

  it("shows a refusal's reason, e.g. a read-only office", async () => {
    sendingBackend({
      body: { detail: "This office can only be viewed right now.", status: "past_due" },
      status: 403,
    });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hi{Enter}");

    expect(
      await screen.findByText("This office can only be viewed right now."),
    ).toBeInTheDocument();
  });

  it("says the message wasn't sent when anything else goes wrong", async () => {
    sendingBackend({ body: {}, status: 500 });
    renderInbox({ openId: uid(1) });
    const box = await screen.findByRole("textbox", { name: "Message to Nabin Adhikari" });

    await userEvent.type(box, "Hi{Enter}");

    expect(await screen.findByText("The message wasn't sent. Try again.")).toBeInTheDocument();
  });
});

describe("New message", () => {
  it("picks anyone active in the office and opens the conversation", async () => {
    backend(
      on("GET", LIST, { conversations: [] }),
      on("GET", PEOPLE, {
        people: [
          { id: uid(1), name: "Nabin Adhikari", job_title: "Director" },
          { id: uid(4), name: "Pooja Shrestha", job_title: "" },
        ],
      }),
      on("GET", `/api/inbox/${uid(4)}/`, {
        person: POOJA,
        can_write: true,
        messages: [],
        more: false,
      }),
    );
    renderInbox();

    await userEvent.click(await screen.findByRole("button", { name: "New message" }));
    const dialog = await screen.findByRole("dialog", { name: "New message" });
    const to = within(dialog).getByRole("combobox", { name: "To" });
    expect(
      within(to)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Nabin Adhikari, Director", "Pooja Shrestha"]);
    await userEvent.selectOptions(to, uid(4));
    await userEvent.click(within(dialog).getByRole("button", { name: "Open conversation" }));

    expect(await screen.findByText("Say hello to Pooja.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says when there is nobody to write to", async () => {
    backend(on("GET", LIST, { conversations: [] }), on("GET", PEOPLE, { people: [] }));
    renderInbox();

    await userEvent.click(await screen.findByRole("button", { name: "New message" }));

    expect(
      await screen.findByText("There is nobody else in the office to write to yet."),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(on("GET", LIST, { conversations: [] }), on("GET", PEOPLE, { people: [] }));
    renderInbox();
    await userEvent.click(await screen.findByRole("button", { name: "New message" }));
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("A Platform Admin in Support Access", () => {
  it("is told the Inbox is private, and nothing is asked", async () => {
    const fetchFn = backend(on("GET", LIST, CONVERSATIONS));

    renderInbox({ context: PLATFORM_VISIT, openId: uid(1) });

    expect(
      screen.getByText(
        "Staff messages are private to the two people. Platform Admins can't read them.",
      ),
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("The address", () => {
  it.each([
    [uid(7), uid(7)],
    [uid(7).toUpperCase(), uid(7)],
    ["7", null],
    [uid(7).replaceAll("-", ""), null],
    [null, null],
    ["", null],
    ["0", null],
    ["-3", null],
    ["2.5", null],
    ["7abc", null],
    ["<script>", null],
    ["99999999999999999999", null],
  ])("reads with=%s as %s", (value, expected) => {
    expect(openIdFrom(value)).toBe(expected);
  });
});
