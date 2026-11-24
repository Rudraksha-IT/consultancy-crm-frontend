// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";

import { askProductName, forgetProductName, getProductName } from "./productName";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const TOKEN = "a-test-internal-token-that-is-32-chars-or-more";
const BACKEND = "http://backend:8000";

beforeEach(() => {
  vi.stubEnv("BACKEND_BASE_URL", BACKEND);
  vi.stubEnv("INTERNAL_API_TOKEN", TOKEN);
  vi.stubEnv("PRODUCT_DOMAIN", TEST_PRODUCT_DOMAIN);
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.alloc(32, 9).toString("base64"));
  forgetProductName();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function djangoSays(...answers: (() => Response)[]) {
  let call = 0;
  const fetchFn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => {
    const answer = answers[Math.min(call, answers.length - 1)];
    call += 1;
    return answer === undefined
      ? Promise.reject(new Error("no answer"))
      : Promise.resolve(answer());
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

const named = (name: unknown) => () => Response.json({ logo: null, name });

describe("the product's name for every page (first live fixes, ticket 15)", () => {
  it("asks Django on the Platform's address with the internal token", async () => {
    const fetchFn = djangoSays(named("Acme Office Suite"));

    expect(await askProductName()).toBe("Acme Office Suite");

    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(`${BACKEND}/api/platform/brand/`);
    const headers = new Headers(init?.headers);
    expect(headers.get("x-forwarded-host")).toBe(testHost("admin"));
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("x-internal-token")).toBe(TOKEN);
  });

  it("is kept for a minute, so offices see a change within one", async () => {
    djangoSays(named("Acme Office Suite"));

    expect(await getProductName()).toBe("Acme Office Suite");

    expect(cacheLife).toHaveBeenCalledWith({ stale: 60, revalidate: 60, expire: 3600 });
    // Tagged, so a saved change drops it at once (list tidy-ups 05).
    expect(cacheTag).toHaveBeenCalledWith("product-name");
  });

  it("is the default before Django has ever said", async () => {
    djangoSays(() => new Response("down", { status: 503 }));

    expect(await askProductName()).toBe("Rudraksha CRM");
  });

  it("keeps the last name when Django can't say", async () => {
    djangoSays(named("Acme Office Suite"), () => new Response("down", { status: 503 }));

    await askProductName();

    expect(await askProductName()).toBe("Acme Office Suite");
  });

  it.each([
    ["no name", () => Response.json({ logo: null })],
    ["a blank name", named("   ")],
    ["a name too long", named("A".repeat(41))],
    ["a name that isn't text", named(42)],
    ["an answer that isn't JSON", () => new Response("<html>")],
  ])("ignores %s", async (_, answer) => {
    djangoSays(answer);

    expect(await askProductName()).toBe("Rudraksha CRM");
  });

  it("gives up after three seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        });
      }),
    );
    try {
      const name = askProductName();
      await vi.advanceTimersByTimeAsync(3_000);

      expect(await name).toBe("Rudraksha CRM");
    } finally {
      vi.useRealTimers();
    }
  });
});
