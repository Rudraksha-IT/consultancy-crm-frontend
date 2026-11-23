import { API_PATHS } from "@/constants/api";

import { ApiRequestError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import { askForEmailChange, confirmEmailChange, WorkEmailRefusedError } from "./workEmail";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sent(fetchFn: ReturnType<typeof answering>): { path: unknown; body: unknown } {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const body = init?.body;
  return { path, body: JSON.parse(typeof body === "string" ? body : "") };
}

async function refusalOf(call: Promise<unknown>): Promise<WorkEmailRefusedError> {
  const error: unknown = await call.catch((caught: unknown) => caught);
  if (!(error instanceof WorkEmailRefusedError)) throw new Error("not refused");
  return error;
}

const SENT = { detail: "We've sent a 6-digit code to your new email." };

describe("askForEmailChange", () => {
  it("sends the new email and password", async () => {
    const fetchFn = answering(jsonResponse(SENT, 202));

    await askForEmailChange({ email: "sita.new@office.com", password: "secret" }, fetchFn);

    expect(sent(fetchFn)).toEqual({
      path: API_PATHS.myEmail,
      body: { email: "sita.new@office.com", password: "secret" },
    });
  });

  it("adds the number, or a recovery code, when two-step login is on", async () => {
    const withNumber = answering(jsonResponse(SENT, 202));
    const withRecovery = answering(jsonResponse(SENT, 202));

    await askForEmailChange({ email: "a@office.com", password: "p", code: "123456" }, withNumber);
    await askForEmailChange(
      { email: "a@office.com", password: "p", recoveryCode: "abcd-efgh-jkmn" },
      withRecovery,
    );

    expect(sent(withNumber).body).toEqual({ email: "a@office.com", password: "p", code: "123456" });
    expect(sent(withRecovery).body).toEqual({
      email: "a@office.com",
      password: "p",
      recovery_code: "abcd-efgh-jkmn",
    });
  });

  it.each([
    [{ email: ["Someone here already uses this email."] }, "email"],
    [{ password: ["That isn't your current password."] }, "password"],
    [{ code: ["Enter the 6-digit number from your authenticator app."] }, "number"],
    [{ recovery_code: ["That recovery code isn't right, or it was already used."] }, "number"],
  ])("puts a refused field's words under it: %j", async (body, field) => {
    const refusal = await refusalOf(
      askForEmailChange(
        { email: "a@office.com", password: "p" },
        answering(jsonResponse(body, 400)),
      ),
    );

    expect(refusal.fieldErrors).toEqual({ [field]: Object.values(body)[0]?.[0] });
    expect(refusal.problem).toBeNull();
  });

  it.each([429, 503])("shows the server's words across the form for %i", async (status) => {
    const words = { detail: "The email couldn't be sent. Try again in a moment." };

    const refusal = await refusalOf(
      askForEmailChange(
        { email: "a@office.com", password: "p" },
        answering(jsonResponse(words, status)),
      ),
    );

    expect(refusal.problem).toBe(words.detail);
    expect(refusal.fieldErrors).toEqual({});
  });

  it("passes other failures on as they are", async () => {
    const fetchFn = answering(jsonResponse({ detail: "boom" }, 500));

    await expect(
      askForEmailChange({ email: "a@office.com", password: "p" }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("refuses an answer of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ detail: 5 }, 202));

    await expect(
      askForEmailChange({ email: "a@office.com", password: "p" }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("confirmEmailChange", () => {
  it("sends the email and Code and returns the new email", async () => {
    const fetchFn = answering(jsonResponse({ email: "sita.new@office.com" }));

    const email = await confirmEmailChange("sita.new@office.com", "123456", fetchFn);

    expect(email).toBe("sita.new@office.com");
    expect(sent(fetchFn)).toEqual({
      path: API_PATHS.myEmailConfirm,
      body: { email: "sita.new@office.com", code: "123456" },
    });
  });

  it("puts a refused Code's words on the code field", async () => {
    const words =
      "That code isn't right or has run out. Check the email, or send yourself a new one.";

    const refusal = await refusalOf(
      confirmEmailChange("a@office.com", "123456", answering(jsonResponse({ detail: words }, 400))),
    );

    expect(refusal.fieldErrors).toEqual({ code: words });
  });

  it("puts an email taken meanwhile across the form", async () => {
    const words = "Someone here already uses this email.";

    const refusal = await refusalOf(
      confirmEmailChange(
        "a@office.com",
        "123456",
        answering(jsonResponse({ email: [words] }, 400)),
      ),
    );

    expect(refusal.problem).toBe(words);
  });

  it.each([{ email: "not an email" }, { email: 5 }, {}, { email: "a@office.com", access: "x" }])(
    "refuses an answer of the wrong shape: %j",
    async (body) => {
      await expect(
        confirmEmailChange("a@office.com", "123456", answering(jsonResponse(body))),
      ).rejects.toBeInstanceOf(ApiRequestError);
    },
  );
});
