import { emailFromAddress } from "./prefill";

describe("emailFromAddress", () => {
  it("returns an email from the link", () => {
    expect(emailFromAddress("sita@example.com")).toBe("sita@example.com");
  });

  it("trims spaces", () => {
    expect(emailFromAddress(" sita@example.com ")).toBe("sita@example.com");
  });

  it.each([
    null,
    "",
    "not-an-email",
    "<script>alert(1)</script>@example.com",
    "a@b.com\nBcc: x@y.com",
    `${"a".repeat(250)}@example.com`,
  ])("gives nothing for %j", (value) => {
    expect(emailFromAddress(value)).toBe("");
  });
});
