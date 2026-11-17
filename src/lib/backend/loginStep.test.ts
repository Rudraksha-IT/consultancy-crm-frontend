// @vitest-environment node
import { LOGIN_STEP_TRIES_PER_ADDRESS } from "@/constants/backend";
import { testHost } from "@/test/hosts";

import { limitLoginStep } from "./loginStep";
import { createRateLimiter } from "./rateLimit";

const HOST = `${testHost("acme")}:8080`;

function call(path: string, address = "203.0.113.9"): Request {
  return new Request(`http://${HOST}${path}`, {
    method: "POST",
    headers: { host: HOST, origin: `http://${HOST}`, "cf-connecting-ip": address },
    body: "{}",
  });
}

describe("limitLoginStep (issue 66)", () => {
  it("is generous, as a whole office logs in from one address", () => {
    expect(LOGIN_STEP_TRIES_PER_ADDRESS).toBeGreaterThanOrEqual(60);
  });

  it.each(["/api/auth/login/next/", "/api/platform/auth/login/next/"])(
    "answers 429 once one address has used up its tries on %s",
    (path) => {
      const counted = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10 });

      expect(limitLoginStep(call(path), counted)).toBeNull();
      expect(limitLoginStep(call(path), counted)?.status).toBe(429);
      expect(limitLoginStep(call(path, "2001:db8::9"), counted)).toBeNull();
    },
  );

  it("leaves every other call alone", () => {
    const counted = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10 });

    for (const path of ["/api/auth/login/", "/api/auth/login/next/x/", "/api/students/"]) {
      expect(limitLoginStep(call(path), counted)).toBeNull();
      expect(limitLoginStep(call(path), counted)).toBeNull();
    }
  });
});
