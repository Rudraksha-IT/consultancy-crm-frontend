import { amountInWords, formatNpr, paidShare } from "./money";

describe("formatNpr", () => {
  it.each([
    [1, "NPR 1"],
    [999, "NPR 999"],
    [25_000, "NPR 25,000"],
    [125_000, "NPR 1,25,000"],
    [10_000_000, "NPR 1,00,00,000"],
    [100_000_000, "NPR 10,00,00,000"],
  ])("writes %d as %s, in lakh and crore groups", (amount, written) => {
    expect(formatNpr(amount)).toBe(written);
  });
});

describe("amountInWords", () => {
  it.each([
    [0, "Rupees Zero only"],
    [7, "Rupees Seven only"],
    [15, "Rupees Fifteen only"],
    [40, "Rupees Forty only"],
    [99, "Rupees Ninety-Nine only"],
    [100, "Rupees One Hundred only"],
    [101, "Rupees One Hundred One only"],
    [999, "Rupees Nine Hundred Ninety-Nine only"],
    [1_000, "Rupees One Thousand only"],
    [25_000, "Rupees Twenty-Five Thousand only"],
    [100_000, "Rupees One Lakh only"],
    [125_050, "Rupees One Lakh Twenty-Five Thousand Fifty only"],
    [10_000_000, "Rupees One Crore only"],
    [100_000_000, "Rupees Ten Crore only"],
    [
      987_654_321,
      "Rupees Ninety-Eight Crore Seventy-Six Lakh Fifty-Four Thousand Three Hundred Twenty-One only",
    ],
  ])("writes %d as %s", (amount, words) => {
    expect(amountInWords(amount)).toBe(words);
  });

  it("writes nothing for an amount that isn't a whole number from zero up", () => {
    expect(amountInWords(-1)).toBe("");
    expect(amountInWords(2.5)).toBe("");
    expect(amountInWords(Number.NaN)).toBe("");
  });
});

describe("paidShare", () => {
  it.each([
    [80000, 0, 0],
    [65000, 15000, 23],
    [40000, 40000, 100],
    [40000, 45000, 100],
    [0, 5000, 0],
    [3, 1, 33],
  ])("of NPR %d with %d paid is %d%%, never above 100", (fees, paid, percent) => {
    expect(paidShare(fees, paid)).toBe(percent);
  });
});
