import { periodRange } from "./period";

describe("periodRange", () => {
  it("this month runs from its first day to today (the default)", () => {
    expect(periodRange("month", "2026-11-15")).toEqual({ from: "2026-11-01", to: "2026-11-15" });
  });

  it("this week starts on Monday", () => {
    // 15 Nov 2026 is a Sunday; 9 Nov is the Monday before it.
    expect(periodRange("week", "2026-11-15")).toEqual({ from: "2026-11-09", to: "2026-11-15" });
    expect(periodRange("week", "2026-11-16")).toEqual({ from: "2026-11-16", to: "2026-11-16" });
    expect(periodRange("week", "2026-11-18")).toEqual({ from: "2026-11-16", to: "2026-11-18" });
  });

  it("this week can start in the month before", () => {
    expect(periodRange("week", "2026-12-02")).toEqual({ from: "2026-11-30", to: "2026-12-02" });
  });

  it("last month is the whole of the month before", () => {
    expect(periodRange("last", "2026-11-15")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodRange("last", "2027-03-01")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });

  it("last month in January is December of the year before", () => {
    expect(periodRange("last", "2027-01-20")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("picked dates start as this month until some are chosen", () => {
    expect(periodRange("custom", "2026-11-15")).toEqual({ from: "2026-11-01", to: "2026-11-15" });
    expect(periodRange("custom", "2026-11-15", { from: "2026-01-05", to: "2026-02-01" })).toEqual({
      from: "2026-01-05",
      to: "2026-02-01",
    });
  });

  it("chosen dates are kept only for picked dates", () => {
    expect(periodRange("month", "2026-11-15", { from: "2026-01-05", to: "2026-02-01" })).toEqual({
      from: "2026-11-01",
      to: "2026-11-15",
    });
  });
});
