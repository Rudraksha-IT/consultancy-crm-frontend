import {
  fetchBulkCount,
  fetchMessages,
  fetchProviderSettings,
  fetchStudentMessages,
  saveProviderSettings,
  sendBulkMessage,
  sendMessage,
  sendTestSms,
  type BulkRecipients,
  type ProviderSettingsInput,
} from "./communication";
import { InvalidFieldsError } from "./errors";
import { jsonResponse } from "./test-helpers";

const SETTINGS = {
  sms_provider: "sparrow",
  sms_sender: "ABCEDU",
  sms_token_saved: true,
  email_host: "smtp.zoho.com",
  email_port: 587,
  email_username: "info@abc.example",
  email_password_saved: false,
  email_from: "info@abc.example",
  sms_ready: true,
  email_ready: false,
};

const INPUT: ProviderSettingsInput = {
  smsProvider: "sparrow",
  smsSender: "ABCEDU",
  smsToken: "",
  emailHost: "smtp.zoho.com",
  emailPort: 587,
  emailUsername: "info@abc.example",
  emailPassword: "app-password",
  emailFrom: "info@abc.example",
};

const MESSAGE = {
  id: 4,
  student: { id: 7, name: "Sita Gurung" },
  channel: "sms",
  body: "Namaste",
  status: "failed",
  error: "Couldn't reach the SMS company.",
  sent_to: "9841000001",
  sent_at: "2026-11-02T10:04:00+05:45",
  sent_by: { id: 2, name: "Ram Counsellor" },
};

const PAGE = { count: 1, page: 1, page_size: 25, results: [MESSAGE] };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sent(fetchFn: ReturnType<typeof answering>) {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const sentBody = init?.body;
  const body: unknown = typeof sentBody === "string" ? JSON.parse(sentBody) : null;
  return { path, method: init?.method, body };
}

describe("fetchProviderSettings", () => {
  it("GETs the settings in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(SETTINGS));

    const settings = await fetchProviderSettings(fetchFn);

    expect(sent(fetchFn).path).toBe("/api/communication/settings/");
    expect(settings).toEqual({
      smsProvider: "sparrow",
      smsSender: "ABCEDU",
      isSmsTokenSaved: true,
      emailHost: "smtp.zoho.com",
      emailPort: 587,
      emailUsername: "info@abc.example",
      isEmailPasswordSaved: false,
      emailFrom: "info@abc.example",
      isSmsReady: true,
      isEmailReady: false,
    });
  });

  it.each([
    ["an unknown provider", { sms_provider: "twilio" }],
    ["a port we never use", { email_port: 22 }],
    ["no ready flag", { sms_ready: undefined }],
    ["a sender too long", { sms_sender: "x".repeat(12) }],
  ])("refuses an answer with %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ ...SETTINGS, ...change }));

    await expect(fetchProviderSettings(fetchFn)).rejects.toThrow();
  });
});

describe("saveProviderSettings", () => {
  it("PUTs the settings in API naming, leaving out an empty secret", async () => {
    const fetchFn = answering(jsonResponse(SETTINGS));

    await saveProviderSettings(INPUT, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/communication/settings/",
      method: "PUT",
      body: {
        sms_provider: "sparrow",
        sms_sender: "ABCEDU",
        email_host: "smtp.zoho.com",
        email_port: 587,
        email_username: "info@abc.example",
        email_password: "app-password",
        email_from: "info@abc.example",
      },
    });
  });

  it("names refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ sms_token: ["Enter the API token from your SMS company."] }, 400),
    );

    const error: unknown = await saveProviderSettings(INPUT, fetchFn).catch((e: unknown) => e);

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected refused fields");
    expect(error.fieldErrors).toEqual({
      smsToken: ["Enter the API token from your SMS company."],
    });
  });
});

describe("sendTestSms", () => {
  it("POSTs nothing and says how it went", async () => {
    const fetchFn = answering(jsonResponse({ status: "sent", error: "", sent_to: "9851000009" }));

    const result = await sendTestSms(fetchFn);

    expect(sent(fetchFn)).toMatchObject({
      path: "/api/communication/settings/test-sms/",
      method: "POST",
      body: {},
    });
    expect(result).toEqual({ status: "sent", error: "", sentTo: "9851000009" });
  });
});

describe("messages", () => {
  it("GETs a page of every message", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const page = await fetchMessages(2, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/messages/?page=2");
    expect(page).toEqual({
      count: 1,
      page: 1,
      pageSize: 25,
      rows: [
        {
          id: 4,
          student: { id: 7, name: "Sita Gurung" },
          channel: "sms",
          body: "Namaste",
          status: "failed",
          error: "Couldn't reach the SMS company.",
          sentTo: "9841000001",
          sentAt: "2026-11-02T10:04:00+05:45",
          sentBy: { id: 2, name: "Ram Counsellor" },
        },
      ],
    });
  });

  it("GETs a page of one Student's messages", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    await fetchStudentMessages(7, 1, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/students/7/messages/?page=1");
  });

  it.each([
    ["an unknown channel", { channel: "whatsapp" }],
    ["an unknown status", { status: "queued" }],
    ["a time that isn't one", { sent_at: "today" }],
    ["no sender", { sent_by: null }],
  ])("refuses a message with %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ ...PAGE, results: [{ ...MESSAGE, ...change }] }));

    await expect(fetchMessages(1, fetchFn)).rejects.toThrow();
  });
});

describe("sendMessage", () => {
  it("POSTs the channel and text and returns the message", async () => {
    const fetchFn = answering(jsonResponse(MESSAGE, 201));

    const message = await sendMessage(7, { channel: "sms", body: "Namaste" }, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/students/7/messages/",
      method: "POST",
      body: { channel: "sms", body: "Namaste" },
    });
    expect(message.status).toBe("failed");
  });

  it("names a refused channel", async () => {
    const refusal = { channel: ["SMS isn't set up yet. An Admin can set it up in Configuration."] };
    const fetchFn = answering(jsonResponse(refusal, 400));

    const error: unknown = await sendMessage(7, { channel: "sms", body: "Hi" }, fetchFn).catch(
      (e: unknown) => e,
    );

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected refused fields");
    expect(error.fieldErrors).toEqual(refusal);
  });
});

const ONBOARDED: BulkRecipients = {
  kind: "students",
  filters: {
    search: " sita ",
    stage: "applying",
    counsellor: "me",
    source: "",
    country: "",
    targetLevel: "",
  },
};
const CLASS: BulkRecipients = { kind: "batch", batchId: 3 };

describe("fetchBulkCount", () => {
  it("GETs how many Students a list's filters name", async () => {
    const fetchFn = answering(jsonResponse({ count: 12, max: 200 }));

    const count = await fetchBulkCount(ONBOARDED, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/messages/bulk/?q=sita&stage=applying&counsellor=me");
    expect(count).toEqual({ count: 12, max: 200 });
  });

  it("GETs how many Students a class has", async () => {
    const fetchFn = answering(jsonResponse({ count: 2, max: 200 }));

    await fetchBulkCount(CLASS, fetchFn);

    expect(sent(fetchFn).path).toBe("/api/messages/bulk/?batch=3");
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ count: -1, max: 200 }));

    await expect(fetchBulkCount(CLASS, fetchFn)).rejects.toThrow();
  });
});

describe("sendBulkMessage", () => {
  it("POSTs a list's filters with the channel and text, and says how it went", async () => {
    const answer = { sent: 11, failed: 1, failed_messages: [MESSAGE] };
    const fetchFn = answering(jsonResponse(answer, 201));

    const result = await sendBulkMessage(ONBOARDED, { channel: "sms", body: "Hi" }, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: "/api/messages/bulk/",
      method: "POST",
      body: {
        channel: "sms",
        body: "Hi",
        students: { q: "sita", stage: "applying", counsellor: "me" },
      },
    });
    expect(result.sent).toBe(11);
    expect(result.failed).toBe(1);
    expect(result.failedMessages[0]?.student.name).toBe("Sita Gurung");
  });

  it("POSTs a class", async () => {
    const fetchFn = answering(jsonResponse({ sent: 2, failed: 0, failed_messages: [] }, 201));

    await sendBulkMessage(CLASS, { channel: "email", body: "Hi" }, fetchFn);

    expect(sent(fetchFn).body).toEqual({ channel: "email", body: "Hi", batch: 3 });
  });

  it("names a refused channel", async () => {
    const refusal = {
      channel: ["Email isn't set up yet. An Admin can set it up in Configuration."],
    };
    const fetchFn = answering(jsonResponse(refusal, 400));

    const error: unknown = await sendBulkMessage(
      CLASS,
      { channel: "email", body: "Hi" },
      fetchFn,
    ).catch((e: unknown) => e);

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected refused fields");
    expect(error.fieldErrors).toEqual(refusal);
  });

  it("gives the API's reason for refusing who it goes to", async () => {
    const fetchFn = answering(jsonResponse({ detail: "No Students to send to." }, 400));

    const error: unknown = await sendBulkMessage(
      CLASS,
      { channel: "sms", body: "Hi" },
      fetchFn,
    ).catch((e: unknown) => e);

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected refused fields");
    expect(error.fieldErrors).toEqual({ recipients: ["No Students to send to."] });
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ sent: "all", failed: 0, failed_messages: [] }, 201));

    await expect(sendBulkMessage(CLASS, { channel: "sms", body: "Hi" }, fetchFn)).rejects.toThrow();
  });
});
