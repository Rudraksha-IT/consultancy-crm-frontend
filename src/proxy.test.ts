// @vitest-environment node
import { NextRequest } from "next/server";

import { config, proxy } from "./proxy";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

function page(host: string, path: string): NextRequest {
  return new NextRequest(`http://${host}${path}`, { headers: { host } });
}

beforeEach(() => {
  vi.stubEnv("BACKEND_BASE_URL", "http://backend:8000");
  vi.stubEnv("INTERNAL_API_TOKEN", "a-test-internal-token-that-is-32-chars-or-more");
  vi.stubEnv("PRODUCT_DOMAIN", TEST_PRODUCT_DOMAIN);
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.alloc(32, 9).toString("base64"));
});

describe("proxy", () => {
  it("shows the Central login at the root of its address", () => {
    const response = proxy(page(`${testHost("login")}:8080`, "/"));

    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `http://${testHost("login")}:8080/central-login`,
    );
  });

  it("sends an office's address for that screen to its own login", () => {
    const response = proxy(page(`${testHost("acme")}:8080`, "/central-login?email=x"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://${testHost("acme")}:8080/login`);
  });

  it.each(["/", "/login"])("sends %s on the Platform's address to the Platform", (path) => {
    const response = proxy(page(`${testHost("admin")}:8080`, path));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://${testHost("admin")}:8080/platform`);
  });

  it("serves the Platform login on its own address", () => {
    const response = proxy(page(`${testHost("admin")}:8080`, "/platform/login"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["/platform", "/platform/login"])(
    "answers Page not found for %s on an office's address (ticket 14)",
    (path) => {
      const response = proxy(page(`${testHost("polar")}:8080`, path));

      expect(response.status).toBe(404);
      expect(response.headers.get("x-middleware-rewrite")).not.toContain("/platform");
    },
  );

  it("leaves office pages alone", () => {
    const response = proxy(page(`${testHost("acme")}:8080`, "/students"));

    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves pages alone when the server's settings are bad", () => {
    vi.stubEnv("PRODUCT_DOMAIN", "");

    const response = proxy(page(testHost("login"), "/"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("never runs for the API or Next.js's own files", () => {
    const [pattern = ""] = config.matcher;
    const matches = (path: string) => new RegExp(`^${pattern}$`).test(path);

    expect(matches("/")).toBe(true);
    expect(matches("/login")).toBe(true);
    expect(matches("/api/central-login/")).toBe(false);
    expect(matches("/_next/static/chunk.js")).toBe(false);
    // The tab icon (first live fixes, ticket 05) is the same on every address.
    expect(matches("/tab-icon")).toBe(false);
    expect(matches("/tab-icon/7")).toBe(false);
    expect(matches("/tab-icons")).toBe(true);
  });
});
