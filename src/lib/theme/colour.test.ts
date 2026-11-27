import { contrastRatio, mixHex, readableOn } from "./colour";

describe("mixHex", () => {
  it("returns the first colour at 0 and the second at 1", () => {
    expect(mixHex("#ff0000", "#0000ff", 0)).toBe("#ff0000");
    expect(mixHex("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("mixes channel by channel", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#047857", "#047857")).toBeCloseTo(1);
  });

  it("does not depend on the order", () => {
    expect(contrastRatio("#047857", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#047857"));
  });
});

describe("readableOn", () => {
  it("keeps a colour that already reaches the ratio", () => {
    expect(readableOn("#000000", "#ffffff", "#000000", 4.5)).toBe("#000000");
  });

  it("moves a colour towards the target until it reaches the ratio", () => {
    const result = readableOn("#cccccc", "#ffffff", "#000000", 4.5);

    expect(contrastRatio(result, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("ends at the target when nothing on the way is readable enough", () => {
    expect(readableOn("#ffffff", "#ffffff", "#767676", 4.6)).toBe("#767676");
  });
});
