import { API_PATHS } from "@/constants/api";

import {
  ApiRequestError,
  InvalidFieldsError,
  PasswordRulesNotMetError,
  TooManyPasswordTriesError,
  WrongCurrentPasswordError,
} from "./errors";
import { changePlatformPassword, savePlatformName } from "./platformAccount";
import { WrongNumberError } from "./twoFactor";
import { jsonResponse } from "./test-helpers";

const ADMIN = { id: 3, name: "Ramesh", email: "ramesh@platform.test" };

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sent(fetchFn: ReturnType<typeof answering>): {
  path: unknown;
  method: unknown;
  body: unknown;
} {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  const body = init?.body;
  return {
    path,
    method: init?.method,
    body: JSON.parse(typeof body === "string" ? body : ""),
  };
}

describe("savePlatformName", () => {
  it("PATCHes only the name and returns the saved account", async () => {
    // The Next.js server keeps the tokens; the browser only gets who is logged in.
    const fetchFn = answering(jsonResponse({ platform_admin: ADMIN }));

    const saved = await savePlatformName("Ramesh", fetchFn);

    expect(saved).toEqual(ADMIN);
    expect(sent(fetchFn)).toEqual({
      path: API_PATHS.platformMe,
      method: "PATCH",
      body: { name: "Ramesh" },
    });
  });

  it("refuses an answer that isn't an account", async () => {
    const fetchFn = answering(jsonResponse({ platform_admin: { id: "3" } }));

    await expect(savePlatformName("A", fetchFn)).rejects.toThrow();
  });

  it("names a refused name", async () => {
    const fetchFn = answering(jsonResponse({ name: ["Enter a name."] }, 400));

    const failure = savePlatformName("<b>", fetchFn);

    await expect(failure).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(failure).rejects.toMatchObject({ fieldErrors: { name: ["Enter a name."] } });
  });

  it("passes any other failure on", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Server error" }, 500));

    await expect(savePlatformName("A", fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("changePlatformPassword", () => {
  it("POSTs the current and new password and expects no tokens in the answer", async () => {
    const fetchFn = answering(jsonResponse({}));

    await changePlatformPassword(
      { currentPassword: "Now-1234!", newPassword: "Next-5678?" },
      fetchFn,
    );

    expect(sent(fetchFn)).toEqual({
      path: API_PATHS.platformMyPassword,
      method: "POST",
      body: { current_password: "Now-1234!", new_password: "Next-5678?" },
    });
  });

  it("turns unmet rules into PasswordRulesNotMetError", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Rules", unmet_rules: ["capital", "symbol"] }, 400),
    );

    const failure = changePlatformPassword({ currentPassword: "a", newPassword: "b" }, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(PasswordRulesNotMetError);
    await expect(failure).rejects.toMatchObject({ unmet: ["capital", "symbol"] });
  });

  it("turns a wrong current password into WrongCurrentPasswordError", async () => {
    const fetchFn = answering(jsonResponse({ current_password: ["No."] }, 400));

    await expect(
      changePlatformPassword({ currentPassword: "a", newPassword: "b" }, fetchFn),
    ).rejects.toBeInstanceOf(WrongCurrentPasswordError);
  });

  it("names a new password that is the current one", async () => {
    const fetchFn = answering(
      jsonResponse({ new_password: ["Choose a password different from your current one."] }, 400),
    );

    const failure = changePlatformPassword({ currentPassword: "a", newPassword: "a" }, fetchFn);

    await expect(failure).rejects.toMatchObject({
      fieldErrors: { newPassword: ["Choose a password different from your current one."] },
    });
  });

  it("turns 429 into TooManyPasswordTriesError", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Too many." }, 429));

    await expect(
      changePlatformPassword({ currentPassword: "a", newPassword: "b" }, fetchFn),
    ).rejects.toBeInstanceOf(TooManyPasswordTriesError);
  });

  it("passes any other failure on", async () => {
    const fetchFn = answering(jsonResponse({ unexpected: true }, 400));

    await expect(
      changePlatformPassword({ currentPassword: "a", newPassword: "b" }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("a number from the app (issue 61)", () => {
  it("is sent with a password change", async () => {
    const fetchFn = answering(jsonResponse({}));

    await changePlatformPassword(
      { currentPassword: "Now-1234!", newPassword: "Next-1234!", code: "654321" },
      fetchFn,
    );

    expect(sent(fetchFn).body).toEqual({
      current_password: "Now-1234!",
      new_password: "Next-1234!",
      code: "654321",
    });
  });

  it("explains a wrong or missing number", async () => {
    const fetchFn = answering(jsonResponse({ code: ["That number isn't right."] }, 400));

    await expect(
      changePlatformPassword({ currentPassword: "x", newPassword: "Next-1234!" }, fetchFn),
    ).rejects.toBeInstanceOf(WrongNumberError);
  });
});
