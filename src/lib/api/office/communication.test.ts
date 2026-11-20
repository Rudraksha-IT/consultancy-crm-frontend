import {
  FilesNotFetchedError,
  NoContactEmailError,
  fetchChoosable,
  fetchMessages,
  fetchStudentMessages,
  sendBulkEmail,
  sendEmail,
} from "./communication";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const MESSAGE = {
  id: uid(4),
  student: { id: uid(7), name: "Sita Gurung" },
  channel: "email",
  subject: "Your visit",
  body: "Dear Sita,",
  status: "failed",
  error: "The email couldn't be sent. Try again in a few minutes.",
  sent_to: "sita@example.test",
  attachments: ["brochure.pdf"],
  sent_at: "2026-11-02T10:04:00+05:45",
  sent_by: { id: 2, name: "Ram Counsellor" },
};

const FILES = [{ kind: "course_file" as const, id: 3 }];
const PAGE = { count: 1, page: 1, page_size: 25, results: [MESSAGE] };
const NO_CONTACT = {
  detail: "Your Admin needs to add the office's contact email in Configuration first.",
  code: "no_contact_email",
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sent(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const sentBody = init?.body;
  const body: unknown = typeof sentBody === "string" ? JSON.parse(sentBody) : null;
  return { path, method: init?.method, body };
}

describe("fetchMessages and fetchStudentMessages", () => {
  it("reads a page of emails in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const page = await fetchMessages(2, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/messages/?page=2");
    expect(page.rows[0]).toEqual({
      id: uid(4),
      student: { id: uid(7), name: "Sita Gurung" },
      channel: "email",
      subject: "Your visit",
      body: "Dear Sita,",
      status: "failed",
      error: "The email couldn't be sent. Try again in a few minutes.",
      sentTo: "sita@example.test",
      attachments: ["brochure.pdf"],
      sentAt: "2026-11-02T10:04:00+05:45",
      sentBy: { id: 2, name: "Ram Counsellor" },
    });
  });

  it("keeps a past SMS readable", async () => {
    const sms = { ...MESSAGE, channel: "sms", subject: "" };
    const fetchFn = answering(jsonResponse({ ...PAGE, results: [sms] }));

    const page = await fetchStudentMessages(uid(7), 1, fetchFn);

    expect(sent(fetchFn).path).toBe(`/api/students/${uid(7)}/messages/?page=1`);
    expect(page.rows[0]?.channel).toBe("sms");
  });

  it.each([
    ["an unknown channel", { channel: "whatsapp" }],
    ["no subject", { subject: undefined }],
    ["an unknown status", { status: "queued" }],
    ["no attachments", { attachments: undefined }],
    ["an empty attachment name", { attachments: [""] }],
  ])("refuses an answer with %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ ...PAGE, results: [{ ...MESSAGE, ...change }] }));

    await expect(fetchMessages(1, fetchFn)).rejects.toThrow();
  });
});

describe("sendEmail", () => {
  it("POSTs the subject line and message", async () => {
    const fetchFn = answering(jsonResponse({ ...MESSAGE, status: "sent", error: "" }, 201));

    const message = await sendEmail(
      uid(7),
      { subject: "Your visit", body: "Dear Sita,", attachments: FILES },
      fetchFn,
    );

    expect(sent(fetchFn)).toEqual({
      path: `/api/students/${uid(7)}/messages/`,
      method: "POST",
      body: { subject: "Your visit", body: "Dear Sita,", attachments: FILES },
    });
    expect(message.status).toBe("sent");
  });

  it("names the refused fields", async () => {
    const fetchFn = answering(jsonResponse({ subject: ["Write a subject line."] }, 400));

    const refusal = sendEmail(uid(7), { subject: "", body: "Hi", attachments: [] }, fetchFn);

    await expect(refusal).rejects.toEqual(
      new InvalidFieldsError({ subject: ["Write a subject line."] }),
    );
  });

  it("says when the office has no contact email yet", async () => {
    const fetchFn = answering(jsonResponse(NO_CONTACT, 400));

    await expect(
      sendEmail(uid(7), { subject: "Hi", body: "Hi", attachments: [] }, fetchFn),
    ).rejects.toBeInstanceOf(NoContactEmailError);
  });
});

describe("attachments", () => {
  const TOO_BIG = {
    attachments: [
      "The files add up to 10.5 MB, more than the 10 MB one email can carry. Remove a.pdf or another file.",
    ],
  };

  it("names a refused file list as an attachments field error", async () => {
    const email = { subject: "Hi", body: "Hi", attachments: FILES };

    await expect(sendEmail(uid(7), email, answering(jsonResponse(TOO_BIG, 400)))).rejects.toEqual(
      new InvalidFieldsError(TOO_BIG),
    );
    await expect(
      sendBulkEmail([uid(7)], email, answering(jsonResponse(TOO_BIG, 400))),
    ).rejects.toEqual(new InvalidFieldsError(TOO_BIG));
  });

  it("says when the files couldn't be got", async () => {
    const email = { subject: "Hi", body: "Hi", attachments: FILES };
    const down = () =>
      answering(jsonResponse({ detail: "We couldn't get the attached files." }, 503));

    await expect(sendEmail(uid(7), email, down())).rejects.toBeInstanceOf(FilesNotFetchedError);
    await expect(sendBulkEmail([uid(7)], email, down())).rejects.toBeInstanceOf(
      FilesNotFetchedError,
    );
  });
});

describe("other failures", () => {
  it.each([
    ["a server error", () => jsonResponse({}, 500)],
    ["a refusal that isn't about the fields", () => jsonResponse({ detail: "No." }, 400)],
  ])("passes on %s as it is", async (_, response) => {
    const email = { subject: "Hi", body: "Hi", attachments: [] };

    await expect(sendEmail(uid(7), email, answering(response()))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
    await expect(sendBulkEmail([uid(7)], email, answering(response()))).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("fetchChoosable", () => {
  const CHOOSABLE = {
    students: [
      { id: uid(7), name: "Sita Gurung", email: "sita@example.test", stage: "counselling" },
    ],
    count: 1,
    max: 200,
  };

  it("asks for a class's Students", async () => {
    const fetchFn = answering(jsonResponse(CHOOSABLE));

    const answer = await fetchChoosable({ kind: "batch", batchId: 3 }, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/messages/bulk/?batch=3");
    expect(answer).toEqual(CHOOSABLE);
  });

  it("asks for the Student list's filters", async () => {
    const fetchFn = answering(jsonResponse(CHOOSABLE));
    const filters = {
      search: "sita",
      stage: "counselling",
      counsellor: "",
      source: "",
      country: "",
      targetLevel: "",
    } as const;

    await fetchChoosable({ kind: "students", filters }, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/messages/bulk/?q=sita&stage=counselling");
  });

  it("refuses an answer that isn't the right shape", async () => {
    const fetchFn = answering(jsonResponse({ ...CHOOSABLE, count: "one" }));

    await expect(fetchChoosable({ kind: "batch", batchId: 3 }, fetchFn)).rejects.toThrow();
  });
});

describe("sendBulkEmail", () => {
  it("POSTs the Students chosen with the email", async () => {
    const fetchFn = answering(
      jsonResponse({ sent: 1, failed: 1, failed_messages: [MESSAGE] }, 201),
    );

    const result = await sendBulkEmail(
      [uid(7), uid(9)],
      { subject: "Closed", body: "Dear Student,", attachments: FILES },
      fetchFn,
    );

    expect(sent(fetchFn)).toEqual({
      path: "/api/messages/bulk/",
      method: "POST",
      body: {
        subject: "Closed",
        body: "Dear Student,",
        attachments: FILES,
        students: [uid(7), uid(9)],
      },
    });
    expect(result.sent).toBe(1);
    expect(result.failedMessages[0]?.student.name).toBe("Sita Gurung");
  });

  it("names who can't be chosen as a students field error", async () => {
    const fetchFn = answering(jsonResponse({ students: ["Lost Students can't be chosen."] }, 400));

    await expect(
      sendBulkEmail([uid(7)], { subject: "Hi", body: "Hi", attachments: [] }, fetchFn),
    ).rejects.toEqual(new InvalidFieldsError({ students: ["Lost Students can't be chosen."] }));
  });

  it("says when the office has no contact email yet", async () => {
    const fetchFn = answering(jsonResponse(NO_CONTACT, 400));

    await expect(
      sendBulkEmail([uid(7)], { subject: "Hi", body: "Hi", attachments: [] }, fetchFn),
    ).rejects.toBeInstanceOf(NoContactEmailError);
  });
});
