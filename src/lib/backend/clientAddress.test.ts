// @vitest-environment node
import { clientAddressFor, readClientAddress } from "./clientAddress";

function headersWith(value: string | null): Headers {
  const headers = new Headers();
  if (value !== null) headers.set("CF-Connecting-IP", value);
  return headers;
}

describe("readClientAddress", () => {
  it.each(["203.0.113.7", "2001:db8::1", " 198.51.100.4 "])("reads %j from Cloudflare", (value) => {
    expect(readClientAddress(headersWith(value))).toBe(value.trim());
  });

  it.each([
    null,
    "",
    "not-an-ip",
    "203.0.113.7, 10.0.0.1",
    "999.1.1.1",
    "01.2.3.4",
    "<script>",
    "fe80::1%eth0",
    "2001:db8::1%25x",
    "203.0.113.7:443",
    "'; DROP TABLE x; --",
  ])("gives null for a missing or malformed %j", (value) => {
    expect(readClientAddress(headersWith(value))).toBeNull();
  });

  it("never reads X-Forwarded-For or X-Client-IP", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7", "x-client-ip": "203.0.113.8" });

    expect(readClientAddress(headers)).toBeNull();
  });
});

describe("clientAddressFor", () => {
  it("reads Cloudflare's header behind Cloudflare", () => {
    expect(clientAddressFor(headersWith("203.0.113.7"), { source: "cloudflare" })).toBe(
      "203.0.113.7",
    );
  });

  it("gives null behind Cloudflare when the header is missing or malformed", () => {
    expect(clientAddressFor(headersWith(null), { source: "cloudflare" })).toBeNull();
    expect(clientAddressFor(headersWith("nope"), { source: "cloudflare" })).toBeNull();
  });

  it("gives the configured address in local mode, whatever the browser sent", () => {
    const local = { source: "local", address: "198.51.100.9" } as const;

    expect(clientAddressFor(headersWith("203.0.113.7"), local)).toBe("198.51.100.9");
    expect(clientAddressFor(headersWith(null), local)).toBe("198.51.100.9");
  });
});
