import { adToBs, bsMonthDays, BS_MONTHS, BS_YEARS, bsToAd, formatBsDate, type BsDate } from "./bs";

const LAST_MONTH = 12;

describe("adToBs", () => {
  it.each([
    // The first day of the table: 1 Baisakh 2000 BS.
    ["1943-04-14", { year: 2000, month: 1, day: 1 }],
    ["1943-04-13", null],
    // New Year's days (1 Baisakh) across the range.
    ["2000-04-13", { year: 2057, month: 1, day: 1 }],
    ["2025-04-14", { year: 2082, month: 1, day: 1 }],
    ["2026-04-14", { year: 2083, month: 1, day: 1 }],
    // The last day of a year rolls into the next.
    ["2026-04-13", { year: 2082, month: 12, day: 30 }],
    // Month starts the prototype's table also has.
    ["2026-10-18", { year: 2083, month: 7, day: 1 }],
    ["2026-11-17", { year: 2083, month: 8, day: 1 }],
    ["2027-01-15", { year: 2083, month: 10, day: 1 }],
    ["2026-11-02", { year: 2083, month: 7, day: 16 }],
    // 2062 BS, where one published table differs: Baisakh has 30 days, Jestha 32.
    ["2005-05-14", { year: 2062, month: 2, day: 1 }],
    ["2005-06-14", { year: 2062, month: 2, day: 32 }],
    // A leap day in AD.
    ["2024-02-29", { year: 2080, month: 11, day: 17 }],
    // The last day the table covers, and the day after.
    ["2030-04-13", { year: 2086, month: 12, day: 30 }],
    ["2030-04-14", null],
  ])("turns %s into %j", (iso, expected) => {
    expect(adToBs(iso)).toEqual(expected);
  });

  it("walks every day of the table without a gap or a repeat", () => {
    let previous = adToBs("1943-04-14");
    for (let day = 1; day < 31_776; day += 1) {
      const iso = new Date(Date.UTC(1943, 3, 14 + day)).toISOString().slice(0, 10);
      const current = adToBs(iso);
      expect(isDayAfter(previous, current), iso).toBe(true);
      previous = current;
    }
  });

  it.each(["", "2026-13-01", "2026-02-30", "2026-2-3", "02/11/2026", "2026-11-02T10:00"])(
    "refuses %j",
    (iso) => {
      expect(adToBs(iso)).toBeNull();
    },
  );
});

describe("formatBsDate", () => {
  it("writes the day, the month's name and the year", () => {
    expect(formatBsDate("2026-11-02")).toBe("16 Kartik 2083");
    expect(formatBsDate("2026-04-14")).toBe("1 Baisakh 2083");
    expect(formatBsDate("2027-04-13")).toBe("30 Chaitra 2083");
  });

  it("shows a dash outside the table or for anything that isn't a date", () => {
    expect(formatBsDate("1900-01-01")).toBe("—");
    expect(formatBsDate("nonsense")).toBe("—");
  });
});

/** Whether `current` is the BS day right after `previous`. */
function isDayAfter(previous: BsDate | null, current: BsDate | null): boolean {
  if (previous === null || current === null) return false;
  return asText(nextDayAllowingAnyMonthLength(previous, current)) === asText(current);
}

/** The day after `previous`: the next day of its month, or else day 1 of the month after. */
function nextDayAllowingAnyMonthLength(previous: BsDate, current: BsDate): BsDate {
  if (current.day !== 1) return { ...previous, day: previous.day + 1 };
  const isNewYear = previous.month === LAST_MONTH;
  return {
    year: isNewYear ? previous.year + 1 : previous.year,
    month: isNewYear ? 1 : previous.month + 1,
    day: 1,
  };
}

function asText(date: BsDate): string {
  return `${String(date.year)}-${String(date.month)}-${String(date.day)}`;
}

describe("bsToAd", () => {
  it.each([
    [{ year: 2000, month: 1, day: 1 }, "1943-04-14"],
    [{ year: 2083, month: 7, day: 16 }, "2026-11-02"],
    [{ year: 2083, month: 1, day: 1 }, "2026-04-14"],
    [{ year: 2082, month: 12, day: 30 }, "2026-04-13"],
    [{ year: 2062, month: 2, day: 32 }, "2005-06-14"],
    [{ year: 2080, month: 11, day: 17 }, "2024-02-29"],
    [{ year: 2086, month: 12, day: 30 }, "2030-04-13"],
  ])("turns %j into %s", (bs, iso) => {
    expect(bsToAd(bs)).toBe(iso);
  });

  it("turns every day of the table back into the AD date it came from", () => {
    for (let day = 0; day < 31_776; day += 1) {
      const iso = new Date(Date.UTC(1943, 3, 14 + day)).toISOString().slice(0, 10);
      const bs = adToBs(iso);
      expect(bs === null ? null : bsToAd(bs), iso).toBe(iso);
    }
  });

  it.each([
    { year: 1999, month: 12, day: 30 },
    { year: 2087, month: 1, day: 1 },
    { year: 2083, month: 0, day: 1 },
    { year: 2083, month: 13, day: 1 },
    { year: 2083, month: 1, day: 0 },
    // Baisakh 2083 has 31 days, Mangsir 29.
    { year: 2083, month: 1, day: 32 },
    { year: 2083, month: 8, day: 30 },
    { year: 2083.5, month: 1, day: 1 },
    { year: 2083, month: 1.5, day: 1 },
    { year: 2083, month: 1, day: Number.NaN },
  ])("refuses %j", (bs) => {
    expect(bsToAd(bs)).toBeNull();
  });
});

describe("bsMonthDays", () => {
  it("gives how many days a BS month has", () => {
    expect(bsMonthDays(2083, 1)).toBe(31);
    expect(bsMonthDays(2083, 8)).toBe(29);
    expect(bsMonthDays(2062, 2)).toBe(32);
  });

  it("is null outside the table", () => {
    expect(bsMonthDays(1999, 1)).toBeNull();
    expect(bsMonthDays(2087, 1)).toBeNull();
    expect(bsMonthDays(2083, 13)).toBeNull();
  });
});

describe("BS_YEARS", () => {
  it("covers the years of the table", () => {
    expect(BS_YEARS).toEqual({ first: 2000, last: 2086 });
    expect(BS_MONTHS).toHaveLength(LAST_MONTH);
  });
});
