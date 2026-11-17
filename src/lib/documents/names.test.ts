import { PICKED_NAME_MAX_LENGTH, tidyDocumentName } from "./names";

describe("tidyDocumentName", () => {
  it.each([
    ["  Portfolio of work ", "Portfolio of work"],
    ["Genuine   Student\tstatement", "Genuine Student statement"],
    ["   ", ""],
    ["CV", "CV"],
  ])("tidies %j to %j", (typed, tidy) => {
    expect(tidyDocumentName(typed)).toBe(tidy);
  });

  it("allows the same length as the server", () => {
    expect(PICKED_NAME_MAX_LENGTH).toBe(80);
  });
});
