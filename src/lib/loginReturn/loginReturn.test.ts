import { loginAddress, safeNextPath } from "./loginReturn";

describe("safeNextPath", () => {
  it.each([
    "/students",
    "/students/12?ptab=docs",
    "/accounts/fees-by-type/3",
    "/platform/consultancies",
    "/students?q=sita%20rai&page=2",
  ])("keeps a path on this site (%s)", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    null,
    "",
    "students",
    "//evil.example",
    "//evil.example/students",
    "/\\evil.example",
    "\\\\evil.example",
    "https://evil.example/",
    "http://evil.example",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " /students",
    "/%2F%2Fevil.example",
    "/%2f/evil.example",
    "%2F%2Fevil.example",
    "/%5Cevil.example",
    "/students\nSet-Cookie: x=1",
    "/students\t",
    "/%0d%0aLocation:%20https://evil.example",
    "/%E0%A4%A",
    `/${"a".repeat(2000)}`,
  ])("drops %j", (value) => {
    expect(safeNextPath(value)).toBeNull();
  });
});

describe("loginAddress", () => {
  it("says the login ended and brings the person back to the page", () => {
    expect(loginAddress("/login", { next: "/students/12?ptab=docs", hasLoginEnded: true })).toBe(
      "/login?session=ended&next=%2Fstudents%2F12%3Fptab%3Ddocs",
    );
  });

  it("brings the person back without the message when they logged out themselves", () => {
    expect(
      loginAddress("/platform/login", { next: "/platform/admins", hasLoginEnded: false }),
    ).toBe("/platform/login?next=%2Fplatform%2Fadmins");
  });

  it("leaves out a page that isn't safe to come back to, or Home", () => {
    expect(loginAddress("/login", { next: "//evil.example", hasLoginEnded: true })).toBe(
      "/login?session=ended",
    );
    expect(loginAddress("/login", { next: "/", hasLoginEnded: false })).toBe("/login");
  });

  it("never brings the person back to a login page", () => {
    expect(loginAddress("/login", { next: "/login?next=%2Fstudents", hasLoginEnded: true })).toBe(
      "/login?session=ended",
    );
  });
});
