// @vitest-environment node
import { DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT } from "./route";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

const HOST = `${testHost("login")}:8080`;

beforeEach(() => {
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  vi.stubEnv("BACKEND_BASE_URL", "http://backend:8000");
  vi.stubEnv("INTERNAL_API_TOKEN", "a-test-internal-token-that-is-32-chars-or-more");
  vi.stubEnv("PRODUCT_DOMAIN", TEST_PRODUCT_DOMAIN);
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.alloc(32, 9).toString("base64"));
});

function lookup(): Request {
  return new Request(`http://${HOST}/api/central-login/`, {
    method: "POST",
    headers: {
      host: HOST,
      origin: `http://${HOST}`,
      "content-type": "application/json",
      "cf-connecting-ip": "192.0.2.44",
    },
    body: JSON.stringify({ email: "sita@example.com" }),
  });
}

describe("POST /api/central-login/", () => {
  it("forwards the lookup to Django", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ detail: "x" }, { status: 202 }));
    vi.stubGlobal("fetch", fetchFn);

    const response = await POST(lookup());

    expect(response.status).toBe(202);
    expect(fetchFn).toHaveBeenCalledWith(
      "http://backend:8000/api/central-login/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("answers 500 with a short message when the server is misconfigured", async () => {
    vi.stubEnv("INTERNAL_API_TOKEN", "short");

    const response = await POST(lookup());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ detail: "Something went wrong." });
  });

  it.each([
    ["GET", GET],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
    ["HEAD", HEAD],
    ["OPTIONS", OPTIONS],
  ])("refuses %s", (_, handler) => {
    expect(handler().status).toBe(405);
  });
});
