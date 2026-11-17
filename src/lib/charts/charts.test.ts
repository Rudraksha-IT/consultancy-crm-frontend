import { niceAxisMax, shareOf } from "./charts";

describe("niceAxisMax", () => {
  it.each([
    [0, 4],
    [-5, 4],
    [3, 4],
    [7, 8],
    [9, 20],
    [38, 40],
    [41, 80],
    [95, 100],
    [430_000, 800_000],
    [1_850_000, 2_000_000],
  ])("rounds %d up to %d, which splits into four whole steps", (value, expected) => {
    expect(niceAxisMax(value)).toBe(expected);
  });
});

describe("shareOf", () => {
  it("is a whole percentage of the total", () => {
    expect(shareOf(1, 3)).toBe(33);
    expect(shareOf(2, 3)).toBe(67);
  });

  it("is 0 when there is no total", () => {
    expect(shareOf(5, 0)).toBe(0);
  });
});
