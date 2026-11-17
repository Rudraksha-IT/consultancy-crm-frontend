import type { StudentMonth } from "@/lib/api";

import {
  countryRows,
  formatLakh,
  monthCategories,
  moneyTotalsOf,
  rangeEndingOn,
  topCountries,
  totalOf,
} from "./reports";

function month(key: string, counts: Partial<StudentMonth> = {}): StudentMonth {
  return {
    month: key,
    newVisitors: 0,
    signedUp: 0,
    applied: 0,
    visasGranted: 0,
    visasRefused: 0,
    lost: 0,
    ...counts,
  };
}

describe("totalOf", () => {
  it("adds up every month", () => {
    const totals = totalOf([
      month("2026-09", { newVisitors: 30, signedUp: 12, visasGranted: 9, visasRefused: 2 }),
      month("2026-10", { newVisitors: 14, signedUp: 5, applied: 6, lost: 4 }),
    ]);

    expect(totals).toEqual({
      newVisitors: 44,
      signedUp: 17,
      applied: 6,
      visasGranted: 9,
      visasRefused: 2,
      lost: 4,
    });
  });

  it("is all zeros with no months", () => {
    expect(Object.values(totalOf([]))).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("monthCategories", () => {
  it("names each month in full and writes the year on the first and on January", () => {
    expect(monthCategories(["2025-11", "2025-12", "2026-01", "2026-02"])).toEqual([
      { key: "2025-11", label: "Nov 2025", shortLabel: "Nov 2025" },
      { key: "2025-12", label: "Dec 2025", shortLabel: "Dec" },
      { key: "2026-01", label: "Jan 2026", shortLabel: "Jan 2026" },
      { key: "2026-02", label: "Feb 2026", shortLabel: "Feb" },
    ]);
  });
});

describe("rangeEndingOn", () => {
  it("starts three months before the day", () => {
    expect(rangeEndingOn("2026-11-03")).toEqual({ from: "2026-08-03", to: "2026-11-03" });
  });

  it("crosses the year", () => {
    expect(rangeEndingOn("2026-02-15")).toEqual({ from: "2025-11-15", to: "2026-02-15" });
  });

  it("keeps to the last day of a shorter month", () => {
    expect(rangeEndingOn("2026-05-31")).toEqual({ from: "2026-02-28", to: "2026-05-31" });
  });
});

describe("moneyTotalsOf", () => {
  const row = (fromStudents: number, fromCommission: number, moneyOut: number) => ({
    month: "2026-10",
    fromStudents,
    fromCommission,
    moneyOut,
  });

  it("adds up money in from Students and commission, money out and what is left over", () => {
    expect(moneyTotalsOf([row(180000, 290000, 91500), row(40000, 0, 85000)])).toEqual({
      fromStudents: 220000,
      fromCommission: 290000,
      moneyIn: 510000,
      moneyOut: 176500,
      leftOver: 333500,
    });
  });

  it("is negative left over when more went out than came in", () => {
    expect(moneyTotalsOf([row(1000, 0, 5000)]).leftOver).toBe(-4000);
  });

  it("is all zeros with no months", () => {
    expect(Object.values(moneyTotalsOf([]))).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("formatLakh", () => {
  it.each([
    [0, "0"],
    [500, "1k"],
    [2500, "3k"],
    [85000, "85k"],
    [100000, "1 lakh"],
    [150000, "1.5 lakh"],
    [1240000, "12.4 lakh"],
    [10000000, "100 lakh"],
  ])("writes %d on the axis as %s", (amount, written) => {
    expect(formatLakh(amount)).toBe(written);
  });
});

describe("countryRows", () => {
  it("names every country, keeping the server's order", () => {
    expect(
      countryRows([
        { country: "new_zealand", count: 3 },
        { country: "uk", count: 1 },
      ]),
    ).toEqual([
      { key: "new_zealand", label: "New Zealand", value: 3 },
      { key: "uk", label: "UK", value: 1 },
    ]);
  });
});

describe("topCountries", () => {
  it("keeps the top countries and puts the rest together under Other, last", () => {
    const rows = topCountries(
      [
        { country: "canada", count: 5 },
        { country: "other", count: 4 },
        { country: "uk", count: 3 },
        { country: "usa", count: 1 },
      ],
      2,
    );

    expect(rows).toEqual([
      { key: "canada", label: "Canada", value: 5 },
      { key: "uk", label: "UK", value: 3 },
      { key: "other", label: "Other", value: 5 },
    ]);
  });

  it("shows ten countries before grouping the rest", () => {
    const counts = Array.from({ length: 12 }, (_, index) => ({
      country: "uk" as const,
      count: 12 - index,
    }));

    const rows = topCountries(counts);

    expect(rows).toHaveLength(11);
    expect(rows.at(-1)).toEqual({ key: "other", label: "Other", value: 3 });
  });

  it("adds no Other when nothing is left over", () => {
    expect(topCountries([{ country: "japan", count: 2 }])).toEqual([
      { key: "japan", label: "Japan", value: 2 },
    ]);
  });

  it("puts the Other country last even when it has the most", () => {
    expect(
      topCountries([
        { country: "other", count: 9 },
        { country: "japan", count: 2 },
      ]),
    ).toEqual([
      { key: "japan", label: "Japan", value: 2 },
      { key: "other", label: "Other", value: 9 },
    ]);
  });

  it("lists nothing for no countries", () => {
    expect(topCountries([])).toEqual([]);
  });
});
