import { uid } from "@/test/ids";
import { routeForCentralLogin, routeForPlatformHost } from "./routing";
import { TEST_PRODUCT_DOMAIN, testHost } from "@/test/hosts";

const HOSTS = { productDomain: TEST_PRODUCT_DOMAIN, centralLoginSubdomain: "login" };

describe("routeForCentralLogin", () => {
  it.each(["/", "/login", `/students/${uid(1)}`, "/platform"])(
    "shows the Central login at %s on its own address",
    (path) => {
      expect(routeForCentralLogin(`${testHost("login")}:8080`, path, HOSTS)).toBe("show");
    },
  );

  it("serves its own screen on its own address as usual", () => {
    expect(routeForCentralLogin(`LOGIN.${TEST_PRODUCT_DOMAIN}`, "/central-login", HOSTS)).toBe(
      "pass",
    );
  });

  it("sends an office's address to its own login instead", () => {
    expect(routeForCentralLogin(testHost("acme"), "/central-login", HOSTS)).toBe("toLogin");
  });

  it.each([
    [testHost("acme"), "/"],
    [`${testHost("admin")}:8080`, "/platform"],
    [null, "/"],
    [`${testHost("login")}.evil.com`, "/"],
  ])("leaves %s %s alone", (host, path) => {
    expect(routeForCentralLogin(host, path, HOSTS)).toBe("pass");
  });

  it("follows a configured subdomain", () => {
    const hosts = { ...HOSTS, centralLoginSubdomain: "find" };

    expect(routeForCentralLogin(testHost("find"), "/", hosts)).toBe("show");
    expect(routeForCentralLogin(testHost("login"), "/", hosts)).toBe("pass");
  });
});

describe("routeForPlatformHost", () => {
  const PLATFORM = { productDomain: TEST_PRODUCT_DOMAIN, platformSubdomain: "admin" };

  it.each(["/", "/login", "/students", "/forgot-password", "/platformx"])(
    "sends %s on the Platform's address to the Platform",
    (path) => {
      expect(routeForPlatformHost(`${testHost("admin")}:8080`, path, PLATFORM)).toBe("toPlatform");
    },
  );

  it.each(["/platform", "/platform/login", "/platform/forgot-password", "/platform/account"])(
    "serves %s on the Platform's address as usual",
    (path) => {
      expect(routeForPlatformHost(testHost("admin"), path, PLATFORM)).toBe("pass");
    },
  );

  it.each([testHost("acme"), testHost("login"), `${testHost("admin")}.evil.com`, null])(
    "leaves other addresses alone: %s",
    (host) => {
      expect(routeForPlatformHost(host, "/", PLATFORM)).toBe("pass");
    },
  );

  // Ticket 14: the Platform's pages open only on its own address.
  it.each(["/platform", "/platform/", "/platform/login", "/platform/consultancies/x"])(
    "has no %s on an office's address",
    (path) => {
      expect(routeForPlatformHost(`${testHost("polar")}:8080`, path, PLATFORM)).toBe("notFound");
    },
  );

  it.each([
    testHost("ACME").toUpperCase(),
    `${testHost("admin")}.evil.com`,
    `evil.${testHost("admin")}`,
    "localhost:3000",
    null,
  ])("has no Platform on %s", (host) => {
    expect(routeForPlatformHost(host, "/platform", PLATFORM)).toBe("notFound");
  });

  it("serves the Platform on its own address in any letter case", () => {
    expect(routeForPlatformHost(testHost("ADMIN").toUpperCase(), "/platform", PLATFORM)).toBe(
      "pass",
    );
  });

  it("leaves office pages that only start with platform alone", () => {
    expect(routeForPlatformHost(testHost("acme"), "/platformx", PLATFORM)).toBe("pass");
  });

  it("follows a configured subdomain", () => {
    const hosts = { ...PLATFORM, platformSubdomain: "console" };

    expect(routeForPlatformHost(testHost("console"), "/", hosts)).toBe("toPlatform");
    expect(routeForPlatformHost(testHost("admin"), "/", hosts)).toBe("pass");
  });
});
