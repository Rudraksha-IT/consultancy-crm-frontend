// @vitest-environment node
import { limitPlatformPasswordReset } from "./platformPasswordReset";
import { createRateLimiter } from "./rateLimit";
import { testHost } from "@/test/hosts";

const HOST = `${testHost("admin")}:8080`;
const REQUEST = "/api/platform/auth/password-reset/";
const VERIFY = "/api/platform/auth/password-reset/verify/";
const CONFIRM = "/api/platform/auth/password-reset/confirm/";

type CallOptions = { method: string; address: string; origin: string };
const OWN_CALL: CallOptions = {
  method: "POST",
  address: "203.0.113.7",
  origin: `http://${HOST}`,
};

function call(path: string, changes: Partial<CallOptions> = {}): Request {
  const { method, address, origin } = { ...OWN_CALL, ...changes };
  const headers = new Headers({ host: HOST, "content-type": "application/json" });
  if (address !== "") headers.set("cf-connecting-ip", address);
  if (origin !== "") headers.set("origin", origin);
  const body = method === "POST" ? "{}" : null;
  return new Request(`http://${HOST}${path}`, { method, headers, body });
}

function limiter(limit = 2) {
  return createRateLimiter({ limit, windowMs: 60_000, maxKeys: 100 });
}

describe("limitPlatformPasswordReset (issue 63)", () => {
  it("lets calls through until one address has used up its tries, then answers 429", async () => {
    const counted = limiter(2);

    expect(limitPlatformPasswordReset(call(REQUEST), counted)).toBeNull();
    expect(limitPlatformPasswordReset(call(VERIFY), counted)).toBeNull();
    const refused = limitPlatformPasswordReset(call(CONFIRM), counted);

    expect(refused?.status).toBe(429);
    expect(refused?.headers.get("retry-after")).toBe("900");
    expect(await refused?.json()).toEqual({
      detail: "Too many tries. Wait a few minutes and try again.",
    });
  });

  it.each([
    "/api/platform/auth/join/",
    "/api/platform/auth/join/verify/",
    "/api/platform/auth/join/complete/",
  ])("counts the Platform's Join call %s too (issue 65)", (path) => {
    const counted = limiter(1);

    expect(limitPlatformPasswordReset(call(path), counted)).toBeNull();
    expect(limitPlatformPasswordReset(call(path), counted)?.status).toBe(429);
  });

  it("counts each address on its own", () => {
    const counted = limiter(1);

    limitPlatformPasswordReset(call(REQUEST), counted);

    expect(
      limitPlatformPasswordReset(call(REQUEST, { address: "2001:db8::1" }), counted),
    ).toBeNull();
  });

  it("shares one count for calls with no valid address", () => {
    const counted = limiter(1);

    limitPlatformPasswordReset(call(REQUEST, { address: "" }), counted);

    expect(
      limitPlatformPasswordReset(call(REQUEST, { address: "not-an-ip" }), counted)?.status,
    ).toBe(429);
  });

  it("leaves every other call alone", () => {
    const counted = limiter(0);

    for (const path of [
      "/api/platform/auth/login/",
      "/api/auth/password-reset/",
      "/api/platform/auth/password-reset/other/",
      "/api/platform/auth/password-reset",
    ]) {
      expect(limitPlatformPasswordReset(call(path), counted)).toBeNull();
    }
  });

  it("counts only POSTs from the page's own origin (others are refused later)", () => {
    const counted = limiter(1);

    limitPlatformPasswordReset(call(REQUEST, { origin: "https://evil.example" }), counted);
    limitPlatformPasswordReset(call(REQUEST, { method: "GET" }), counted);

    expect(limitPlatformPasswordReset(call(REQUEST), counted)).toBeNull();
  });
});
