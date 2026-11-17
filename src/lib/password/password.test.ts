import {
  checkPassword,
  describeMissingRules,
  isPasswordAcceptable,
  PASSWORD_RULES_HINT,
  unmetRules,
} from "./password";

describe("checkPassword", () => {
  it("lists every rule, unmet, for an empty password", () => {
    expect(checkPassword("")).toEqual([
      { id: "min_length", label: "At least 8 characters", isMet: false },
      { id: "capital", label: "A capital letter (A–Z)", isMet: false },
      { id: "small", label: "A small letter (a–z)", isMet: false },
      { id: "number", label: "A number (0–9)", isMet: false },
      { id: "symbol", label: "A symbol, such as ! @ # $", isMet: false },
    ]);
  });

  it("ticks off each rule as it is met", () => {
    expect(checkPassword("abcD1").map((rule) => rule.isMet)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it("counts a space or any non-letter, non-digit as a symbol", () => {
    expect(checkPassword("a b").at(-1)?.isMet).toBe(true);
  });
});

describe("isPasswordAcceptable", () => {
  it("accepts a password that meets every rule", () => {
    expect(isPasswordAcceptable("Kathmandu#2026")).toBe(true);
  });

  it.each(["Kath#26", "kathmandu#2026", "KATHMANDU#2026", "Kathmandu#", "Kathmandu2026"])(
    "refuses %s",
    (password) => {
      expect(isPasswordAcceptable(password)).toBe(false);
    },
  );
});

it("describes the rules in one line", () => {
  expect(PASSWORD_RULES_HINT).toBe(
    "At least 8 characters, with a capital letter, a small letter, a number and a symbol.",
  );
});

describe("unmetRules", () => {
  it("names the rules a password doesn't meet, as the API does", () => {
    expect(unmetRules("kathmandu")).toEqual(["capital", "number", "symbol"]);
    expect(unmetRules("Kathmandu!2026")).toEqual([]);
  });
});

describe("describeMissingRules", () => {
  it("lists what is still needed in a sentence", () => {
    expect(describeMissingRules(["capital", "number", "symbol"])).toBe(
      "a capital letter, a number and a symbol",
    );
  });

  it("names a single rule on its own", () => {
    expect(describeMissingRules(["min_length"])).toBe("8 characters");
  });

  it("says nothing for no rules", () => {
    expect(describeMissingRules([])).toBe("");
  });
});
