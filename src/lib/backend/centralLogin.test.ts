// @vitest-environment node
import type { ServerConfig } from "@/lib/config";

import { answerCentralLogin, centralLoginLimiter, onlyPost } from "./centralLogin";
import { createRateLimiter } from "./rateLimit";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

const HOST = `${testHost("login")}:8080`;
const CONFIG: ServerConfig = {
  backendOrigin: "http://backend:8000",
  internalApiToken: "a-test-internal-token-that-is-32-chars-or-more",
  productDomain: TEST_PRODUCT_DOMAIN,
  centralLoginSubdomain: "login",
  platformSubdomain: "admin",
  authCookie: { key: new Uint8Array(32).fill(9), isSecure: false },
  clientAddress: { source: "cloudflare" },
};
const SAME_ANSWER = { detail: "If this email belongs to an office, we've sent it a link." };

type Sent = { url: string; headers: Headers };

function lookup(headers: Record<string, string> = {}, origin: string | null = `http://${HOST}`) {
  const all = new Headers({ host: HOST, "content-type": "application/json", ...headers });
  if (origin !== null) all.set("origin", origin);
  return new Request(`http://${HOST}/api/central-login/`, {
    method: "POST",
    headers: all,
    body: JSON.stringify({ email: "sita@example.com" }),
  });
}

function fakeBackend() {
  const sent: Sent[] = [];
  // The server always calls fetch with a string URL.
  const fetchFn = vi.fn<typeof fetch>((url, init = {}) => {
    sent.push({ url: typeof url === "string" ? url : "", headers: new Headers(init.headers) });
    return Promise.resolve(Response.json(SAME_ANSWER, { status: 202 }));
  });
  return { sent, fetchFn };
}

const logger = { api: vi.fn(), warn: vi.fn(), error: vi.fn() };

function options(fetchFn: typeof fetch, limit = 2) {
  return {
    config: CONFIG,
    fetchFn,
    logger,
    limiter: createRateLimiter({ limit, windowMs: 60_000, maxKeys: 100 }),
  };
}

describe("answerCentralLogin", () => {
  it("forwards the lookup to Django with the Central login's host", async () => {
    const { sent, fetchFn } = fakeBackend();

    const response = await answerCentralLogin(lookup(), options(fetchFn));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual(SAME_ANSWER);
    expect(sent[0]?.url).toBe("http://backend:8000/api/central-login/");
    expect(sent[0]?.headers.get("x-forwarded-host")).toBe(HOST);
  });

  it("refuses with 429 once one address has used up its tries, without calling Django", async () => {
    const { sent, fetchFn } = fakeBackend();
    const settings = options(fetchFn, 2);
    const fromOneAddress = { "cf-connecting-ip": "203.0.113.7" };

    await answerCentralLogin(lookup(fromOneAddress), settings);
    await answerCentralLogin(lookup(fromOneAddress), settings);
    const refused = await answerCentralLogin(lookup(fromOneAddress), settings);

    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBe("900");
    expect(await refused.json()).toEqual({
      detail: "Too many tries. Wait a few minutes and try again.",
    });
    expect(sent).toHaveLength(2);
  });

  it("counts each address on its own", async () => {
    const { sent, fetchFn } = fakeBackend();
    const settings = options(fetchFn, 1);

    await answerCentralLogin(lookup({ "cf-connecting-ip": "203.0.113.7" }), settings);
    const other = await answerCentralLogin(lookup({ "cf-connecting-ip": "2001:db8::1" }), settings);

    expect(other.status).toBe(202);
    expect(sent).toHaveLength(2);
  });

  it("never passes the browser's address on to Django", async () => {
    const { sent, fetchFn } = fakeBackend();

    await answerCentralLogin(
      lookup({ "cf-connecting-ip": "203.0.113.7", "x-client-ip": "198.51.100.1" }),
      options(fetchFn),
    );

    const headers = sent[0]?.headers;
    expect(headers?.get("cf-connecting-ip")).toBeNull();
    expect(headers?.get("x-client-ip")).toBeNull();
    expect(headers?.get("x-forwarded-for")).toBeNull();
  });

  it("never passes the address on in local mode either", async () => {
    const { sent, fetchFn } = fakeBackend();
    const local = {
      ...options(fetchFn),
      config: { ...CONFIG, clientAddress: { source: "local", address: "127.0.0.1" } as const },
    };

    await answerCentralLogin(lookup(), local);

    expect(sent[0]?.headers.get("x-client-ip")).toBeNull();
  });

  it("refuses another site's page without using up the address's tries", async () => {
    const { sent, fetchFn } = fakeBackend();
    const settings = options(fetchFn, 1);
    const address = { "cf-connecting-ip": "203.0.113.7" };

    const foreign = await answerCentralLogin(lookup(address, "https://evil.example"), settings);
    const own = await answerCentralLogin(lookup(address), settings);

    expect(foreign.status).toBe(403);
    expect(own.status).toBe(202);
    expect(sent).toHaveLength(1);
  });

  it("refuses a call with no Origin", async () => {
    const { sent, fetchFn } = fakeBackend();

    const response = await answerCentralLogin(lookup({}, null), options(fetchFn));

    expect(response.status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("shares one count for calls with no valid address", async () => {
    const { fetchFn } = fakeBackend();
    const settings = options(fetchFn, 1);

    await answerCentralLogin(lookup(), settings);
    const refused = await answerCentralLogin(lookup({ "cf-connecting-ip": "nonsense" }), settings);

    expect(refused.status).toBe(429);
  });

  it("uses the server's own count by default", () => {
    expect(centralLoginLimiter.take("a-key-used-only-by-this-test")).toBe(true);
  });
});

describe("onlyPost", () => {
  it("answers 405 allowing only POST", async () => {
    const response = onlyPost();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(await response.json()).toEqual({ detail: "Method not allowed." });
  });
});
