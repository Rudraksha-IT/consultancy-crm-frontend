// @vitest-environment node
import { getServerConfig, parseServerConfig, ServerConfigError } from "./serverConfig";
import { TEST_PRODUCT_DOMAIN } from "@/test/hosts";

const TOKEN = "a-test-internal-token-that-is-32-chars-or-more";
const COOKIE_KEY = Buffer.alloc(32, 7);
const COOKIE_KEY_BASE64 = COOKIE_KEY.toString("base64");
const VALID_ENV = {
  BACKEND_BASE_URL: "http://backend:8000",
  INTERNAL_API_TOKEN: TOKEN,
  PRODUCT_DOMAIN: TEST_PRODUCT_DOMAIN,
  AUTH_COOKIE_KEY: COOKIE_KEY_BASE64,
};

function problemWith(env: Record<string, string | undefined>): ServerConfigError {
  try {
    parseServerConfig(env);
  } catch (error) {
    if (error instanceof ServerConfigError) return error;
    throw error;
  }
  throw new Error("expected the config to be refused");
}

describe("parseServerConfig", () => {
  it("reads the backend address, internal token, product domain and cookie settings", () => {
    expect(parseServerConfig(VALID_ENV)).toEqual({
      backendOrigin: "http://backend:8000",
      internalApiToken: TOKEN,
      productDomain: TEST_PRODUCT_DOMAIN,
      centralLoginSubdomain: "login",
      platformSubdomain: "admin",
      authCookie: { key: new Uint8Array(COOKIE_KEY), isSecure: true },
      clientAddress: { source: "cloudflare" },
    });
  });

  it("takes the client address from Cloudflare unless told otherwise", () => {
    const config = parseServerConfig({ ...VALID_ENV, CLIENT_IP_SOURCE: "cloudflare" });

    expect(config.clientAddress).toEqual({ source: "cloudflare" });
  });

  it("sends 127.0.0.1 in local mode by default", () => {
    const config = parseServerConfig({ ...VALID_ENV, CLIENT_IP_SOURCE: "local" });

    expect(config.clientAddress).toEqual({ source: "local", address: "127.0.0.1" });
  });

  it.each(["203.0.113.7", "2001:db8::1"])("sends DEV_CLIENT_IP=%s in local mode", (address) => {
    const config = parseServerConfig({
      ...VALID_ENV,
      CLIENT_IP_SOURCE: "local",
      DEV_CLIENT_IP: address,
      NODE_ENV: "development",
    });

    expect(config.clientAddress).toEqual({ source: "local", address });
  });

  it("refuses local mode when NODE_ENV is production", () => {
    const error = problemWith({ ...VALID_ENV, CLIENT_IP_SOURCE: "local", NODE_ENV: "production" });

    expect(error.message).toContain("CLIENT_IP_SOURCE");
  });

  it("allows the Cloudflare source in production", () => {
    const config = parseServerConfig({ ...VALID_ENV, NODE_ENV: "production" });

    expect(config.clientAddress).toEqual({ source: "cloudflare" });
  });

  it.each(["", "Cloudflare", "browser", "local "])("refuses CLIENT_IP_SOURCE=%j", (value) => {
    expect(problemWith({ ...VALID_ENV, CLIENT_IP_SOURCE: value }).message).toContain(
      "CLIENT_IP_SOURCE",
    );
  });

  it.each(["", "localhost", "999.1.1.1", "fe80::1%eth0", "<script>", "1.2.3.4/24"])(
    "refuses DEV_CLIENT_IP=%j",
    (value) => {
      const error = problemWith({ ...VALID_ENV, CLIENT_IP_SOURCE: "local", DEV_CLIENT_IP: value });

      expect(error.message).toContain("DEV_CLIENT_IP");
    },
  );

  it("reads the Platform's subdomain, admin unless set", () => {
    expect(parseServerConfig(VALID_ENV).platformSubdomain).toBe("admin");
    expect(
      parseServerConfig({ ...VALID_ENV, PLATFORM_SUBDOMAIN: "console" }).platformSubdomain,
    ).toBe("console");
  });

  it.each(["", "Admin", "ad.min", "-admin"])("refuses PLATFORM_SUBDOMAIN=%j", (value) => {
    expect(problemWith({ ...VALID_ENV, PLATFORM_SUBDOMAIN: value }).message).toContain(
      "PLATFORM_SUBDOMAIN",
    );
  });

  it("reads the Central login's subdomain", () => {
    const config = parseServerConfig({ ...VALID_ENV, CENTRAL_LOGIN_SUBDOMAIN: "find" });

    expect(config.centralLoginSubdomain).toBe("find");
  });

  it.each(["", "Login", "log.in", "-login", "login-"])(
    "refuses CENTRAL_LOGIN_SUBDOMAIN=%j",
    (value) => {
      expect(problemWith({ ...VALID_ENV, CENTRAL_LOGIN_SUBDOMAIN: value }).message).toContain(
        "CENTRAL_LOGIN_SUBDOMAIN",
      );
    },
  );

  it.each([
    ["false", false],
    ["true", true],
  ])("reads AUTH_COOKIE_SECURE=%s", (value, isSecure) => {
    const config = parseServerConfig({ ...VALID_ENV, AUTH_COOKIE_SECURE: value });

    expect(config.authCookie.isSecure).toBe(isSecure);
  });

  it.each(["no", "0", "TRUE ", "yes"])("refuses AUTH_COOKIE_SECURE=%j", (value) => {
    expect(problemWith({ ...VALID_ENV, AUTH_COOKIE_SECURE: value }).message).toContain(
      "AUTH_COOKIE_SECURE",
    );
  });

  it.each([
    "",
    Buffer.alloc(31).toString("base64"),
    Buffer.alloc(33).toString("base64"),
    "not base64 at all!!",
    "x".repeat(44),
  ])("refuses a cookie key that isn't 32 bytes of base64 (%j), without printing it", (key) => {
    const error = problemWith({ ...VALID_ENV, AUTH_COOKIE_KEY: key });

    expect(error.message).toContain("AUTH_COOKIE_KEY");
    if (key !== "") expect(error.message).not.toContain(key);
  });

  it("accepts a backend address with a trailing slash and https", () => {
    const config = parseServerConfig({ ...VALID_ENV, BACKEND_BASE_URL: "https://10.0.1.5:8443/" });

    expect(config.backendOrigin).toBe("https://10.0.1.5:8443");
  });

  it.each(["BACKEND_BASE_URL", "INTERNAL_API_TOKEN", "PRODUCT_DOMAIN", "AUTH_COOKIE_KEY"])(
    "refuses a missing %s, naming it",
    (name) => {
      const error = problemWith({ ...VALID_ENV, [name]: undefined });

      expect(error.message).toContain(name);
    },
  );

  it("refuses an internal token shorter than 32 characters without printing it", () => {
    const shortToken = "x".repeat(31);

    const error = problemWith({ ...VALID_ENV, INTERNAL_API_TOKEN: shortToken });

    expect(error.message).toContain("INTERNAL_API_TOKEN");
    expect(error.message).not.toContain(shortToken);
  });

  it("never puts the token in the error, even when something else is wrong", () => {
    const error = problemWith({ ...VALID_ENV, PRODUCT_DOMAIN: "" });

    expect(error.message).not.toContain(TOKEN);
  });

  it.each([
    "not a url",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://backend:8000/api/",
    "http://backend:8000/?next=evil",
    "http://user:secret@backend:8000",
    "http://backend:8000/#x",
  ])("refuses a backend address that isn't a plain http(s) origin: %s", (address) => {
    expect(problemWith({ ...VALID_ENV, BACKEND_BASE_URL: address }).message).toContain(
      "BACKEND_BASE_URL",
    );
  });

  it.each(["localhost", "crm.localhost", "crm.example.com"])(
    "accepts the product domain %j (plain localhost for the local stack)",
    (domain) => {
      expect(parseServerConfig({ ...VALID_ENV, PRODUCT_DOMAIN: domain }).productDomain).toBe(
        domain,
      );
    },
  );

  it.each([
    "",
    "*",
    "crm.localhost/x",
    ".crm.localhost",
    "crm localhost",
    "<script>.com",
    "com",
    "example",
    "Localhost",
  ])("refuses a product domain that isn't a host name: %j", (domain) => {
    expect(problemWith({ ...VALID_ENV, PRODUCT_DOMAIN: domain }).message).toContain(
      "PRODUCT_DOMAIN",
    );
  });
});

describe("getServerConfig", () => {
  it("reads the server's environment", () => {
    vi.stubEnv("BACKEND_BASE_URL", VALID_ENV.BACKEND_BASE_URL);
    vi.stubEnv("INTERNAL_API_TOKEN", TOKEN);
    vi.stubEnv("PRODUCT_DOMAIN", VALID_ENV.PRODUCT_DOMAIN);
    vi.stubEnv("AUTH_COOKIE_KEY", COOKIE_KEY_BASE64);

    expect(getServerConfig().backendOrigin).toBe("http://backend:8000");
  });

  it("fails when the environment is incomplete", () => {
    vi.stubEnv("BACKEND_BASE_URL", VALID_ENV.BACKEND_BASE_URL);
    vi.stubEnv("INTERNAL_API_TOKEN", "");
    vi.stubEnv("PRODUCT_DOMAIN", VALID_ENV.PRODUCT_DOMAIN);

    expect(() => getServerConfig()).toThrow(ServerConfigError);
  });
});
