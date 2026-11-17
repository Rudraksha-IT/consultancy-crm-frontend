// @vitest-environment node
import { randomBytes } from "node:crypto";

import {
  authCookieHeader,
  challengeCookieHeader,
  clearedAuthCookieHeader,
  clearedChallengeCookieHeader,
  openChallenge,
  openTokens,
  readAuthCookie,
  readChallengeCookie,
  sealChallenge,
  sealTokens,
} from "./authCookie";
import type { AuthTokens } from "./types";
import { testHost } from "@/test/hosts";

const KEY = randomBytes(32);
const HOST = `${testHost("acme")}:8080`;
const TOKENS: AuthTokens = {
  access: "header.access.sig",
  refresh: "header.refresh.sig",
  scope: "staff",
};

function flip(value: string, index: number): string {
  const bytes = Buffer.from(value.slice(3), "base64url");
  bytes[index] = (bytes[index] ?? 0) ^ 1;
  return `${value.slice(0, 3)}${bytes.toString("base64url")}`;
}

describe("sealTokens and openTokens", () => {
  it("round-trip the tokens and their scope", () => {
    const sealed = sealTokens(TOKENS, { key: KEY, host: HOST });

    expect(openTokens(sealed, { key: KEY, host: HOST })).toEqual(TOKENS);
  });

  it("never contain the tokens in readable form", () => {
    const sealed = sealTokens(TOKENS, { key: KEY, host: HOST });

    expect(sealed).not.toContain("access");
    expect(Buffer.from(sealed.slice(3), "base64url").toString()).not.toContain("refresh");
  });

  it("seal the same tokens differently every time (a new IV each time)", () => {
    expect(sealTokens(TOKENS, { key: KEY, host: HOST })).not.toBe(
      sealTokens(TOKENS, { key: KEY, host: HOST }),
    );
  });

  it.each([0, 5, 12, 20, 40])("refuse a cookie with byte %i changed", (index) => {
    const sealed = sealTokens(TOKENS, { key: KEY, host: HOST });

    expect(openTokens(flip(sealed, index), { key: KEY, host: HOST })).toBeNull();
  });

  it("refuse a cookie sealed with another key", () => {
    const sealed = sealTokens(TOKENS, { key: randomBytes(32), host: HOST });

    expect(openTokens(sealed, { key: KEY, host: HOST })).toBeNull();
  });

  it("refuse a cookie copied to another Consultancy's host", () => {
    const sealed = sealTokens(TOKENS, { key: KEY, host: HOST });

    expect(openTokens(sealed, { key: KEY, host: `${testHost("beta")}:8080` })).toBeNull();
  });

  it.each(["", "v1.", "v2.abc", "garbage", "v1.!!!", "v1.AAAA", `v1.${"A".repeat(5000)}`])(
    "refuse a malformed cookie (%j)",
    (value) => {
      expect(openTokens(value, { key: KEY, host: HOST })).toBeNull();
    },
  );

  it("refuse a well-sealed cookie whose contents aren't tokens", () => {
    const sealed = sealTokens(
      // A shape only a bug or an old version could produce.
      { access: "", refresh: "r", scope: "staff" },
      { key: KEY, host: HOST },
    );

    expect(openTokens(sealed, { key: KEY, host: HOST })).toBeNull();
  });
});

describe("readAuthCookie", () => {
  it("finds the token cookie among the browser's cookies", () => {
    expect(readAuthCookie("theme=dark; crm_auth=v1.abc; other=1")).toBe("v1.abc");
  });

  it.each([null, "", "theme=dark", "crm_authx=v1.abc", "xcrm_auth=v1.abc"])(
    "is null without the token cookie (%j)",
    (header) => {
      expect(readAuthCookie(header)).toBeNull();
    },
  );
});

describe("the cookie headers", () => {
  it("are HTTP-only, Secure, SameSite=Lax, host-only and scoped to the API for 7 days", () => {
    const header = authCookieHeader("v1.abc", { secure: true });

    expect(header).toBe(
      "crm_auth=v1.abc; Path=/api; Max-Age=604800; HttpOnly; Secure; SameSite=Lax",
    );
    expect(header).not.toMatch(/domain/i);
  });

  it("leave out Secure only for local plain HTTP", () => {
    expect(authCookieHeader("v1.abc", { secure: false })).not.toContain("Secure");
  });

  it("clear the cookie at once", () => {
    expect(clearedAuthCookieHeader({ secure: true })).toBe(
      "crm_auth=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    );
  });
});

describe("the two-step challenge cookie (issue 61)", () => {
  const PENDING = { challenge: "signed.challenge.value", scope: "platform" } as const;

  it("round-trips the challenge, unreadable in the cookie", () => {
    const sealed = sealChallenge(PENDING, { key: KEY, host: HOST });

    expect(openChallenge(sealed, { key: KEY, host: HOST })).toEqual(PENDING);
    expect(Buffer.from(sealed.slice(3), "base64url").toString()).not.toContain("signed");
  });

  it("never opens on another host or with another key", () => {
    const sealed = sealChallenge(PENDING, { key: KEY, host: HOST });

    expect(openChallenge(sealed, { key: KEY, host: `${testHost("beta")}:8080` })).toBeNull();
    expect(openChallenge(sealed, { key: randomBytes(32), host: HOST })).toBeNull();
  });

  it("never opens as tokens, and tokens never open as a challenge", () => {
    const challenge = sealChallenge(PENDING, { key: KEY, host: HOST });
    const tokens = sealTokens(TOKENS, { key: KEY, host: HOST });

    expect(openTokens(challenge, { key: KEY, host: HOST })).toBeNull();
    expect(openChallenge(tokens, { key: KEY, host: HOST })).toBeNull();
  });

  it.each(["", "v1.", "garbage", `v1.${"A".repeat(3000)}`])("refuses %j", (value) => {
    expect(openChallenge(value, { key: KEY, host: HOST })).toBeNull();
  });

  it("refuses a sealed challenge that is too long", () => {
    const sealed = sealChallenge(
      { challenge: "x".repeat(501), scope: "platform" },
      { key: KEY, host: HOST },
    );

    expect(openChallenge(sealed, { key: KEY, host: HOST })).toBeNull();
  });

  it("is read from its own cookie name", () => {
    expect(readChallengeCookie("crm_auth=v1.a; crm_2fa=v1.b")).toBe("v1.b");
    expect(readChallengeCookie("crm_auth=v1.a")).toBeNull();
  });

  it("lasts 5 minutes, HTTP-only, Secure, SameSite=Lax, for the API only", () => {
    expect(challengeCookieHeader("v1.abc", { secure: true })).toBe(
      "crm_2fa=v1.abc; Path=/api; Max-Age=300; HttpOnly; Secure; SameSite=Lax",
    );
    expect(clearedChallengeCookieHeader({ secure: false })).toBe(
      "crm_2fa=; Path=/api; Max-Age=0; HttpOnly; SameSite=Lax",
    );
  });
});
