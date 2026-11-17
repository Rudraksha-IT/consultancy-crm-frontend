// @vitest-environment node
import { exitUnlessServerConfigured } from "./startupCheck";
import { TEST_PRODUCT_DOMAIN } from "@/test/hosts";

function stubServerEnv(token: string): void {
  vi.stubEnv("BACKEND_BASE_URL", "http://backend:8000");
  vi.stubEnv("INTERNAL_API_TOKEN", token);
  vi.stubEnv("PRODUCT_DOMAIN", TEST_PRODUCT_DOMAIN);
  vi.stubEnv("AUTH_COOKIE_KEY", Buffer.alloc(32, 1).toString("base64"));
}

describe("exitUnlessServerConfigured", () => {
  it("stops the server without valid settings, naming them but not their values", () => {
    stubServerEnv("too-short");
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exited");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    expect(() => {
      exitUnlessServerConfigured();
    }).toThrow("exited");

    expect(exit).toHaveBeenCalledWith(1);
    const printed = stderr.mock.calls.map(([text]) => String(text)).join("");
    expect(printed).toContain("INTERNAL_API_TOKEN");
    expect(printed).not.toContain("too-short");
  });

  it("stops the server with an invalid LOG_LEVEL", () => {
    stubServerEnv("x".repeat(32));
    vi.stubEnv("LOG_LEVEL", "verbose");
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exited");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    expect(() => {
      exitUnlessServerConfigured();
    }).toThrow("exited");

    expect(exit).toHaveBeenCalledWith(1);
    expect(stderr.mock.calls.map(([text]) => String(text)).join("")).toContain("LOG_LEVEL");
  });

  it("stops the server in local client-address mode in production", () => {
    stubServerEnv("x".repeat(32));
    vi.stubEnv("CLIENT_IP_SOURCE", "local");
    vi.stubEnv("NODE_ENV", "production");
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exited");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    expect(() => {
      exitUnlessServerConfigured();
    }).toThrow("exited");

    expect(exit).toHaveBeenCalledWith(1);
    expect(stderr.mock.calls.map(([text]) => String(text)).join("")).toContain("CLIENT_IP_SOURCE");
  });

  it("lets the server start with valid settings", () => {
    stubServerEnv("x".repeat(32));
    const exit = vi.spyOn(process, "exit");

    exitUnlessServerConfigured();

    expect(exit).not.toHaveBeenCalled();
  });

  it("passes on any other error unchanged", async () => {
    vi.resetModules();
    vi.doMock("./serverConfig", async (importOriginal) => ({
      ...(await importOriginal<typeof import("./serverConfig")>()),
      getServerConfig: () => {
        throw new Error("unexpected");
      },
    }));
    try {
      const { exitUnlessServerConfigured: check } = await import("./startupCheck");

      expect(() => {
        check();
      }).toThrow("unexpected");
    } finally {
      vi.doUnmock("./serverConfig");
    }
  });
});
