// @vitest-environment node
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from "./route";

const TOKEN = "a-test-internal-token-that-is-32-chars-or-more";
const BACKEND = "http://backend:8000";

beforeEach(() => {
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  vi.stubEnv("BACKEND_BASE_URL", BACKEND);
  vi.stubEnv("INTERNAL_API_TOKEN", TOKEN);
  vi.stubEnv("PRODUCT_DOMAIN", "crm.test");
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.from(new Uint8Array(32).fill(9)).toString("base64"));
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

describe("/healthz (ticket 14)", () => {
  it("is ok when Django's health check is", async () => {
    const fetchFn = backendAnswers(() => Promise.resolve(Response.json({ status: "ok" })));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(`${BACKEND}/api/health/`);
    expect(new Headers(init?.headers).get("x-internal-token")).toBe(TOKEN);
  });

  it.each([
    () => Promise.reject(new TypeError(`fetch failed: connect ECONNREFUSED ${BACKEND}`)),
    () => Promise.resolve(Response.json({ status: "unavailable" }, { status: 503 })),
    () => Promise.resolve(Response.json({ status: "something" })),
    () => Promise.resolve(new Response("<html>", { status: 200 })),
  ])("is unavailable when Django isn't, without saying why (%#)", async (answer) => {
    backendAnswers(answer);

    const response = await GET();
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(text)).toEqual({ status: "unavailable" });
    expect(text).not.toContain("backend");
  });

  it("gives up on a Django that doesn't answer within 3 seconds", async () => {
    vi.useFakeTimers();
    try {
      backendAnswers(() => new Promise<Response>(() => undefined));
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

      const pending = GET();
      await vi.advanceTimersByTimeAsync(3_000);
      const response = await pending;

      expect(response.status).toBe(503);
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
