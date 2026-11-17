// @vitest-environment node
import { z } from "zod";

import {
  openChallenge,
  openTokens,
  sealChallenge,
  sealTokens,
  type AuthTokens,
} from "@/lib/auth-cookie";

import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from "./route";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

const TOKEN = "a-test-internal-token-that-is-32-chars-or-more";
const BROWSER_HOST = `${testHost("acme")}:8080`;
const BACKEND = "http://backend:8000";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KIB = 1024;
const MAX_BODY_BYTES = 1024 * KIB;
// A Document upload: the 10 MB file plus room for the form around it.
const MAX_UPLOAD_BYTES = 20 * 1024 * KIB + 64 * KIB;
const UPLOAD_PATH = "/api/students/7/documents/";
// The office logo (issue 39): the 1 MB file plus room for the form around it.
const MAX_LOGO_UPLOAD_BYTES = 1024 * KIB + 64 * KIB;
const LOGO_UPLOAD_PATH = "/api/configuration/logo/";
const COOKIE_KEY = new Uint8Array(32).fill(9);
const OWN_ORIGIN = `http://${BROWSER_HOST}`;

type Sent = { url: string; init: RequestInit };

type IncomingInit = RequestInit & {
  host?: string | null;
  origin?: string | null;
  tokens?: AuthTokens;
  duplex?: "half";
};

/**
 * A browser call as Next.js sees it. Writes carry the page's own Origin unless the test says
 * otherwise (as browsers send it); `tokens` adds the sealed login cookie for this host.
 */
function incoming(path: string, init: IncomingInit = {}): Request {
  const { host = BROWSER_HOST, origin = OWN_ORIGIN, tokens, ...rest } = init;
  const headers = browserHeaders(rest, { host, origin: isWrite(rest) ? origin : null, tokens });
  // The URL is how Next.js saw the request; the Host header is what the browser sent.
  return new Request(`http://${BROWSER_HOST}${path}`, { ...rest, headers });
}

function isWrite(init: RequestInit): boolean {
  return init.method !== undefined && init.method !== "GET";
}

function browserHeaders(
  init: RequestInit,
  own: { host: string | null; origin: string | null; tokens: AuthTokens | undefined },
): Headers {
  const headers = new Headers(init.headers);
  if (own.host !== null) headers.set("host", own.host);
  if (own.origin !== null) headers.set("origin", own.origin);
  if (own.tokens !== undefined) headers.append("cookie", `crm_auth=${seal(own.tokens)}`);
  return headers;
}

let tokenNumber = 0;

/** Fresh tokens per call, so the server's shared refreshes never mix between tests. */
function newTokens(scope: AuthTokens["scope"] = "staff"): AuthTokens {
  tokenNumber += 1;
  return {
    access: `access-${String(tokenNumber)}`,
    refresh: `refresh-${String(tokenNumber)}`,
    scope,
  };
}

function seal(tokens: AuthTokens): string {
  return sealTokens(tokens, { key: COOKIE_KEY, host: BROWSER_HOST });
}

/** The tokens in the login cookie the response sets, or null if it sets none or clears it. */
function cookieTokens(response: Response): AuthTokens | null {
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("crm_auth="));
  const value = cookie?.split(";")[0]?.slice("crm_auth=".length) ?? "";
  return openTokens(value, { key: COOKIE_KEY, host: BROWSER_HOST });
}

function clearsTheCookie(response: Response): boolean {
  return response.headers.getSetCookie().some((value) => /^crm_auth=;.*Max-Age=0/.test(value));
}

type Answer = (url: string, init: RequestInit) => Response;

function fakeBackend(answer: Answer = () => Response.json({ ok: true })) {
  const sent: Sent[] = [];
  // The server always calls fetch with a string URL.
  const fetchFn = vi.fn((url: string, init: RequestInit = {}) => {
    sent.push({ url, init });
    return Promise.resolve(answer(url, init));
  });
  vi.stubGlobal("fetch", fetchFn);
  return { sent, fetchFn };
}

function headersOf(call: Sent | undefined): Headers {
  if (call === undefined) throw new Error("that call didn't reach the backend");
  return new Headers(call.init.headers);
}

async function bodyOf(call: Sent | undefined): Promise<string> {
  const body = call?.init.body;
  return body === undefined || body === null ? "" : new Response(body).text();
}

function sentHeaders(sent: Sent[]): Headers {
  const first = sent[0];
  if (first === undefined) throw new Error("nothing reached the backend");
  return new Headers(first.init.headers);
}

async function sentBody(sent: Sent[]): Promise<string> {
  const body = sent[0]?.init.body;
  return body === undefined || body === null ? "" : new Response(body).text();
}

const LogEntrySchema = z.record(z.string(), z.unknown());
type LogEntry = z.infer<typeof LogEntrySchema>;

/** The JSON lines the server logged to stdout during this test. */
function logged(): LogEntry[] {
  return stdout.mock.calls
    .flatMap(([text]) => String(text).split("\n"))
    .filter(Boolean)
    .map((line) => LogEntrySchema.parse(JSON.parse(line)));
}

function loggedOfType(type: string): LogEntry[] {
  return logged().filter((entry) => entry.type === type);
}

function silenceStdout() {
  return vi.spyOn(process.stdout, "write").mockReturnValue(true);
}

let stdout: ReturnType<typeof silenceStdout>;

beforeEach(() => {
  stdout = silenceStdout();
  vi.stubEnv("BACKEND_BASE_URL", BACKEND);
  vi.stubEnv("INTERNAL_API_TOKEN", TOKEN);
  vi.stubEnv("PRODUCT_DOMAIN", TEST_PRODUCT_DOMAIN);
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.from(COOKIE_KEY).toString("base64"));
});

describe("where the call goes", () => {
  it("calls Django on the internal address with the same path and query", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/students/?q=sita&page=2"));

    expect(sent[0]?.url).toBe(`${BACKEND}/api/students/?q=sita&page=2`);
  });

  it("keeps the trailing slash Django's URLs end with", async () => {
    const { sent } = fakeBackend();

    await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));

    expect(sent[0]?.url).toBe(`${BACKEND}/api/auth/login/`);
    expect(sent[0]?.init.method).toBe("POST");
  });

  it.each([
    ["GET", GET],
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("forwards %s", async (method, handler) => {
    const { sent } = fakeBackend();

    const response = await handler(incoming("/api/x/", { method }));

    expect(response.status).toBe(200);
    expect(sent[0]?.init.method).toBe(method);
  });

  it("never follows a redirect from Django", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/x/"));

    expect(sent[0]?.init.redirect).toBe("manual");
  });
});

describe("headers sent to Django", () => {
  it("sets the forwarded host and scheme from the browser's own request", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/"));

    const headers = sentHeaders(sent);
    expect(headers.get("x-forwarded-host")).toBe(BROWSER_HOST);
    expect(headers.get("x-forwarded-proto")).toBe("http");
  });

  it("adds the internal token and a new correlation ID per call", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/"));
    await GET(incoming("/api/context/"));

    const first = sentHeaders(sent);
    const second = new Headers(sent[1]?.init.headers);
    expect(first.get("x-internal-token")).toBe(TOKEN);
    expect(first.get("x-correlation-id")).toMatch(UUID);
    expect(second.get("x-correlation-id")).not.toBe(first.get("x-correlation-id"));
  });

  it("drops forwarding, token, correlation and hop-by-hop headers the browser sent", async () => {
    const { sent } = fakeBackend();

    await GET(
      incoming("/api/context/", {
        headers: {
          "x-forwarded-host": testHost("beta"),
          "x-forwarded-for": "6.6.6.6",
          "x-forwarded-proto": "https",
          "x-forwarded-port": "443",
          "x-real-ip": "6.6.6.6",
          forwarded: `host=${testHost("beta")}`,
          "x-internal-token": "browser-guess",
          "x-correlation-id": "chosen-by-the-browser",
          authorization: "Bearer stolen",
          connection: "keep-alive, x-secret",
          "keep-alive": "timeout=5",
          upgrade: "websocket",
          te: "trailers",
          "proxy-authorization": "Basic x",
          "x-secret": "1",
        },
      }),
    );

    const headers = sentHeaders(sent);
    expect(headers.get("x-forwarded-host")).toBe(BROWSER_HOST);
    expect(headers.get("x-internal-token")).toBe(TOKEN);
    expect(headers.get("x-correlation-id")).toMatch(UUID);
    for (const dropped of [
      "x-forwarded-for",
      "x-forwarded-port",
      "x-real-ip",
      "forwarded",
      "authorization",
      "connection",
      "keep-alive",
      "upgrade",
      "te",
      "proxy-authorization",
      "x-secret",
      "host",
    ]) {
      expect(headers.has(dropped), dropped).toBe(false);
    }
  });

  it("passes on only what Django needs: accept and content type", async () => {
    const { sent } = fakeBackend();

    await POST(
      incoming("/api/x/", {
        method: "POST",
        body: "{}",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-csrftoken": "csrf-123",
          referer: `http://${testHost("acme")}:8080/login`,
        },
      }),
    );

    const headers = sentHeaders(sent);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("content-type")).toBe("application/json");
    for (const dropped of ["x-csrftoken", "origin", "referer"]) {
      expect(headers.has(dropped), dropped).toBe(false);
    }
  });

  it("never passes a browser cookie to Django, not even the login cookie", async () => {
    const { sent } = fakeBackend();

    await GET(
      incoming("/api/context/", {
        tokens: newTokens(),
        headers: { cookie: "theme=dark; sessionid=abc; csrftoken=xyz" },
      }),
    );

    expect(sentHeaders(sent).has("cookie")).toBe(false);
  });
});

describe("the client's address (ADR 0004)", () => {
  it("is copied from Cloudflare's CF-Connecting-IP to X-Client-IP", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/", { headers: { "cf-connecting-ip": "203.0.113.7" } }));

    const headers = sentHeaders(sent);
    expect(headers.get("x-client-ip")).toBe("203.0.113.7");
    expect(headers.has("cf-connecting-ip")).toBe(false);
  });

  it("passes an IPv6 address on too", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/", { headers: { "cf-connecting-ip": "2001:db8::7" } }));

    expect(sentHeaders(sent).get("x-client-ip")).toBe("2001:db8::7");
  });

  it("never passes on a client address the browser chose", async () => {
    const { sent } = fakeBackend();

    await GET(
      incoming("/api/context/", {
        headers: {
          "x-client-ip": "198.51.100.66",
          "x-forwarded-for": "198.51.100.67",
          "x-real-ip": "198.51.100.68",
          forwarded: "for=198.51.100.69",
        },
      }),
    );

    const headers = sentHeaders(sent);
    for (const dropped of ["x-client-ip", "x-forwarded-for", "x-real-ip", "forwarded"]) {
      expect(headers.has(dropped), dropped).toBe(false);
    }
  });

  it("sends Cloudflare's address, not the browser's X-Client-IP, when both are there", async () => {
    const { sent } = fakeBackend();

    await GET(
      incoming("/api/context/", {
        headers: { "cf-connecting-ip": "203.0.113.7", "x-client-ip": "198.51.100.66" },
      }),
    );

    expect(sentHeaders(sent).get("x-client-ip")).toBe("203.0.113.7");
  });

  it.each(["", "not-an-ip", "203.0.113.7, 198.51.100.1", "fe80::1%eth0", "<script>"])(
    "sends nothing for a malformed %j",
    async (value) => {
      const { sent } = fakeBackend();

      await GET(incoming("/api/context/", { headers: { "cf-connecting-ip": value } }));

      expect(sentHeaders(sent).has("x-client-ip")).toBe(false);
    },
  );

  it("sends the configured address in local mode", async () => {
    vi.stubEnv("CLIENT_IP_SOURCE", "local");
    vi.stubEnv("DEV_CLIENT_IP", "198.51.100.9");
    const { sent } = fakeBackend();

    await GET(
      incoming("/api/context/", {
        headers: { "cf-connecting-ip": "203.0.113.7", "x-client-ip": "198.51.100.66" },
      }),
    );

    expect(sentHeaders(sent).get("x-client-ip")).toBe("198.51.100.9");
  });

  it("sends 127.0.0.1 in local mode by default", async () => {
    vi.stubEnv("CLIENT_IP_SOURCE", "local");
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/"));

    expect(sentHeaders(sent).get("x-client-ip")).toBe("127.0.0.1");
  });

  it("is sent again when a logged-in call is repeated with renewed tokens", async () => {
    let calls = 0;
    const { sent } = fakeBackend((url) => {
      if (url.endsWith("/api/auth/refresh/")) {
        return Response.json({ access: "new-access", refresh: "new-refresh" });
      }
      calls += 1;
      return calls === 1
        ? Response.json({ detail: "expired" }, { status: 401 })
        : Response.json({ ok: true });
    });

    await GET(
      incoming("/api/context/", {
        tokens: newTokens(),
        headers: { "cf-connecting-ip": "203.0.113.7" },
      }),
    );

    expect(sent).toHaveLength(3);
    for (const call of sent) expect(headersOf(call).get("x-client-ip")).toBe("203.0.113.7");
  });

  it("is never logged", async () => {
    fakeBackend(() => Response.json({ detail: "nope" }, { status: 403 }));

    await GET(incoming("/api/context/", { headers: { "cf-connecting-ip": "203.0.113.7" } }));

    expect(JSON.stringify(logged())).not.toContain("203.0.113.7");
  });
});

describe("the answer from Django", () => {
  it("is passed back with its status, JSON body and content type unchanged", async () => {
    const body = JSON.stringify({ email: ["Enter a valid email address."] });
    fakeBackend(
      () =>
        new Response(body, {
          status: 400,
          headers: { "content-type": "application/json", server: "gunicorn" },
        }),
    );

    const response = await POST(incoming("/api/x/", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe(body);
  });

  it("passes an image back byte for byte with its own type", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 255]);
    fakeBackend(() => new Response(png, { headers: { "content-type": "image/png" } }));

    const response = await GET(incoming("/api/consultancy/logo/1/"));

    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  });

  it("is never sniffed, run or framed if a browser opens it on its own", async () => {
    fakeBackend(() => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }));

    const response = await GET(incoming("/api/consultancy/logo/1/"));

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    );
  });

  it("never passes on Django's other headers", async () => {
    fakeBackend(() => Response.json({}, { headers: { server: "gunicorn", "x-backend": "1" } }));

    const response = await GET(incoming("/api/x/"));

    expect(response.headers.has("server")).toBe(false);
    expect(response.headers.has("x-backend")).toBe(false);
  });

  it("never passes a cookie Django tries to set", async () => {
    fakeBackend(() => {
      const headers = new Headers();
      headers.append("set-cookie", "sessionid=new; HttpOnly; Path=/; SameSite=Lax");
      return new Response(null, { status: 204, headers });
    });

    const response = await POST(incoming("/api/x/", { method: "POST" }));

    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("passes an empty answer back with no body", async () => {
    fakeBackend(() => new Response(null, { status: 204 }));

    const response = await GET(incoming("/api/x/"));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("is never cached", async () => {
    fakeBackend();

    const response = await GET(incoming("/api/context/"));

    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("request bodies", () => {
  it("are forwarded byte for byte", async () => {
    const { sent } = fakeBackend();
    const body = JSON.stringify({ name: "<script>alert('x')</script>", note: "नमस्ते" });

    await PUT(incoming("/api/x/", { method: "PUT", body }));

    expect(await sentBody(sent)).toBe(body);
  });

  it("are refused over the size limit, by their declared length, without calling Django", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming("/api/x/", {
        method: "POST",
        body: "{}",
        headers: { "content-length": String(MAX_BODY_BYTES + 1) },
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ detail: "The request is too large." });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("are refused over the size limit when they are longer than declared", async () => {
    const { fetchFn } = fakeBackend();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_BODY_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });

    const response = await POST(
      incoming("/api/x/", { method: "POST", body: stream, duplex: "half" }),
    );

    expect(response.status).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("are accepted at exactly the size limit", async () => {
    const { sent } = fakeBackend();

    const response = await POST(
      incoming("/api/x/", { method: "POST", body: new Uint8Array(MAX_BODY_BYTES) }),
    );

    expect(response.status).toBe(200);
    expect((await sentBody(sent)).length).toBe(MAX_BODY_BYTES);
  });

  it("may be as large as a Document upload on the upload path only", async () => {
    const { sent } = fakeBackend();

    const response = await POST(
      incoming(UPLOAD_PATH, { method: "POST", body: new Uint8Array(MAX_UPLOAD_BYTES) }),
    );

    expect(response.status).toBe(200);
    expect((await sentBody(sent)).length).toBe(MAX_UPLOAD_BYTES);
  });

  it.each([
    ["adding files to a Document (issue 78)", "/api/students/7/documents/31/files/"],
    ["an Offer Letter (issue 76)", "/api/students/7/offer-letters/"],
    ["a visa letter (issue 77)", "/api/students/7/visas/21/letter/"],
  ])("may be as large as a Document upload for %s", async (_case, path) => {
    const { sent } = fakeBackend();

    const response = await POST(
      incoming(path, { method: "POST", body: new Uint8Array(MAX_UPLOAD_BYTES) }),
    );

    expect(response.status).toBe(200);
    expect((await sentBody(sent)).length).toBe(MAX_UPLOAD_BYTES);
  });

  it("are refused over the upload limit on the upload path", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming(UPLOAD_PATH, { method: "POST", body: new Uint8Array(MAX_UPLOAD_BYTES + 1) }),
    );

    expect(response.status).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("may be as large as a logo upload on the logo path only", async () => {
    const { sent } = fakeBackend();

    const response = await POST(
      incoming(LOGO_UPLOAD_PATH, { method: "POST", body: new Uint8Array(MAX_LOGO_UPLOAD_BYTES) }),
    );

    expect(response.status).toBe(200);
    expect((await sentBody(sent)).length).toBe(MAX_LOGO_UPLOAD_BYTES);
  });

  it("may be as large as a logo upload on the product logo path too (issue 65)", async () => {
    const { sent } = fakeBackend();

    const response = await POST(
      incoming("/api/platform/brand/logo/", {
        method: "POST",
        body: new Uint8Array(MAX_LOGO_UPLOAD_BYTES),
      }),
    );

    expect(response.status).toBe(200);
    expect((await sentBody(sent)).length).toBe(MAX_LOGO_UPLOAD_BYTES);
  });

  it("are refused over the logo limit on the logo path", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming(LOGO_UPLOAD_PATH, {
        method: "POST",
        body: new Uint8Array(MAX_LOGO_UPLOAD_BYTES + 1),
      }),
    );

    expect(response.status).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    ["another path", "POST", "/api/students/7/note/"],
    ["the logo path with another method", "PATCH", LOGO_UPLOAD_PATH],
    ["a path that starts like the logo path", "POST", "/api/configuration/logo/x/"],
    ["the product logo's file path", "POST", "/api/platform/brand/logo/1/"],
    ["a path that only looks like it", "POST", "/api/students/7/documents/../note/"],
    ["a longer path", "POST", "/api/students/7/documents/1/link/"],
    ["a file's link", "POST", "/api/students/7/documents/1/files/2/link/"],
    ["a path that only looks like adding files", "POST", "/api/students/7/documents/x/files/"],
    ["another method", "PUT", UPLOAD_PATH],
  ])("keep the usual limit for %s", async (_case, method, path) => {
    const { fetchFn } = fakeBackend();

    const response = await PUT(
      incoming(path, { method, body: new Uint8Array(MAX_BODY_BYTES + 1) }),
    );

    expect(response.status).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("are not sent with a GET", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/x/"));

    expect(sent[0]?.init.body).toBeUndefined();
  });
});

describe("refused calls", () => {
  it.each([
    ["HEAD", HEAD],
    ["OPTIONS", OPTIONS],
  ])("%s is not allowed", (_method, handler) => {
    const { fetchFn } = fakeBackend();

    const response = handler();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST, PUT, PATCH, DELETE");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    null,
    "",
    "evil.example.com",
    `${testHost("acme")}.evil.example.com`,
    TEST_PRODUCT_DOMAIN,
    `a.${testHost("b")}`,
    `${testHost("acme")}:80:80`,
    `${testHost("acme")}@evil.example.com`,
  ])("a call for a host outside the product domain (%j) is not found", async (host) => {
    const { fetchFn } = fakeBackend();

    const response = await GET(incoming("/api/context/", { host }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ detail: "Not found." });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("gives up on a slow backend with a short message", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_input: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal?.addEventListener("abort", () => {
                reject(new DOMException("The operation was aborted.", "AbortError"));
              });
            }),
        ),
      );

      const pending = GET(incoming("/api/context/"));
      await vi.advanceTimersByTimeAsync(15_000);
      const response = await pending;

      expect(response.status).toBe(504);
      expect(await response.json()).toEqual({ detail: "The server took too long to answer." });
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits longer for a message to many Students, and only for that call", async () => {
    vi.useFakeTimers();
    try {
      let answered = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_input: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal?.addEventListener("abort", () => {
                answered += 1;
                reject(new DOMException("The operation was aborted.", "AbortError"));
              });
            }),
        ),
      );
      const tokens = newTokens();

      const bulk = POST(incoming("/api/messages/bulk/", { method: "POST", body: "{}", tokens }));
      const other = POST(incoming("/api/messages/", { method: "POST", body: "{}", tokens }));
      await vi.advanceTimersByTimeAsync(15_000);
      expect(answered).toBe(1);
      await vi.advanceTimersByTimeAsync(60_000);
      const [bulkAnswer, otherAnswer] = await Promise.all([bulk, other]);

      expect([bulkAnswer.status, otherAnswer.status]).toEqual([504, 504]);
      expect(answered).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("says the server can't be reached, without revealing its address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError(`fetch failed: connect ECONNREFUSED ${BACKEND}`))),
    );

    const response = await GET(incoming("/api/context/"));
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ detail: "The server can't be reached." });
    expect(text).not.toContain("backend");
    expect(text).not.toContain(TOKEN);
  });

  it("fails safely when the server isn't configured", async () => {
    vi.stubEnv("INTERNAL_API_TOKEN", "short");
    const { fetchFn } = fakeBackend();

    const response = await GET(incoming("/api/context/"));
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ detail: "Something went wrong." });
    expect(text).not.toContain("INTERNAL_API_TOKEN");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("logging", () => {
  it("writes one api entry per call, with the correlation ID sent to Django", async () => {
    const { sent } = fakeBackend(() => Response.json({ ok: true }, { status: 201 }));

    await POST(incoming("/api/students/?q=sita@acme.test", { method: "POST", body: "{}" }));

    const entries = loggedOfType("api");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: 30,
      msg: "API request",
      url: "/api/students/",
      method: "POST",
      status: 201,
      correlationId: sentHeaders(sent).get("x-correlation-id"),
    });
    expect(entries[0]?.timeTaken).toMatch(/^\d+ms$/);
  });

  it("never logs cookies, tokens, bodies or the query string", async () => {
    fakeBackend(() =>
      Response.json(
        { access: "a-jwt", refresh: "r-jwt", context: {} },
        { headers: { "set-cookie": "sessionid=from-django" } },
      ),
    );

    const response = await POST(
      incoming("/api/auth/login/?code=123456", {
        method: "POST",
        body: JSON.stringify({ email: "sita@acme.test", password: "Secret-1!" }),
        headers: { cookie: "sessionid=from-browser", authorization: "Bearer browser-token" },
      }),
    );

    const sealed = response.headers.getSetCookie().join(";");
    const text = JSON.stringify(logged());
    for (const secret of [
      "sita@acme.test",
      "Secret-1!",
      "123456",
      "from-browser",
      "browser-token",
      "from-django",
      "a-jwt",
      "r-jwt",
      sealed.slice("crm_auth=".length, 60),
      TOKEN,
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("logs calls refused before Django too", async () => {
    fakeBackend();

    await GET(incoming("/api/context/", { host: "evil.example.com" }));

    expect(loggedOfType("api")[0]).toMatchObject({ url: "/api/context/", status: 404 });
  });

  it("adds an error entry when Django can't be reached, without its address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError(`fetch failed: connect ECONNREFUSED ${BACKEND}`))),
    );

    await GET(incoming("/api/context/"));

    expect(loggedOfType("api")[0]).toMatchObject({ status: 502 });
    expect(loggedOfType("error")[0]).toMatchObject({
      level: 50,
      url: "/api/context/",
      method: "GET",
      error: "unreachable",
    });
    expect(JSON.stringify(logged())).not.toContain(BACKEND);
  });

  it("gives that error entry the stack frames and the correlation ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError(`fetch failed: connect ECONNREFUSED ${BACKEND}`))),
    );

    await GET(incoming("/api/context/"));

    const [entry] = loggedOfType("error");
    expect(entry?.correlationId).toBe(loggedOfType("api")[0]?.correlationId);
    expect(entry?.stack).toMatch(/^TypeError\n\s+at /);
  });

  it("adds an error entry with the status when Django answers 5xx", async () => {
    const { sent } = fakeBackend(() =>
      Response.json({ detail: "Something went wrong.", reference: "r" }, { status: 500 }),
    );

    await GET(incoming("/api/context/"));

    expect(loggedOfType("error")).toEqual([
      expect.objectContaining({
        level: 50,
        msg: "API error",
        url: "/api/context/",
        method: "GET",
        status: 500,
        correlationId: sentHeaders(sent).get("x-correlation-id"),
      }),
    ]);
  });

  it("keeps a 4xx from Django at info", async () => {
    fakeBackend(() => Response.json({ detail: "Not found." }, { status: 404 }));

    await GET(incoming("/api/context/"));

    expect(logged().map((entry) => entry.level)).toEqual([30]);
  });

  it("adds a warn entry for a change from another site, with the reason only", async () => {
    fakeBackend();

    await POST(incoming("/api/x/", { method: "POST", origin: "http://evil.example.com" }));

    expect(loggedOfType("warn")).toEqual([
      expect.objectContaining({ level: 40, msg: "API refused", reason: "origin", url: "/api/x/" }),
    ]);
    expect(JSON.stringify(logged())).not.toContain("evil.example.com");
  });
});

describe("changes from another site (Origin check)", () => {
  it.each([
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("a %s without an Origin is refused before Django", async (method, handler) => {
    const { fetchFn } = fakeBackend();

    const response = await handler(incoming("/api/x/", { method, origin: null }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ detail: "Forbidden." });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    "http://evil.example.com",
    `http://${testHost("beta")}:8080`,
    `http://${testHost("acme")}:9999`,
    `http://${testHost("acme")}:8080.evil.example.com`,
    "null",
    "not a url",
  ])("a change from %s is refused", async (origin) => {
    const { fetchFn } = fakeBackend();

    const response = await POST(incoming("/api/x/", { method: "POST", origin }));

    expect(response.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("a change from the page's own host is let through, whatever its scheme", async () => {
    fakeBackend();

    const response = await PUT(
      incoming("/api/x/", { method: "PUT", origin: `https://ACME.${TEST_PRODUCT_DOMAIN}:8080` }),
    );

    expect(response.status).toBe(200);
  });

  it("a read needs no Origin", async () => {
    fakeBackend();

    expect((await GET(incoming("/api/x/", { origin: null }))).status).toBe(200);
  });
});

describe("logging in", () => {
  const CONTEXT = { staff: { id: 1, name: "Sita" } };

  it("keeps the tokens in a sealed cookie and gives the browser the rest", async () => {
    fakeBackend(() => Response.json({ access: "acc", refresh: "ref", context: CONTEXT }));

    const response = await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ context: CONTEXT });
    expect(text).not.toContain("acc");
    expect(text).not.toContain("ref");
    expect(cookieTokens(response)).toEqual({ access: "acc", refresh: "ref", scope: "staff" });
  });

  it("sets an HTTP-only, Secure, SameSite=Lax, host-only cookie for the API only", async () => {
    fakeBackend(() => Response.json({ access: "acc", refresh: "ref", context: CONTEXT }));

    const response = await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));

    const cookie = response.headers.getSetCookie()[0] ?? "";
    expect(cookie).toMatch(/; Path=\/api; Max-Age=604800; HttpOnly; Secure; SameSite=Lax$/);
    expect(cookie).not.toMatch(/domain/i);
  });

  it("leaves Secure off only when the server is told it runs on plain HTTP", async () => {
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");
    fakeBackend(() => Response.json({ access: "acc", refresh: "ref", context: CONTEXT }));

    const response = await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));

    expect(response.headers.getSetCookie()[0]).not.toContain("Secure");
  });

  it("marks a Platform login's cookie as Platform", async () => {
    fakeBackend(() => Response.json({ access: "acc", refresh: "ref", platform_admin: {} }));

    const response = await POST(
      incoming("/api/platform/auth/login/", { method: "POST", body: "{}" }),
    );

    expect(await response.json()).toEqual({ platform_admin: {} });
    expect(cookieTokens(response)?.scope).toBe("platform");
  });

  it("passes a refusal back and sets no cookie", async () => {
    fakeBackend(() => Response.json({ detail: "Invalid email or password." }, { status: 400 }));

    const response = await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ detail: "Invalid email or password." });
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it.each([
    { context: {} },
    { access: "", refresh: "ref" },
    { access: 1, refresh: "ref" },
    { access: "a".repeat(2049), refresh: "ref" },
  ])("treats an answer without proper tokens as a failure (%j)", async (answer) => {
    fakeBackend(() => Response.json(answer));

    const response = await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("treats an answer that isn't JSON as a failure", async () => {
    fakeBackend(() => new Response("<html>oops</html>", { status: 200 }));

    const response = await POST(incoming("/api/auth/login/", { method: "POST", body: "{}" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ detail: "Something went wrong." });
  });

  it("never sends an older login's token with the login", async () => {
    const { sent } = fakeBackend(() =>
      Response.json({ access: "acc", refresh: "ref", context: {} }),
    );

    await POST(incoming("/api/auth/login/", { method: "POST", body: "{}", tokens: newTokens() }));

    expect(sentHeaders(sent).has("authorization")).toBe(false);
  });
});

describe.each([
  ["choosing a new password with a reset Code", "/api/auth/password-reset/complete/"],
  ["joining with an Invite Code", "/api/auth/join/complete/"],
  ["a Platform Admin entering an office with its one-time code", "/api/support-access/enter/"],
])("%s", (_name, PATH) => {
  const CONTEXT = { staff: { id: 1, name: "Sita" } };

  it("logs the person in like a login: tokens in the sealed cookie, the rest to the browser", async () => {
    fakeBackend(() => Response.json({ access: "acc", refresh: "ref", context: CONTEXT }));

    const response = await POST(incoming(PATH, { method: "POST", body: "{}" }));
    const text = await response.text();

    expect(JSON.parse(text)).toEqual({ context: CONTEXT });
    expect(text).not.toContain("acc");
    expect(cookieTokens(response)).toEqual({ access: "acc", refresh: "ref", scope: "staff" });
  });

  it("passes the unmet password rules back and sets no cookie", async () => {
    const refusal = {
      detail: "The password doesn't meet every rule yet.",
      unmet_rules: ["symbol"],
    };
    fakeBackend(() => Response.json(refusal, { status: 400 }));

    const response = await POST(incoming(PATH, { method: "POST", body: "{}" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(refusal);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("is refused from another site", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming(PATH, { method: "POST", body: "{}", origin: "https://evil.example" }),
    );

    expect(response.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never sends an older login's token", async () => {
    const { sent } = fakeBackend(() =>
      Response.json({ access: "acc", refresh: "ref", context: {} }),
    );

    await POST(incoming(PATH, { method: "POST", body: "{}", tokens: newTokens() }));

    expect(sentHeaders(sent).has("authorization")).toBe(false);
  });
});

describe("calls made while logged in", () => {
  it("send the access token from the cookie as a Bearer token", async () => {
    const tokens = newTokens();
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/", { tokens }));

    expect(sentHeaders(sent).get("authorization")).toBe(`Bearer ${tokens.access}`);
  });

  it("send no Bearer token without the cookie", async () => {
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/"));

    expect(sentHeaders(sent).has("authorization")).toBe(false);
  });

  it("treat a cookie that doesn't open as no login, and clear it", async () => {
    const { sent } = fakeBackend(() => Response.json({}, { status: 401 }));

    const response = await GET(
      incoming("/api/context/", { headers: { cookie: "crm_auth=v1.forged-value" } }),
    );

    expect(sentHeaders(sent).has("authorization")).toBe(false);
    expect(response.status).toBe(401);
    expect(clearsTheCookie(response)).toBe(true);
  });

  it("don't open a cookie set on another host", async () => {
    const sealedForBeta = sealTokens(newTokens(), { key: COOKIE_KEY, host: testHost("beta") });
    const { sent } = fakeBackend();

    await GET(incoming("/api/context/", { headers: { cookie: `crm_auth=${sealedForBeta}` } }));

    expect(sentHeaders(sent).has("authorization")).toBe(false);
  });
});

describe("an expired access token", () => {
  function expiringBackend(refreshAnswer: () => Response) {
    return fakeBackend((url, init) => {
      if (url.endsWith("/auth/refresh/")) return refreshAnswer();
      const bearer = new Headers(init.headers).get("authorization");
      return bearer === "Bearer new-access"
        ? Response.json({ ok: true })
        : Response.json({ detail: "Invalid or expired token." }, { status: 401 });
    });
  }

  const RENEWED = () => Response.json({ access: "new-access", refresh: "new-refresh" });

  it("is refreshed once and the call retried with the new token", async () => {
    const tokens = newTokens();
    const { sent } = expiringBackend(RENEWED);

    const response = await PUT(
      incoming("/api/configuration/theme/", { method: "PUT", body: '{"page":"ice"}', tokens }),
    );

    expect(response.status).toBe(200);
    expect(sent.map((call) => call.url)).toEqual([
      `${BACKEND}/api/configuration/theme/`,
      `${BACKEND}/api/auth/refresh/`,
      `${BACKEND}/api/configuration/theme/`,
    ]);
    expect(JSON.parse(await bodyOf(sent[1]))).toEqual({ refresh: tokens.refresh });
    expect(headersOf(sent[1]).get("content-type")).toBe("application/json");
    expect(headersOf(sent[1]).has("authorization")).toBe(false);
    expect(await bodyOf(sent[2])).toBe('{"page":"ice"}');
    expect(headersOf(sent[2]).get("authorization")).toBe("Bearer new-access");
  });

  it("stores the new tokens in the cookie", async () => {
    expiringBackend(RENEWED);

    const response = await GET(incoming("/api/context/", { tokens: newTokens() }));

    expect(cookieTokens(response)).toEqual({
      access: "new-access",
      refresh: "new-refresh",
      scope: "staff",
    });
  });

  it("is refreshed on the Platform's own refresh endpoint for a Platform login", async () => {
    const { sent } = expiringBackend(RENEWED);

    const response = await GET(incoming("/api/platform/me/", { tokens: newTokens("platform") }));

    expect(sent[1]?.url).toBe(`${BACKEND}/api/platform/auth/refresh/`);
    expect(cookieTokens(response)?.scope).toBe("platform");
  });

  it("logs the person out when the refresh is refused", async () => {
    const { sent } = expiringBackend(() => Response.json({}, { status: 401 }));

    const response = await GET(incoming("/api/context/", { tokens: newTokens() }));

    expect(response.status).toBe(401);
    expect(clearsTheCookie(response)).toBe(true);
    expect(sent).toHaveLength(2);
  });

  it("logs the person out when the refresh answer has no tokens", async () => {
    expiringBackend(() => Response.json({ access: "only-one" }));

    const response = await GET(incoming("/api/context/", { tokens: newTokens() }));

    expect(response.status).toBe(401);
    expect(clearsTheCookie(response)).toBe(true);
  });

  it("keeps the login when Django can't be reached for the refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/auth/refresh/")
          ? Promise.reject(new TypeError("fetch failed"))
          : Promise.resolve(Response.json({}, { status: 401 })),
      ),
    );

    const response = await GET(incoming("/api/context/", { tokens: newTokens() }));

    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("is refreshed only once for calls made at the same time", async () => {
    const tokens = newTokens();
    const { sent } = expiringBackend(RENEWED);

    const responses = await Promise.all([
      GET(incoming("/api/context/", { tokens })),
      GET(incoming("/api/students/", { tokens })),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(sent.filter((call) => call.url.endsWith("/auth/refresh/"))).toHaveLength(1);
    expect(responses.map((response) => cookieTokens(response)?.refresh)).toEqual([
      "new-refresh",
      "new-refresh",
    ]);
  });

  it("isn't refreshed without a login cookie", async () => {
    const { sent } = expiringBackend(RENEWED);

    const response = await GET(incoming("/api/context/"));

    expect(response.status).toBe(401);
    expect(sent).toHaveLength(1);
  });

  it("never puts a token in the answer body or the log", async () => {
    const tokens = newTokens();
    expiringBackend(RENEWED);

    const response = await GET(incoming("/api/context/", { tokens }));

    const visible = `${await response.text()} ${JSON.stringify(logged())}`;
    for (const token of [tokens.access, tokens.refresh, "new-access", "new-refresh"]) {
      expect(visible).not.toContain(token);
    }
  });
});

describe("the refresh endpoint", () => {
  it.each(["/api/auth/refresh/", "/api/platform/auth/refresh/"])(
    "can't be called from the browser (%s)",
    async (path) => {
      const { fetchFn } = fakeBackend();

      const response = await POST(
        incoming(path, { method: "POST", body: '{"refresh":"x"}', tokens: newTokens() }),
      );

      expect(response.status).toBe(404);
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );
});

describe("logging out", () => {
  it("revokes the refresh token from the cookie and clears the cookie", async () => {
    const tokens = newTokens();
    const { sent } = fakeBackend(() => new Response(null, { status: 204 }));

    const response = await POST(
      incoming("/api/auth/logout/", { method: "POST", body: '{"refresh":"chosen"}', tokens }),
    );

    expect(response.status).toBe(204);
    expect(clearsTheCookie(response)).toBe(true);
    expect(sent[0]?.url).toBe(`${BACKEND}/api/auth/logout/`);
    expect(JSON.parse(await bodyOf(sent[0]))).toEqual({ refresh: tokens.refresh });
    expect(headersOf(sent[0]).has("authorization")).toBe(false);
  });

  it("logs a Platform Admin out on the Platform's endpoint", async () => {
    const { sent } = fakeBackend(() => new Response(null, { status: 204 }));

    await POST(
      incoming("/api/platform/auth/logout/", { method: "POST", tokens: newTokens("platform") }),
    );

    expect(sent[0]?.url).toBe(`${BACKEND}/api/platform/auth/logout/`);
  });

  it("clears the cookie even when Django refuses the token", async () => {
    fakeBackend(() => Response.json({}, { status: 401 }));

    const response = await POST(
      incoming("/api/auth/logout/", { method: "POST", tokens: newTokens() }),
    );

    expect(response.status).toBe(204);
    expect(clearsTheCookie(response)).toBe(true);
  });

  it("clears the cookie, and says so, when Django can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("fetch failed"))),
    );

    const response = await POST(
      incoming("/api/auth/logout/", { method: "POST", tokens: newTokens() }),
    );

    expect(response.status).toBe(502);
    expect(clearsTheCookie(response)).toBe(true);
  });

  it("answers without calling Django when nobody is logged in", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(incoming("/api/auth/logout/", { method: "POST" }));

    expect(response.status).toBe(204);
    expect(clearsTheCookie(response)).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("is refused from another site, keeping the login", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming("/api/auth/logout/", {
        method: "POST",
        origin: "http://evil.example.com",
        tokens: newTokens(),
      }),
    );

    expect(response.status).toBe(403);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("changing my password or signing out my other devices (issue 38)", () => {
  const RENEWING_PATHS = ["/api/me/password/", "/api/me/devices/sign-out-others/"];

  it.each(RENEWING_PATHS)(
    "%s is sent with the access token and keeps the new tokens in the cookie",
    async (path) => {
      const tokens = newTokens();
      const { sent } = fakeBackend(() =>
        Response.json({ access: "next-acc", refresh: "next-ref" }),
      );

      const response = await POST(incoming(path, { method: "POST", body: "{}", tokens }));
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(headersOf(sent[0]).get("authorization")).toBe(`Bearer ${tokens.access}`);
      expect(JSON.parse(text)).toEqual({});
      expect(text).not.toContain("next-acc");
      expect(text).not.toContain("next-ref");
      expect(cookieTokens(response)).toEqual({
        access: "next-acc",
        refresh: "next-ref",
        scope: "staff",
      });
    },
  );

  it("passes a refusal back and keeps the login as it was", async () => {
    const tokens = newTokens();
    fakeBackend(() =>
      Response.json({ current_password: ["That isn't your current password."] }, { status: 400 }),
    );

    const response = await POST(
      incoming("/api/me/password/", { method: "POST", body: "{}", tokens }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      current_password: ["That isn't your current password."],
    });
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("refreshes an expired access token first, then keeps the newest tokens", async () => {
    const tokens = newTokens();
    const { sent } = fakeBackend((url, init) => {
      if (url.endsWith("/auth/refresh/")) {
        return Response.json({ access: "renewed-acc", refresh: "renewed-ref" });
      }
      const bearer = new Headers(init.headers).get("authorization");
      return bearer === "Bearer renewed-acc"
        ? Response.json({ access: "next-acc", refresh: "next-ref" })
        : Response.json({ detail: "Invalid or expired token." }, { status: 401 });
    });

    const response = await POST(
      incoming("/api/me/devices/sign-out-others/", { method: "POST", body: "{}", tokens }),
    );

    expect(response.status).toBe(200);
    expect(sent).toHaveLength(3);
    expect(cookieTokens(response)?.access).toBe("next-acc");
  });

  it("keeps the refreshed tokens when the retried change is refused", async () => {
    const tokens = newTokens();
    fakeBackend((url, init) => {
      if (url.endsWith("/auth/refresh/")) {
        return Response.json({ access: "renewed-acc", refresh: "renewed-ref" });
      }
      const bearer = new Headers(init.headers).get("authorization");
      return bearer === "Bearer renewed-acc"
        ? Response.json({ detail: "No." }, { status: 400 })
        : Response.json({ detail: "Invalid or expired token." }, { status: 401 });
    });

    const response = await POST(
      incoming("/api/me/password/", { method: "POST", body: "{}", tokens }),
    );

    expect(response.status).toBe(400);
    expect(cookieTokens(response)?.access).toBe("renewed-acc");
  });

  it("logs the person out when the refresh is refused", async () => {
    fakeBackend(() => Response.json({}, { status: 401 }));

    const response = await POST(
      incoming("/api/me/password/", { method: "POST", body: "{}", tokens: newTokens() }),
    );

    expect(response.status).toBe(401);
    expect(clearsTheCookie(response)).toBe(true);
  });

  it("treats a success without proper tokens as a failure and keeps the login", async () => {
    fakeBackend(() => Response.json({ access: "only-one" }));

    const response = await POST(
      incoming("/api/me/password/", { method: "POST", body: "{}", tokens: newTokens() }),
    );

    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("is refused from another site before Django is asked", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming("/api/me/password/", {
        method: "POST",
        body: "{}",
        tokens: newTokens(),
        origin: "https://evil.example",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("keeps the refreshed tokens when Django can't be reached for the retry", async () => {
    let calls = 0;
    const fetchFn = vi.fn((url: string) => {
      calls += 1;
      if (url.endsWith("/auth/refresh/")) {
        return Promise.resolve(Response.json({ access: "renewed-acc", refresh: "renewed-ref" }));
      }
      return calls === 1
        ? Promise.resolve(Response.json({}, { status: 401 }))
        : Promise.reject(new TypeError("fetch failed"));
    });
    vi.stubGlobal("fetch", fetchFn);

    const response = await POST(
      incoming("/api/me/password/", { method: "POST", body: "{}", tokens: newTokens() }),
    );

    expect(response.status).toBe(502);
    expect(cookieTokens(response)?.access).toBe("renewed-acc");
  });
});

describe("the Platform Admin's Account page (issue 59)", () => {
  it.each([
    ["/api/platform/me/", "PATCH"],
    ["/api/platform/me/password/", "POST"],
  ])(
    "%s %s keeps the new Platform tokens and hides them from the browser",
    async (path, method) => {
      const tokens = newTokens("platform");
      const admin = { id: 1, name: "Ramesh", email: "a@platform.test" };
      const { sent } = fakeBackend(() =>
        Response.json({ access: "next-acc", refresh: "next-ref", platform_admin: admin }),
      );
      const handler = method === "PATCH" ? PATCH : POST;

      const response = await handler(incoming(path, { method, body: "{}", tokens }));
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(headersOf(sent[0]).get("authorization")).toBe(`Bearer ${tokens.access}`);
      expect(JSON.parse(text)).toEqual({ platform_admin: admin });
      expect(text).not.toContain("next-acc");
      expect(text).not.toContain("next-ref");
      expect(cookieTokens(response)).toEqual({
        access: "next-acc",
        refresh: "next-ref",
        scope: "platform",
      });
    },
  );

  it("relays GET /api/platform/me/ as an ordinary logged-in call", async () => {
    const tokens = newTokens("platform");
    const admin = { platform_admin: { id: 1, name: "Ramesh", email: "a@platform.test" } };
    fakeBackend(() => Response.json(admin));

    const response = await GET(incoming("/api/platform/me/", { tokens }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(admin);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("passes a refused change back and keeps the login as it was", async () => {
    fakeBackend(() =>
      Response.json({ current_password: ["That isn't your current password."] }, { status: 400 }),
    );

    const response = await PATCH(
      incoming("/api/platform/me/", { method: "PATCH", body: "{}", tokens: newTokens("platform") }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("is refused from another site before Django is asked", async () => {
    const { fetchFn } = fakeBackend();

    const response = await PATCH(
      incoming("/api/platform/me/", {
        method: "PATCH",
        body: "{}",
        tokens: newTokens("platform"),
        origin: "https://evil.example",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("two-step login (issue 61)", () => {
  const CHALLENGE = "eyJjIjoic2lnbmVkIn0:1vXyZq:signature-from-django";

  /** The challenge in the two-step cookie the response sets, or null. */
  function cookieChallenge(response: Response): string | null {
    const value = challengeCookieValue(response);
    return openChallenge(value, { key: COOKIE_KEY, host: BROWSER_HOST })?.challenge ?? null;
  }

  function challengeCookieValue(response: Response): string {
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("crm_2fa="));
    return cookie?.split(";")[0]?.slice("crm_2fa=".length) ?? "";
  }

  function clearsTheChallenge(response: Response): boolean {
    return response.headers.getSetCookie().some((value) => /^crm_2fa=;.*Max-Age=0/.test(value));
  }

  /** A browser call carrying the sealed two-step cookie for this host. */
  function withChallenge(path: string, body: unknown, challenge = CHALLENGE): Request {
    const sealed = sealChallenge(
      { challenge, scope: "platform" },
      { key: COOKIE_KEY, host: BROWSER_HOST },
    );
    return incoming(path, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { cookie: `crm_2fa=${sealed}`, "content-type": "application/json" },
    });
  }

  it("keeps the challenge from a login in its own sealed cookie, never in the answer", async () => {
    fakeBackend(() => Response.json({ two_factor: "verify", challenge: CHALLENGE }));

    const response = await POST(
      incoming("/api/platform/auth/login/", { method: "POST", body: "{}" }),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ two_factor: "verify" });
    expect(text).not.toContain(CHALLENGE);
    expect(cookieChallenge(response)).toBe(CHALLENGE);
    expect(cookieTokens(response)).toBeNull();
  });

  it("sets the challenge cookie HTTP-only, Secure, SameSite=Lax, for the API, for 5 minutes", async () => {
    fakeBackend(() => Response.json({ two_factor: "setup", challenge: CHALLENGE }));

    const response = await POST(
      incoming("/api/platform/auth/login/", { method: "POST", body: "{}" }),
    );

    const cookie = response.headers.getSetCookie().find((value) => value.startsWith("crm_2fa="));
    expect(cookie).toMatch(/; Path=\/api; Max-Age=300; HttpOnly; Secure; SameSite=Lax$/);
    expect(cookie).not.toMatch(/domain/i);
  });

  it("clears an older login's tokens when the second step is still to come", async () => {
    fakeBackend(() => Response.json({ two_factor: "setup", challenge: CHALLENGE }));

    const response = await POST(
      incoming("/api/platform/auth/login/", {
        method: "POST",
        body: "{}",
        tokens: newTokens("platform"),
      }),
    );

    expect(clearsTheCookie(response)).toBe(true);
  });

  it.each([
    { two_factor: "maybe", challenge: CHALLENGE },
    { two_factor: "verify", challenge: "" },
    { two_factor: "verify", challenge: "x".repeat(501) },
    { two_factor: "verify" },
  ])("treats a broken two-step answer as a failure (%j)", async (answer) => {
    fakeBackend(() => Response.json(answer));

    const response = await POST(
      incoming("/api/platform/auth/login/", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it.each(["/api/platform/auth/two-factor/confirm/", "/api/platform/auth/two-factor/verify/"])(
    "%s sends the cookie's challenge and keeps the tokens Django gives",
    async (path) => {
      const admin = { id: 1, name: "Ramesh", email: "a@platform.test" };
      const { sent } = fakeBackend(() =>
        Response.json({ access: "acc", refresh: "ref", platform_admin: admin }),
      );

      const response = await POST(withChallenge(path, { code: "123456" }));
      const text = await response.text();

      expect(JSON.parse(await bodyOf(sent[0]))).toEqual({ code: "123456", challenge: CHALLENGE });
      expect(headersOf(sent[0]).get("authorization")).toBeNull();
      expect(JSON.parse(text)).toEqual({ platform_admin: admin });
      expect(text).not.toContain("acc");
      expect(cookieTokens(response)).toEqual({ access: "acc", refresh: "ref", scope: "platform" });
      expect(clearsTheChallenge(response)).toBe(true);
    },
  );

  it("passes the recovery codes on to the browser once, without the tokens", async () => {
    const codes = ["abcd-efgh-jkmn"];
    fakeBackend(() =>
      Response.json({ access: "acc", refresh: "ref", platform_admin: {}, recovery_codes: codes }),
    );

    const response = await POST(
      withChallenge("/api/platform/auth/two-factor/confirm/", { code: "123456" }),
    );

    expect(await response.json()).toEqual({ platform_admin: {}, recovery_codes: codes });
  });

  it("sends the challenge for setup and relays the URI", async () => {
    const uri = "otpauth://totp/Consultancy%20CRM:a%40platform.test?secret=ABC&issuer=x";
    const { sent } = fakeBackend(() => Response.json({ uri }));

    const response = await POST(withChallenge("/api/platform/auth/two-factor/setup/", {}));

    expect(JSON.parse(await bodyOf(sent[0]))).toEqual({ challenge: CHALLENGE });
    expect(await response.json()).toEqual({ uri });
    expect(clearsTheChallenge(response)).toBe(false);
  });

  it("relays a wrong number and keeps the challenge for another try", async () => {
    fakeBackend(() => Response.json({ code: ["That number isn't right."] }, { status: 400 }));

    const response = await POST(
      withChallenge("/api/platform/auth/two-factor/verify/", { code: "000000" }),
    );

    expect(response.status).toBe(400);
    expect(cookieTokens(response)).toBeNull();
    expect(clearsTheChallenge(response)).toBe(false);
  });

  it("clears the challenge when Django says to start again", async () => {
    fakeBackend(() =>
      Response.json({ detail: "Log in again.", start_again: true }, { status: 400 }),
    );

    const response = await POST(
      withChallenge("/api/platform/auth/two-factor/verify/", { code: "000000" }),
    );

    expect(response.status).toBe(400);
    expect(clearsTheChallenge(response)).toBe(true);
  });

  it("answers start again without asking Django when there is no challenge cookie", async () => {
    const { fetchFn } = fakeBackend();

    const response = await POST(
      incoming("/api/platform/auth/two-factor/verify/", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ start_again: true });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never opens a challenge cookie sealed for another host", async () => {
    const { fetchFn } = fakeBackend();
    const sealed = sealChallenge(
      { challenge: CHALLENGE, scope: "platform" },
      { key: COOKIE_KEY, host: `${testHost("admin")}:8080` },
    );

    const response = await POST(
      incoming("/api/platform/auth/two-factor/verify/", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
        headers: { cookie: `crm_2fa=${sealed}` },
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each(["[1]", '"text"', "not json", '{"challenge": "mine", "code": "123456"}'])(
    "refuses a body that isn't an object of its own fields (%s)",
    async (body) => {
      const { fetchFn } = fakeBackend();
      const sealed = sealChallenge(
        { challenge: CHALLENGE, scope: "platform" },
        { key: COOKIE_KEY, host: BROWSER_HOST },
      );

      const response = await POST(
        incoming("/api/platform/auth/two-factor/verify/", {
          method: "POST",
          body,
          headers: { cookie: `crm_2fa=${sealed}` },
        }),
      );

      expect(response.status).toBe(400);
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it("refuses a second step from another site before Django is asked", async () => {
    const { fetchFn } = fakeBackend();
    const request = withChallenge("/api/platform/auth/two-factor/verify/", { code: "123456" });
    const headers = new Headers(request.headers);
    headers.set("origin", "https://evil.example");

    const response = await POST(
      new Request(request.url, { method: "POST", headers, body: '{"code":"123456"}' }),
    );

    expect(response.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never logs the challenge", async () => {
    fakeBackend(() => Response.json({ two_factor: "verify", challenge: CHALLENGE }));

    await POST(incoming("/api/platform/auth/login/", { method: "POST", body: "{}" }));
    await POST(withChallenge("/api/platform/auth/two-factor/verify/", { code: "123456" }));

    expect(JSON.stringify(logged())).not.toContain(CHALLENGE);
  });

  describe("the Security page", () => {
    it("switching on keeps the setup challenge and ends this login", async () => {
      fakeBackend(() => Response.json({ two_factor: "setup", challenge: CHALLENGE }));

      const response = await POST(
        incoming("/api/platform/me/two-factor/", {
          method: "POST",
          body: '{"action":"on"}',
          tokens: newTokens("platform"),
        }),
      );

      expect(await response.json()).toEqual({ two_factor: "setup" });
      expect(cookieChallenge(response)).toBe(CHALLENGE);
      expect(clearsTheCookie(response)).toBe(true);
    });

    it("switching off keeps this session's new tokens", async () => {
      const state = { required: false, set_up: false, recovery_codes_left: 0 };
      fakeBackend(() => Response.json({ access: "n-acc", refresh: "n-ref", two_factor: state }));

      const response = await POST(
        incoming("/api/platform/me/two-factor/", {
          method: "POST",
          body: "{}",
          tokens: newTokens("platform"),
        }),
      );

      expect(await response.json()).toEqual({ two_factor: state });
      expect(cookieTokens(response)?.access).toBe("n-acc");
    });

    it("new recovery codes are relayed as they are", async () => {
      const codes = { recovery_codes: ["abcd-efgh-jkmn"] };
      fakeBackend(() => Response.json(codes));

      const response = await POST(
        incoming("/api/platform/me/two-factor/", {
          method: "POST",
          body: "{}",
          tokens: newTokens("platform"),
        }),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(codes);
      expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("reading the state is an ordinary call", async () => {
      const state = { required: true, set_up: true, recovery_codes_left: 9 };
      fakeBackend(() => Response.json(state));

      const response = await GET(
        incoming("/api/platform/me/two-factor/", { tokens: newTokens("platform") }),
      );

      expect(await response.json()).toEqual(state);
    });
  });

  describe("Staff, on the office's address (issue 62)", () => {
    /** A browser call carrying a sealed two-step cookie of `scope` for this host. */
    function withScopedChallenge(path: string, body: unknown, scope: AuthTokens["scope"]) {
      const sealed = sealChallenge(
        { challenge: CHALLENGE, scope },
        { key: COOKIE_KEY, host: BROWSER_HOST },
      );
      return incoming(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { cookie: `crm_2fa=${sealed}`, "content-type": "application/json" },
      });
    }

    it.each(["/api/auth/login/", "/api/auth/join/complete/", "/api/auth/password-reset/complete/"])(
      "%s keeps the challenge in the sealed cookie, never in the answer",
      async (path) => {
        fakeBackend(() => Response.json({ two_factor: "setup", challenge: CHALLENGE }));

        const response = await POST(incoming(path, { method: "POST", body: "{}" }));
        const text = await response.text();

        expect(JSON.parse(text)).toEqual({ two_factor: "setup" });
        expect(text).not.toContain(CHALLENGE);
        expect(cookieChallenge(response)).toBe(CHALLENGE);
        expect(cookieTokens(response)).toBeNull();
      },
    );

    it.each(["/api/auth/two-factor/confirm/", "/api/auth/two-factor/verify/"])(
      "%s sends the cookie's challenge and keeps Staff tokens",
      async (path) => {
        const context = { staff: { id: 3 } };
        const { sent } = fakeBackend(() =>
          Response.json({ access: "acc", refresh: "ref", context }),
        );

        const response = await POST(withScopedChallenge(path, { code: "123456" }, "staff"));
        const text = await response.text();

        expect(JSON.parse(await bodyOf(sent[0]))).toEqual({ code: "123456", challenge: CHALLENGE });
        expect(headersOf(sent[0]).get("authorization")).toBeNull();
        expect(JSON.parse(text)).toEqual({ context });
        expect(text).not.toContain("acc");
        expect(cookieTokens(response)).toEqual({ access: "acc", refresh: "ref", scope: "staff" });
        expect(clearsTheChallenge(response)).toBe(true);
      },
    );

    it("never uses a Platform challenge for a Staff step", async () => {
      const { fetchFn } = fakeBackend();

      const response = await POST(
        withScopedChallenge("/api/auth/two-factor/verify/", { code: "123456" }, "platform"),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ start_again: true });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("never uses a Staff challenge for a Platform step", async () => {
      const { fetchFn } = fakeBackend();

      const response = await POST(
        withScopedChallenge("/api/platform/auth/two-factor/verify/", { code: "123456" }, "staff"),
      );

      expect(response.status).toBe(400);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it("My settings: switching on keeps the setup challenge and ends this login", async () => {
      fakeBackend(() => Response.json({ two_factor: "setup", challenge: CHALLENGE }));

      const response = await POST(
        incoming("/api/me/two-factor/", {
          method: "POST",
          body: '{"action":"on"}',
          tokens: newTokens("staff"),
        }),
      );

      expect(await response.json()).toEqual({ two_factor: "setup" });
      expect(cookieChallenge(response)).toBe(CHALLENGE);
      expect(clearsTheCookie(response)).toBe(true);
    });

    it("My settings: switching off keeps this device's new tokens", async () => {
      const state = {
        required: false,
        set_up: false,
        recovery_codes_left: 0,
        can_switch_off: false,
      };
      fakeBackend(() => Response.json({ access: "n-acc", refresh: "n-ref", two_factor: state }));

      const response = await POST(
        incoming("/api/me/two-factor/", { method: "POST", body: "{}", tokens: newTokens("staff") }),
      );

      expect(await response.json()).toEqual({ two_factor: state });
      expect(cookieTokens(response)).toEqual({ access: "n-acc", refresh: "n-ref", scope: "staff" });
    });

    it("an Admin's switch and reset on Employees are ordinary calls", async () => {
      const employee = { id: 4, two_factor_required: true };
      const { sent } = fakeBackend(() => Response.json(employee));

      const response = await POST(
        incoming("/api/staff/4/two-factor/reset/", {
          method: "POST",
          body: "{}",
          tokens: newTokens("staff"),
        }),
      );

      expect(await response.json()).toEqual(employee);
      expect(headersOf(sent[0]).get("authorization")).toMatch(/^Bearer access-/);
      expect(response.headers.getSetCookie()).toEqual([]);
    });
  });
});

describe("the Platform's forgot password (issue 63)", () => {
  const PLATFORM_HOST = `${testHost("admin")}:8080`;

  function resetCall(path: string, address: string): Request {
    return new Request(`http://${PLATFORM_HOST}${path}`, {
      method: "POST",
      headers: {
        host: PLATFORM_HOST,
        origin: `http://${PLATFORM_HOST}`,
        "content-type": "application/json",
        "cf-connecting-ip": address,
      },
      body: JSON.stringify({ email: "ops@platform.test" }),
    });
  }

  it("forwards its calls to Django until the address has used up its tries, then answers 429", async () => {
    const { sent } = fakeBackend(() => Response.json({ detail: "sent" }, { status: 202 }));
    const answers: number[] = [];

    for (let i = 0; i < 11; i += 1) {
      const response = await POST(resetCall("/api/platform/auth/password-reset/", "198.51.100.63"));
      answers.push(response.status);
    }

    expect(answers.slice(0, 10)).toEqual(Array.from({ length: 10 }, () => 202));
    expect(answers[10]).toBe(429);
    expect(sent).toHaveLength(10);
    expect(sent[0]?.url).toBe(`${BACKEND}/api/platform/auth/password-reset/`);
  });
});

describe("the browser a login comes from (issue 71)", () => {
  const CONTEXT = { staff: { id: 1 } };
  const CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
  const KNOWN_KEY = "0123456789abcdef0123456789abcdef";
  const KEY = /^[0-9a-f]{32}$/;

  function loginAnswer() {
    return fakeBackend(() => Response.json({ access: "acc", refresh: "ref", context: CONTEXT }));
  }

  function logInFrom(headers: Record<string, string>, path = "/api/auth/login/"): Request {
    return incoming(path, { method: "POST", body: "{}", headers });
  }

  function browserCookie(response: Response): string | undefined {
    return response.headers.getSetCookie().find((value) => value.startsWith("crm_browser="));
  }

  it("tells Django the browser's description and this server's value for the browser", async () => {
    const { sent } = loginAnswer();

    await POST(logInFrom({ "user-agent": CHROME }));

    expect(headersOf(sent[0]).get("x-browser-agent")).toBe(CHROME);
    expect(headersOf(sent[0]).get("x-browser-key")).toMatch(KEY);
  });

  it("keeps a new browser's value in an HTTP-only cookie the page can never read", async () => {
    const { sent } = loginAnswer();

    const response = await POST(logInFrom({ "user-agent": CHROME }));

    const cookie = browserCookie(response) ?? "";
    const key = headersOf(sent[0]).get("x-browser-key") ?? "missing";
    expect(cookie).toBe(
      `crm_browser=${key}; Path=/api; Max-Age=34560000; HttpOnly; Secure; SameSite=Lax`,
    );
    expect(await response.text()).not.toContain(key);
    expect(cookieTokens(response)).toEqual({ access: "acc", refresh: "ref", scope: "staff" });
  });

  it("sends the value a known browser already has and sets no new one", async () => {
    const { sent } = loginAnswer();

    const response = await POST(logInFrom({ cookie: `crm_browser=${KNOWN_KEY}` }));

    expect(headersOf(sent[0]).get("x-browser-key")).toBe(KNOWN_KEY);
    expect(browserCookie(response)).toBeUndefined();
  });

  it.each(["short", KNOWN_KEY.toUpperCase(), `${KNOWN_KEY}0`, "<script>alert(1)</script>", ""])(
    "replaces a cookie value it never made (%j)",
    async (value) => {
      const { sent } = loginAnswer();

      const response = await POST(logInFrom({ cookie: `crm_browser=${value}` }));

      const key = headersOf(sent[0]).get("x-browser-key") ?? "";
      expect(key).toMatch(KEY);
      expect(key).not.toBe(value);
      expect(browserCookie(response)).toContain(`crm_browser=${key};`);
    },
  );

  it("never passes on browser values the browser sent itself", async () => {
    const { sent } = loginAnswer();

    await POST(
      logInFrom({
        "x-browser-key": KNOWN_KEY,
        "x-browser-agent": "made up",
        "user-agent": CHROME,
      }),
    );

    expect(headersOf(sent[0]).get("x-browser-key")).not.toBe(KNOWN_KEY);
    expect(headersOf(sent[0]).get("x-browser-agent")).toBe(CHROME);
  });

  it("sends only the start of an over-long description, printable characters only", async () => {
    const { sent } = loginAnswer();

    await POST(logInFrom({ "user-agent": `Chrome/1 ${"x".repeat(2000)}` }));

    const agent = headersOf(sent[0]).get("x-browser-agent") ?? "";
    expect(agent).toHaveLength(512);
    expect(agent.startsWith("Chrome/1 ")).toBe(true);
  });

  it("sends no description when the browser gives none", async () => {
    const { sent } = loginAnswer();

    await POST(logInFrom({}));

    expect(headersOf(sent[0]).get("x-browser-agent")).toBeNull();
  });

  it("tells Django nothing about the browser on ordinary calls", async () => {
    const { sent } = fakeBackend();

    const response = await GET(
      incoming("/api/me/devices/", {
        tokens: newTokens(),
        headers: {
          "user-agent": CHROME,
          cookie: `crm_browser=${KNOWN_KEY}`,
          "x-browser-key": KNOWN_KEY,
        },
      }),
    );

    expect(headersOf(sent[0]).get("x-browser-key")).toBeNull();
    expect(headersOf(sent[0]).get("x-browser-agent")).toBeNull();
    expect(browserCookie(response)).toBeUndefined();
  });

  it("sets no browser cookie when the login is refused", async () => {
    fakeBackend(() => Response.json({ detail: "Invalid email or password." }, { status: 400 }));

    const response = await POST(logInFrom({ "user-agent": CHROME }));

    expect(browserCookie(response)).toBeUndefined();
  });

  it("keeps the value when two-step login comes next, and sends it with the second step", async () => {
    const { sent } = fakeBackend(() =>
      Response.json({ two_factor: "verify", challenge: "a-challenge" }),
    );

    const first = await POST(logInFrom({ "user-agent": CHROME }));
    const key = headersOf(sent[0]).get("x-browser-key") ?? "";
    expect(browserCookie(first)).toContain(`crm_browser=${key};`);

    const sealed = sealChallenge(
      { challenge: "a-challenge", scope: "staff" },
      { key: COOKIE_KEY, host: BROWSER_HOST },
    );
    await POST(
      incoming("/api/auth/two-factor/verify/", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
        headers: {
          cookie: `crm_2fa=${sealed}; crm_browser=${key}`,
          "content-type": "application/json",
          "user-agent": CHROME,
        },
      }),
    );

    expect(headersOf(sent[1]).get("x-browser-key")).toBe(key);
    expect(headersOf(sent[1]).get("x-browser-agent")).toBe(CHROME);
  });

  it.each(["/api/auth/join/complete/", "/api/auth/password-reset/complete/"])(
    "%s is a login too, so it names the browser",
    async (path) => {
      const { sent } = loginAnswer();

      await POST(logInFrom({ "user-agent": CHROME }, path));

      expect(headersOf(sent[0]).get("x-browser-agent")).toBe(CHROME);
      expect(headersOf(sent[0]).get("x-browser-key")).toMatch(KEY);
    },
  );

  it("never logs the browser's value or description", async () => {
    const { sent } = loginAnswer();

    await POST(logInFrom({ "user-agent": CHROME }));

    const key = headersOf(sent[0]).get("x-browser-key") ?? "missing";
    const text = JSON.stringify(logged());
    expect(text).not.toContain(key);
    expect(text).not.toContain("Chrome/130");
  });
});
