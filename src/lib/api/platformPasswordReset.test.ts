import { InvalidCodeError, PasswordRulesNotMetError } from "./errors";
import {
  checkPlatformResetCode,
  completePlatformPasswordReset,
  requestPlatformResetCode,
} from "./platformPasswordReset";
import { jsonResponse } from "./test-helpers";

const RESET = { email: "ops@platform.test", code: "123456", password: "Kathmandu!2026" };
const CHANGED = { detail: "Your password was changed. Log in with your new password." };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = fetchFn.mock.calls[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

describe("requestPlatformResetCode", () => {
  it("posts the email to the Platform's own reset", async () => {
    const fetchFn = answering(jsonResponse({ detail: "If that email…" }, 202));

    await requestPlatformResetCode("ops@platform.test", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/auth/password-reset/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(sentBody(fetchFn)).toEqual({ email: "ops@platform.test" });
  });

  it("fails on an answer of the wrong shape", async () => {
    await expect(
      requestPlatformResetCode("ops@platform.test", answering(jsonResponse({ ok: 1 }, 202))),
    ).rejects.toThrow();
  });
});

describe("checkPlatformResetCode", () => {
  it("posts the email and the code", async () => {
    const fetchFn = answering(jsonResponse({ detail: "That code is right." }));

    await checkPlatformResetCode({ email: RESET.email, code: RESET.code }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/platform/auth/password-reset/verify/");
    expect(sentBody(fetchFn)).toEqual({ email: RESET.email, code: RESET.code });
  });

  it("rejects with InvalidCodeError when the code is refused", async () => {
    await expect(
      checkPlatformResetCode(
        { email: RESET.email, code: RESET.code },
        answering(jsonResponse({ detail: "no" }, 400)),
      ),
    ).rejects.toBeInstanceOf(InvalidCodeError);
  });
});

describe("completePlatformPasswordReset", () => {
  it("sends the new password as new_password and resolves without logging in", async () => {
    const fetchFn = answering(jsonResponse(CHANGED));

    await expect(completePlatformPasswordReset(RESET, fetchFn)).resolves.toBeUndefined();

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/platform/auth/password-reset/confirm/");
    expect(sentBody(fetchFn)).toEqual({
      email: RESET.email,
      code: RESET.code,
      new_password: RESET.password,
    });
  });

  it("rejects with the unmet rules the server names", async () => {
    const refused = jsonResponse(
      { detail: "The password doesn't meet every rule yet.", unmet_rules: ["symbol"] },
      400,
    );

    const error: unknown = await completePlatformPasswordReset(RESET, answering(refused)).catch(
      (caught: unknown) => caught,
    );

    if (!(error instanceof PasswordRulesNotMetError)) throw new Error("expected unmet rules");
    expect(error.unmet).toEqual(["symbol"]);
  });

  it("rejects with InvalidCodeError for any other refusal", async () => {
    await expect(
      completePlatformPasswordReset(RESET, answering(jsonResponse({ detail: "no" }, 400))),
    ).rejects.toBeInstanceOf(InvalidCodeError);
  });

  it("fails on an answer of the wrong shape", async () => {
    await expect(
      completePlatformPasswordReset(RESET, answering(jsonResponse({ access: "x" }))),
    ).rejects.not.toBeInstanceOf(InvalidCodeError);
  });
});
