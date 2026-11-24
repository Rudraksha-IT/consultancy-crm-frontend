import { ApiRequestError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { fetchPlatformEmail, sendTestEmail, TooManyTestEmailsError } from "./platformEmail";

const ANSWER = {
  email: { state: "working", tested_at: "2026-11-19T04:30:00Z", reference: null },
  from_address: "no-reply@crm.example",
  product_name: "Rudraksha CRM",
  sent_to: "admin@platform.com",
};
const SHOWN = {
  state: "working",
  testedAt: "2026-11-19T04:30:00Z",
  reference: null,
  fromAddress: "no-reply@crm.example",
  productName: "Rudraksha CRM",
  sentTo: "admin@platform.com",
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((error: unknown) => error);
}

describe("the Platform's email status (spec 2026-11-18 stories 3-4)", () => {
  it("reads the status and where a test email goes", async () => {
    const fetchFn = answering(jsonResponse(ANSWER));

    await expect(fetchPlatformEmail(fetchFn)).resolves.toEqual(SHOWN);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/platform/email/");
  });

  it("reads a test that never happened", async () => {
    const fetchFn = answering(
      jsonResponse({ ...ANSWER, email: { state: "untested", tested_at: null, reference: null } }),
    );

    await expect(fetchPlatformEmail(fetchFn)).resolves.toMatchObject({
      state: "untested",
      testedAt: null,
      reference: null,
    });
  });

  it("reads a sender on a host without a dot, as a local copy has (list tidy-ups 11)", async () => {
    const fetchFn = answering(jsonResponse({ ...ANSWER, from_address: "no-reply@localhost" }));

    await expect(fetchPlatformEmail(fetchFn)).resolves.toMatchObject({
      fromAddress: "no-reply@localhost",
    });
  });

  it.each(["not an address", "<b>x</b>@host", "a@b c", "@host"])(
    "refuses a sender that isn't an address (%s)",
    async (from) => {
      const fetchFn = answering(jsonResponse({ ...ANSWER, from_address: from }));

      await expect(fetchPlatformEmail(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
    },
  );

  it("refuses an answer it doesn't understand", async () => {
    const fetchFn = answering(
      jsonResponse({ ...ANSWER, email: { ...ANSWER.email, state: "<b>ok</b>" } }),
    );

    await expect(fetchPlatformEmail(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("drops a reference that isn't one", async () => {
    const fetchFn = answering(
      jsonResponse({
        ...ANSWER,
        email: { state: "failed", tested_at: ANSWER.email.tested_at, reference: "<script>" },
      }),
    );

    await expect(fetchPlatformEmail(fetchFn)).resolves.toMatchObject({
      state: "failed",
      reference: null,
    });
  });
});

describe("sending the test email", () => {
  it("posts nothing and reads how it went", async () => {
    const failed = {
      ...ANSWER,
      email: { state: "failed", tested_at: ANSWER.email.tested_at, reference: "5f0c2a7e-1b2d" },
      detail: "The test email couldn't be sent. Check the email values in the deploy.",
    };
    const fetchFn = answering(jsonResponse(failed));

    await expect(sendTestEmail(fetchFn)).resolves.toMatchObject({
      state: "failed",
      reference: "5f0c2a7e-1b2d",
    });
    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/platform/email/test/");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe("{}");
  });

  it("says when too many were sent", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Too many test emails. Try again in an hour." }, 429),
    );

    const error = await caught(sendTestEmail(fetchFn));

    expect(error).toBeInstanceOf(TooManyTestEmailsError);
  });

  it("passes any other failure on", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Something went wrong." }, 500));

    await expect(sendTestEmail(fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
