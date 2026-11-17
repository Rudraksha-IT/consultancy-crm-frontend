import { InvalidCodeError, PasswordRulesNotMetError } from "../core/errors";
import { checkResetCode, completePasswordReset, requestResetCode } from "./passwordReset";
import { jsonResponse } from "../core/test-helpers";

const CONTEXT = {
  staff: {
    id: 1,
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "counsellor",
    colour_mode: "device",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students"],
  date_display: "AD",
  support_access: null,
};
const REFUSED = { detail: "That code isn't right or has run out." };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("requestResetCode", () => {
  it("posts the email", async () => {
    const fetchFn = answering(jsonResponse({ detail: "If that email…" }, 202));

    await requestResetCode("sita@acme.test", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/password-reset/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "sita@acme.test" }),
      }),
    );
  });

  it("fails when the server can't take it", async () => {
    await expect(
      requestResetCode("sita@acme.test", answering(jsonResponse({}, 502))),
    ).rejects.toThrow();
  });
});

describe("checkResetCode", () => {
  it("posts the email and the code", async () => {
    const fetchFn = answering(jsonResponse({ detail: "That code is right." }));

    await checkResetCode({ email: "sita@acme.test", code: "123456" }, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/password-reset/code/",
      expect.objectContaining({
        body: JSON.stringify({ email: "sita@acme.test", code: "123456" }),
      }),
    );
  });

  it("rejects with InvalidCodeError when the code is refused", async () => {
    await expect(
      checkResetCode({ email: "a@b.c", code: "000000" }, answering(jsonResponse(REFUSED, 400))),
    ).rejects.toBeInstanceOf(InvalidCodeError);
  });

  it("passes other failures on", async () => {
    await expect(
      checkResetCode({ email: "a@b.c", code: "000000" }, answering(jsonResponse({}, 500))),
    ).rejects.not.toBeInstanceOf(InvalidCodeError);
  });
});

describe("completePasswordReset", () => {
  const RESET = { email: "sita@acme.test", code: "123456", password: "Kathmandu!2026" };

  it("says when the second step still comes next: a reset never skips it (issue 62)", async () => {
    const outcome = await completePasswordReset(
      RESET,
      answering(jsonResponse({ two_factor: "verify" })),
    );

    expect(outcome).toEqual({ kind: "twoFactor", step: "verify" });
  });

  it("posts the new password and returns the new login's context", async () => {
    const fetchFn = answering(jsonResponse({ context: CONTEXT }));

    const outcome = await completePasswordReset(RESET, fetchFn);

    expect(outcome.kind === "loggedIn" && outcome.context.staff.email).toBe("sita@acme.test");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/password-reset/complete/",
      expect.objectContaining({ body: JSON.stringify(RESET) }),
    );
  });

  it("rejects with the unmet rules the server names", async () => {
    const answer = { detail: "…", unmet_rules: ["capital", "symbol"] };

    const failure = completePasswordReset(RESET, answering(jsonResponse(answer, 400)));

    await expect(failure).rejects.toEqual(new PasswordRulesNotMetError(["capital", "symbol"]));
  });

  it("ignores rule names it doesn't know", async () => {
    const answer = { detail: "…", unmet_rules: ["capital", "<b>x</b>"] };

    const failure = completePasswordReset(RESET, answering(jsonResponse(answer, 400)));

    await expect(failure).rejects.toEqual(new PasswordRulesNotMetError(["capital"]));
  });

  it("rejects with InvalidCodeError for any other refusal", async () => {
    await expect(
      completePasswordReset(RESET, answering(jsonResponse(REFUSED, 400))),
    ).rejects.toBeInstanceOf(InvalidCodeError);
  });

  it("refuses an answer without a context", async () => {
    await expect(
      completePasswordReset(RESET, answering(jsonResponse({ ok: true }))),
    ).rejects.toThrow();
  });
});
