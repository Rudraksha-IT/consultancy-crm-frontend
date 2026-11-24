// @vitest-environment node
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from "./route";
import * as versionRoute from "./[version]/route";
import { readFileSync } from "node:fs";

import { APP_LOGO_URL } from "@/lib/brand/appLogo";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

const TOKEN = "a-test-internal-token-that-is-32-chars-or-more";
const BACKEND = "http://backend:8000";
const SHORT_CACHE = "public, max-age=300";
const LONG_CACHE = "public, max-age=31536000, immutable";
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

beforeEach(() => {
  vi.stubEnv("BACKEND_BASE_URL", BACKEND);
  vi.stubEnv("INTERNAL_API_TOKEN", TOKEN);
  vi.stubEnv("PRODUCT_DOMAIN", TEST_PRODUCT_DOMAIN);
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.alloc(32, 9).toString("base64"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function backendAnswers(answer: () => Promise<Response>) {
  const fetchFn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => answer());
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

/** A tab icon request on any address: an office's, the Platform's or the Central login's. */
function iconRequest(path: string, subdomain = "acme"): Request {
  return new Request(`https://${testHost(subdomain)}${path}`);
}

function versionRequest(version: string) {
  return versionRoute.GET(iconRequest(`/tab-icon/${version}`), {
    params: Promise.resolve({ version }),
  });
}

/** The app's own logo (ticket 07): the file kept in the app, at the address the build gives it. */
function expectAppLogo(response: Response) {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(APP_LOGO_URL);
  expect(response.headers.get("cache-control")).toBe(SHORT_CACHE);
}

describe("the app's own logo (first live fixes, ticket 07)", () => {
  it("is the SVG kept in the app's code, at an address of this server", () => {
    expect(APP_LOGO_URL).toMatch(/^\/[^/]/);
    expect(APP_LOGO_URL).toContain("app-logo");
    const file = readFileSync("src/assets/brand/app-logo.svg", "utf8");
    expect(file).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(file).not.toMatch(/<script|on[a-z]+=|href=|<foreignObject|<image/i);
  });

  it("draws like the loader: its reds and its longer lines (list tidy-ups 29)", () => {
    const file = readFileSync("src/assets/brand/app-logo.svg", "utf8");
    expect(file).toMatch(/\.mark\{stroke:#c8102e\}/);
    expect(file).toMatch(/prefers-color-scheme: dark\)\{\.mark\{stroke:#ff5263\}/);
    expect(file).toContain("M18 0L117 0");
    expect(file).not.toMatch(/8B0A1A|F49AA3/i);
    // Lines 0.75 times the petals' width, so they show at a tab's 16 px (list tidy-ups 29).
    expect(file).toMatch(/stroke-width="7.5"[^>]*d="M18 0L117 0/);
    // All 8 lines, the top ones too.
    expect(/stroke-width="7.5" d="([^"]*)"/.exec(file)?.[1]?.match(/M/g)).toHaveLength(8);
  });
});

describe("/tab-icon (first live fixes, ticket 05)", () => {
  it.each(["acme", "admin", "login"])(
    "sends %s's tab to the product logo's version, asking Django on the Platform's address",
    async (subdomain) => {
      const fetchFn = backendAnswers(() =>
        Promise.resolve(Response.json({ logo: { url: "/api/platform/brand/logo/7/" } })),
      );

      const response = await GET(iconRequest("/tab-icon", subdomain));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("/tab-icon/7");
      expect(response.headers.get("cache-control")).toBe(SHORT_CACHE);
      const [url, init] = fetchFn.mock.calls[0] ?? [];
      expect(url).toBe(`${BACKEND}/api/platform/brand/`);
      const headers = new Headers(init?.headers);
      expect(headers.get("x-internal-token")).toBe(TOKEN);
      expect(headers.get("x-forwarded-host")).toBe(testHost("admin"));
      expect(headers.get("x-forwarded-proto")).toBe("https");
      expect(headers.get("authorization")).toBeNull();
    },
  );

  it("shows the app's own logo while no uploaded logo is in use", async () => {
    backendAnswers(() => Promise.resolve(Response.json({ logo: null })));

    expectAppLogo(await GET(iconRequest("/tab-icon")));
  });

  it.each([
    () => Promise.reject(new TypeError(`fetch failed: connect ECONNREFUSED ${BACKEND}`)),
    () => Promise.resolve(Response.json({ detail: "Not found." }, { status: 404 })),
    () =>
      Promise.resolve(
        Response.json({ logo: { url: "/api/platform/brand/logo/7/" } }, { status: 500 }),
      ),
    () => Promise.resolve(new Response("<html>", { status: 200 })),
    () => Promise.resolve(Response.json({ logo: { url: "https://elsewhere.test/logo.png" } })),
    () => Promise.resolve(Response.json({ logo: { url: "/api/platform/brand/logo/7/../../x/" } })),
    () => Promise.resolve(Response.json({ logo: "<script>" })),
  ])(
    "shows the app's own logo when Django can't be reached or answers oddly (%#)",
    async (answer) => {
      backendAnswers(answer);

      expectAppLogo(await GET(iconRequest("/tab-icon")));
    },
  );

  it("gives up on a Django that doesn't answer within 3 seconds", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
              init.signal?.addEventListener("abort", () => {
                reject(new DOMException("aborted", "AbortError"));
              });
            }),
        ),
      );

      const pending = GET(iconRequest("/tab-icon"));
      await vi.advanceTimersByTimeAsync(3_000);

      expectAppLogo(await pending);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
    ["HEAD", HEAD],
    ["OPTIONS", OPTIONS],
  ])("allows only GET (%s)", (_method, handler) => {
    const response = handler();

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });
});

describe("/tab-icon/<version> (first live fixes, ticket 05)", () => {
  it("gives the product logo with its own type, kept for a year since its address changes with it", async () => {
    const fetchFn = backendAnswers(() =>
      Promise.resolve(new Response(PNG_BYTES, { headers: { "content-type": "image/png" } })),
    );

    const response = await versionRequest("7");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe(LONG_CACHE);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG_BYTES);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(`${BACKEND}/api/platform/brand/logo/7/`);
    const headers = new Headers(init?.headers);
    expect(headers.get("x-internal-token")).toBe(TOKEN);
    expect(headers.get("x-forwarded-host")).toBe(testHost("admin"));
  });

  it.each(["image/svg+xml", "image/jpeg", "image/webp", "image/svg+xml; charset=utf-8"])(
    "passes on a logo of an allowed type (%s)",
    async (type) => {
      backendAnswers(() =>
        Promise.resolve(new Response(PNG_BYTES, { headers: { "content-type": type } })),
      );

      const response = await versionRequest("3");

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(type.split(";")[0]);
    },
  );

  it.each(["text/html", "application/json", "image/gif", "", "image/png-but-not"])(
    "never passes on anything that isn't an allowed image (%s)",
    async (type) => {
      backendAnswers(() =>
        Promise.resolve(
          new Response("<script>alert(1)</script>", { headers: { "content-type": type } }),
        ),
      );

      expectAppLogo(await versionRequest("3"));
    },
  );

  it("never passes on a file over 1 MB", async () => {
    backendAnswers(() =>
      Promise.resolve(
        new Response(new Uint8Array(1024 * 1024 + 1), { headers: { "content-type": "image/png" } }),
      ),
    );

    expectAppLogo(await versionRequest("3"));
  });

  it.each([
    () => Promise.reject(new TypeError("fetch failed")),
    () => Promise.resolve(Response.json({ detail: "Not found." }, { status: 404 })),
    () => Promise.resolve(new Response(PNG_BYTES, { status: 302, headers: { location: "/x" } })),
  ])(
    "shows the app's own logo, briefly cached, for an old version or a failure (%#)",
    async (answer) => {
      backendAnswers(answer);

      expectAppLogo(await versionRequest("3"));
    },
  );

  it.each(["abc", "-1", "7.0", "12345678901", "../health", "%2e%2e", ""])(
    "never asks Django for a version that isn't a plain number (%s)",
    async (version) => {
      const fetchFn = backendAnswers(() => Promise.resolve(new Response(PNG_BYTES)));

      expectAppLogo(await versionRequest(version));
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );

  it.each(["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const)(
    "allows only GET (%s)",
    (method) => {
      const response = versionRoute[method]();

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
    },
  );
});
