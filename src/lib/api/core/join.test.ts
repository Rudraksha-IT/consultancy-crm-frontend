import { InvalidCodeError, PasswordRulesNotMetError } from "./errors";
import { checkJoinCode, completeJoin, requestJoinCode } from "./join";
import { jsonResponse } from "./test-helpers";

const CONTEXT = {
  staff: {
    id: 7,
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "counsellor",
    colour_mode: "light",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students"],
  date_display: "AD",
  support_access: null,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

describe("joining", () => {
  it("asks for a new code by email", async () => {
    const fetchFn = answering(jsonResponse({ detail: "If that email…" }, 202));

    await requestJoinCode("sita@acme.test", fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/auth/join/",
      expect.objectContaining({ body: JSON.stringify({ email: "sita@acme.test" }) }),
    );
  });

  it("checks the code", async () => {
    const fetchFn = answering(jsonResponse({ detail: "That code is right." }));

    await checkJoinCode({ email: "sita@acme.test", code: "123456" }, fetchFn);

    expect(fetchFn).toHaveBeenCalledWith("/api/auth/join/code/", expect.anything());
  });

  it("rejects a refused code with InvalidCodeError", async () => {
    await expect(
      checkJoinCode(
        { email: "a@b.c", code: "000000" },
        answering(jsonResponse({ detail: "No." }, 400)),
      ),
    ).rejects.toBeInstanceOf(InvalidCodeError);
  });

  it("chooses the password and returns the new login's context", async () => {
    const fetchFn = answering(jsonResponse({ context: CONTEXT }));

    const outcome = await completeJoin(
      { email: "sita@acme.test", code: "123456", password: "Kathmandu!2026" },
      fetchFn,
    );

    expect(outcome.kind === "loggedIn" && outcome.context.staff.name).toBe("Sita Sharma");
    expect(fetchFn).toHaveBeenCalledWith("/api/auth/join/complete/", expect.anything());
  });

  it("says when two-step login setup still comes next (issue 62)", async () => {
    const fetchFn = answering(jsonResponse({ two_factor: "setup" }));

    const outcome = await completeJoin(
      { email: "sita@acme.test", code: "123456", password: "Kathmandu!2026" },
      fetchFn,
    );

    expect(outcome).toEqual({ kind: "twoFactor", step: "setup" });
  });

  it("names the unmet password rules", async () => {
    const refusal = { detail: "…", unmet_rules: ["symbol", "made_up"] };

    const caught: unknown = await completeJoin(
      { email: "a@b.c", code: "123456", password: "Kathmandu2026" },
      answering(jsonResponse(refusal, 400)),
    ).catch((error: unknown) => error);

    if (!(caught instanceof PasswordRulesNotMetError)) throw new Error("expected unmet rules");
    expect(caught.unmet).toEqual(["symbol"]);
  });
});
