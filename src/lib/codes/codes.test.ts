import { isCompleteCode, normaliseCode } from "./codes";

describe("normaliseCode", () => {
  it.each([
    ["123 456", "123456"],
    [" 123456 ", "123456"],
    ["12 34 56", "123456"],
    ["123 456", "123456"],
  ])("removes the spaces people type or paste (%j)", (typed, sent) => {
    expect(normaliseCode(typed)).toBe(sent);
  });

  it("keeps anything else for the server to refuse", () => {
    expect(normaliseCode("12a456")).toBe("12a456");
  });
});

describe("isCompleteCode", () => {
  it.each(["123456", "000000"])("accepts six digits (%s)", (code) => {
    expect(isCompleteCode(code)).toBe(true);
  });

  it.each(["", "12345", "1234567", "12a456", "١٢٣٤٥٦"])("refuses %j", (code) => {
    expect(isCompleteCode(code)).toBe(false);
  });
});
