// @vitest-environment node
import { PASSWORD_LOGIN_TRIES_PER_ADDRESS, PASSWORD_LOGIN_WINDOW_MS } from "@/constants/backend";
import { testHost } from "@/test/hosts";

import { limitPasswordLogin } from "./passwordLogin";
import { createRateLimiter } from "./rateLimit";

const HOST = `${testHost("acme")}:8080`;

function call(path: string, address = "203.0.113.9", method = "POST"): Request {
  return new Request(`http://${HOST}${path}`, {
    method,
    headers: { host: HOST, origin: `http://${HOST}`, "cf-connecting-ip": address },
    body: method === "POST" ? "{}" : null,
  });
}

describe("limitPasswordLogin (security 01)", () => {
  it("allows 30 password tries per address in 15 minutes, as a whole office shares one", () => {
    expect(PASSWORD_LOGIN_TRIES_PER_ADDRESS).toBe(30);
    expect(PASSWORD_LOGIN_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it.each(["/api/auth/login/", "/api/platform/auth/login/"])(
    "refuses the 31st try from one address on %s with 429",
    (path) => {
      const counted = createRateLimiter({
        limit: PASSWORD_LOGIN_TRIES_PER_ADDRESS,
        windowMs: PASSWORD_LOGIN_WINDOW_MS,
        maxKeys: 10,
      });
      for (let i = 0; i < PASSWORD_LOGIN_TRIES_PER_ADDRESS; i += 1) {
        expect(limitPasswordLogin(call(path), counted)).toBeNull();
      }

      const refused = limitPasswordLogin(call(path), counted);

      expect(refused?.status).toBe(429);
      expect(refused?.headers.get("retry-after")).toBe("900");
      expect(limitPasswordLogin(call(path, "2001:db8::9"), counted)).toBeNull();
    },
  );

  it("lets every other call through", () => {
    const counted = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 10 });
    const others = [
      "/api/auth/login/next/",
      "/api/platform/auth/login/next/",
      "/api/auth/login/x/",
      "/api/auth/password-reset/",
      "/api/students/",
    ];

    for (const path of others) {
      expect(limitPasswordLogin(call(path), counted)).toBeNull();
      expect(limitPasswordLogin(call(path), counted)).toBeNull();
    }
    expect(limitPasswordLogin(call("/api/auth/login/", undefined, "GET"), counted)).toBeNull();
    expect(limitPasswordLogin(call("/api/auth/login/", undefined, "GET"), counted)).toBeNull();
  });
});
