import { API_PATHS } from "@/constants/api";

import { ApiRequestError, WrongCurrentPasswordError } from "./errors";
import { jsonResponse } from "./test-helpers";
import {
  confirmTwoFactorSetup,
  fetchMyTwoFactor,
  makeNewRecoveryCodes,
  startTwoFactorSetup,
  StartAgainError,
  switchTwoFactorOff,
  switchTwoFactorOn,
  TooManyTriesError,
  verifyStaffTwoFactor,
  verifyTwoFactor,
  WrongNumberError,
} from "./twoFactor";

const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const URI = `otpauth://totp/Consultancy%20CRM:ops%40platform.test?secret=${SECRET}&issuer=Consultancy%20CRM`;
const CODES = Array.from({ length: 10 }, (_, n) => `abcd-efgh-jk${"mnpqrstuvw"[n] ?? "x"}m`);
const ADMIN = { id: 1, name: "Platform Ops", email: "ops@platform.test" };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = fetchFn.mock.calls[0]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "");
}

describe("startTwoFactorSetup", () => {
  it("posts nothing of its own (the server adds the challenge) and returns the URI and secret", async () => {
    const fetchFn = answering(jsonResponse({ uri: URI }));

    await expect(startTwoFactorSetup(fetchFn)).resolves.toEqual({ uri: URI, secret: SECRET });
    expect(fetchFn.mock.calls[0]?.[0]).toBe(API_PATHS.platformTwoFactorSetup);
    expect(sentBody(fetchFn)).toEqual({});
  });

  it.each([
    "https://evil.example/?secret=ABC",
    "otpauth://hotp/x?secret=ABCDEFGHIJKLMNOP",
    "otpauth://totp/x?secret=not-base32!",
    "otpauth://totp/x",
    `otpauth://totp/${"x".repeat(1100)}?secret=${SECRET}`,
  ])("refuses an answer that isn't a TOTP setup URI (%s)", async (uri) => {
    await expect(startTwoFactorSetup(answering(jsonResponse({ uri })))).rejects.toThrow();
  });

  it("says to start again when the challenge is used up", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Log in again.", start_again: true }, 400));

    await expect(startTwoFactorSetup(fetchFn)).rejects.toBeInstanceOf(StartAgainError);
  });
});

describe("confirmTwoFactorSetup", () => {
  it("sends the number and returns the ten recovery codes", async () => {
    const fetchFn = answering(jsonResponse({ platform_admin: ADMIN, recovery_codes: CODES }));

    await expect(confirmTwoFactorSetup("123456", fetchFn)).resolves.toEqual(CODES);
    expect(sentBody(fetchFn)).toEqual({ code: "123456" });
  });

  it("refuses recovery codes that aren't ten codes", async () => {
    const fetchFn = answering(
      jsonResponse({ platform_admin: ADMIN, recovery_codes: ["<b>x</b>"] }),
    );

    await expect(confirmTwoFactorSetup("123456", fetchFn)).rejects.toThrow();
  });

  it("explains a wrong number", async () => {
    const fetchFn = answering(jsonResponse({ code: ["That number isn't right."] }, 400));

    const error: unknown = await confirmTwoFactorSetup("000000", fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(WrongNumberError);
    expect(error).toMatchObject({ field: "code" });
  });
});

describe("verifyTwoFactor", () => {
  it("sends a number", async () => {
    const fetchFn = answering(jsonResponse({ platform_admin: ADMIN }));

    await expect(verifyTwoFactor({ code: "123456" }, fetchFn)).resolves.toEqual(ADMIN);
    expect(sentBody(fetchFn)).toEqual({ code: "123456" });
  });

  it("sends a recovery code in API naming", async () => {
    const fetchFn = answering(jsonResponse({ platform_admin: ADMIN }));

    await verifyTwoFactor({ recoveryCode: "abcd-efgh-jkmn" }, fetchFn);

    expect(sentBody(fetchFn)).toEqual({ recovery_code: "abcd-efgh-jkmn" });
  });

  it("explains a wrong recovery code", async () => {
    const fetchFn = answering(jsonResponse({ recovery_code: ["Not right."] }, 400));

    const error: unknown = await verifyTwoFactor({ recoveryCode: "abcd-efgh-jkmn" }, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({ field: "recoveryCode" });
  });

  it("explains too many tries", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Wait." }, 429));

    await expect(verifyTwoFactor({ code: "123456" }, fetchFn)).rejects.toBeInstanceOf(
      TooManyTriesError,
    );
  });

  it("passes other failures through", async () => {
    const fetchFn = answering(jsonResponse({}, 502));

    await expect(verifyTwoFactor({ code: "123456" }, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("the Security page", () => {
  it("reads the state in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ required: true, set_up: true, recovery_codes_left: 7 }),
    );

    await expect(fetchMyTwoFactor(fetchFn)).resolves.toEqual({
      required: true,
      setUp: true,
      recoveryCodesLeft: 7,
      canSwitchOff: true,
    });
  });

  it("refuses a state of the wrong shape", async () => {
    const fetchFn = answering(jsonResponse({ required: "yes", set_up: true }));

    await expect(fetchMyTwoFactor(fetchFn)).rejects.toThrow();
  });

  it("switches on, expecting setup next", async () => {
    const fetchFn = answering(jsonResponse({ two_factor: "setup" }));

    await switchTwoFactorOn(fetchFn);

    expect(sentBody(fetchFn)).toEqual({ action: "on" });
  });

  it("switches off with the password and a number", async () => {
    const fetchFn = answering(
      jsonResponse({ two_factor: { required: false, set_up: false, recovery_codes_left: 0 } }),
    );

    await expect(
      switchTwoFactorOff({ password: "Pw-12345!", code: "123456" }, fetchFn),
    ).resolves.toEqual({ required: false, setUp: false, recoveryCodesLeft: 0, canSwitchOff: true });
    expect(sentBody(fetchFn)).toEqual({ action: "off", password: "Pw-12345!", code: "123456" });
  });

  it("switches off with a recovery code in place of a number", async () => {
    const fetchFn = answering(
      jsonResponse({ two_factor: { required: false, set_up: false, recovery_codes_left: 0 } }),
    );

    await switchTwoFactorOff({ password: "Pw-12345!", recoveryCode: "abcd-efgh-jkmn" }, fetchFn);

    expect(sentBody(fetchFn)).toEqual({
      action: "off",
      password: "Pw-12345!",
      recovery_code: "abcd-efgh-jkmn",
    });
  });

  it("explains a wrong password when switching off", async () => {
    const fetchFn = answering(jsonResponse({ password: ["Not your password."] }, 400));

    await expect(
      switchTwoFactorOff({ password: "x", code: "123456" }, fetchFn),
    ).rejects.toBeInstanceOf(WrongCurrentPasswordError);
  });

  it("makes new recovery codes with a number", async () => {
    const fetchFn = answering(jsonResponse({ recovery_codes: CODES }));

    await expect(makeNewRecoveryCodes("123456", fetchFn)).resolves.toEqual(CODES);
    expect(sentBody(fetchFn)).toEqual({ action: "new_recovery_codes", code: "123456" });
  });
});

describe("Staff, on the office's address (issue 62)", () => {
  const STAFF_STATE = {
    required: true,
    set_up: true,
    recovery_codes_left: 9,
    can_switch_off: false,
  };

  it("uses the office's setup and confirm addresses", async () => {
    const setup = answering(jsonResponse({ uri: URI }));
    const confirm = answering(jsonResponse({ context: {}, recovery_codes: CODES }));

    await startTwoFactorSetup(setup, "staff");
    await confirmTwoFactorSetup("123456", confirm, "staff");

    expect(setup.mock.calls[0]?.[0]).toBe("/api/auth/two-factor/setup/");
    expect(confirm.mock.calls[0]?.[0]).toBe("/api/auth/two-factor/confirm/");
  });

  it("verifies on the office's address and expects a Staff login", async () => {
    const fetchFn = answering(jsonResponse({ context: { staff: { id: 3 } } }));

    await verifyStaffTwoFactor({ recoveryCode: "abcd-efgh-jkmn" }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/auth/two-factor/verify/");
    expect(sentBody(fetchFn)).toEqual({ recovery_code: "abcd-efgh-jkmn" });
    await expect(
      verifyStaffTwoFactor({ code: "123456" }, answering(jsonResponse({ platform_admin: ADMIN }))),
    ).rejects.toThrow();
  });

  it("explains a wrong number on the second step", async () => {
    const fetchFn = answering(jsonResponse({ code: ["That number isn't right."] }, 400));

    const error: unknown = await verifyStaffTwoFactor({ code: "000000" }, fetchFn).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(WrongNumberError);
  });

  it("reads my state, with whether I may switch it off", async () => {
    const fetchFn = answering(jsonResponse(STAFF_STATE));

    await expect(fetchMyTwoFactor(fetchFn, "staff")).resolves.toEqual({
      required: true,
      setUp: true,
      recoveryCodesLeft: 9,
      canSwitchOff: false,
    });
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/me/two-factor/");
  });

  it("refuses a state without whether I may switch it off", async () => {
    const fetchFn = answering(
      jsonResponse({ required: true, set_up: true, recovery_codes_left: 9 }),
    );

    await expect(fetchMyTwoFactor(fetchFn, "staff")).rejects.toThrow();
  });

  it("switches on, off and makes new codes at My settings' address", async () => {
    const on = answering(jsonResponse({ two_factor: "setup" }));
    const off = answering(jsonResponse({ two_factor: { ...STAFF_STATE, required: false } }));
    const codes = answering(jsonResponse({ recovery_codes: CODES }));

    await switchTwoFactorOn(on, "staff");
    const state = await switchTwoFactorOff({ password: "Pw-12345!", code: "123456" }, off, "staff");
    await makeNewRecoveryCodes("123456", codes, "staff");

    for (const fetchFn of [on, off, codes]) {
      expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/me/two-factor/");
    }
    expect(state.required).toBe(false);
    expect(sentBody(off)).toEqual({ action: "off", password: "Pw-12345!", code: "123456" });
  });

  it("explains being told to wait after too many wrong numbers", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Wait." }, 429));

    await expect(
      switchTwoFactorOff({ password: "Pw-12345!", code: "123456" }, fetchFn, "staff"),
    ).rejects.toBeInstanceOf(TooManyTriesError);
  });
});
