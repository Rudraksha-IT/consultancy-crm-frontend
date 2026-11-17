import { adToBs, bsMonthDays, bsToAd, BS_YEARS } from "./bs";
import { monthGrid, monthOf, shiftMonth, type CalendarMonth, type MonthGrid } from "./monthGrid";
import type { DateDisplay } from "@/constants/dates";

function gridOf(month: CalendarMonth, display: DateDisplay): MonthGrid {
  const grid = monthGrid(month, display);
  if (grid === null) throw new Error("no grid");
  return grid;
}

describe("monthOf", () => {
  it("is the month an AD day is in", () => {
    expect(monthOf("2026-11-17", "AD")).toEqual({ year: 2026, month: 11 });
  });

  it("is the BS month in BS", () => {
    const bs = adToBs("2026-11-17");
    expect(monthOf("2026-11-17", "BS")).toEqual({ year: bs?.year, month: bs?.month });
  });

  it("is null for a day that isn't one", () => {
    expect(monthOf("not a day", "AD")).toBeNull();
    expect(monthOf("2026-02-30", "BS")).toBeNull();
  });
});

describe("monthGrid", () => {
  it("lays out an AD month: its name, the blanks before the 1st (Sunday first), every day", () => {
    const grid = gridOf({ year: 2026, month: 12 }, "AD");

    expect(grid.title).toBe("December 2026");
    // 1 Dec 2026 is a Tuesday.
    expect(grid.leadingBlanks).toBe(2);
    expect(grid.days).toHaveLength(31);
    expect(grid.days[0]).toEqual({ iso: "2026-12-01", day: 1 });
    expect(grid.days[30]).toEqual({ iso: "2026-12-31", day: 31 });
  });

  it("knows February's length", () => {
    expect(monthGrid({ year: 2028, month: 2 }, "AD")?.days).toHaveLength(29);
    expect(monthGrid({ year: 2027, month: 2 }, "AD")?.days).toHaveLength(28);
  });

  it("lays out a BS month with its BS name and days, each with its AD day", () => {
    const grid = gridOf({ year: 2083, month: 7 }, "BS");
    const first = bsToAd({ year: 2083, month: 7, day: 1 });

    expect(grid.title).toBe("Kartik 2083");
    expect(grid.days).toHaveLength(Number(bsMonthDays(2083, 7)));
    expect(grid.days[0]).toEqual({ iso: first, day: 1 });
    expect(grid.leadingBlanks).toBe(new Date(`${String(first)}T00:00:00Z`).getUTCDay());
  });

  it("is null for a month outside the calendar", () => {
    expect(monthGrid({ year: BS_YEARS.last + 1, month: 1 }, "BS")).toBeNull();
    expect(monthGrid({ year: 2026, month: 13 }, "AD")).toBeNull();
  });
});

describe("shiftMonth", () => {
  it("goes to the next or the previous month, across a new year", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1, "AD")).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2027, month: 1 }, -1, "AD")).toEqual({ year: 2026, month: 12 });
    expect(shiftMonth({ year: 2083, month: 12 }, 1, "BS")).toEqual({ year: 2084, month: 1 });
  });

  it("stops at the ends of the BS calendar", () => {
    expect(shiftMonth({ year: BS_YEARS.last, month: 12 }, 1, "BS")).toBeNull();
    expect(shiftMonth({ year: BS_YEARS.first, month: 1 }, -1, "BS")).toBeNull();
  });
});
