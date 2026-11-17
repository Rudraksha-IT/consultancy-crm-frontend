import {
  addDaysIso,
  formatAdDate,
  formatAdDateTime,
  formatClockTime,
  formatIntake,
  formatMonth,
  recentMonths,
  todayIso,
} from "./dates";

describe("formatAdDate", () => {
  it.each([
    ["2026-11-01", "1 Nov 2026"],
    ["2027-02-28", "28 Feb 2027"],
    ["2026-12-31", "31 Dec 2026"],
  ])("writes %s as %s", (iso, shown) => {
    expect(formatAdDate(iso)).toBe(shown);
  });

  it.each(["", "2026-13-01", "1 Nov 2026", "<script>"])("shows %j as a dash", (value) => {
    expect(formatAdDate(value)).toBe("—");
  });
});

describe("todayIso", () => {
  it("uses the local calendar day", () => {
    expect(todayIso(new Date(2026, 10, 1, 23, 30))).toBe("2026-11-01");
  });
});

describe("formatIntake", () => {
  it("writes a month as the Intake label", () => {
    expect(formatIntake("2027-02")).toBe("Feb 2027");
  });

  it.each(["", "2027-13", "Feb 2027", "2027-2"])("shows %j as a dash", (value) => {
    expect(formatIntake(value)).toBe("—");
  });
});

describe("formatAdDateTime", () => {
  it("writes the date and the local time", () => {
    expect(formatAdDateTime("2026-10-22T13:48:00+05:45")).toMatch(
      /^\d{1,2} \w{3} 2026, \d{2}:\d{2}$/,
    );
  });

  it("shows a value that isn't a date-time as a dash", () => {
    expect(formatAdDateTime("yesterday")).toBe("—");
  });
});

describe("recentMonths", () => {
  it("lists this month first, then the months before it", () => {
    expect(recentMonths("2026-11-03", 3)).toEqual(["2026-11", "2026-10", "2026-09"]);
  });

  it("crosses into the year before", () => {
    expect(recentMonths("2027-02-28", 4)).toEqual(["2027-02", "2027-01", "2026-12", "2026-11"]);
  });

  it("is empty for a day that isn't one", () => {
    expect(recentMonths("tomorrow", 3)).toEqual([]);
  });
});

describe("formatMonth", () => {
  it.each([
    ["2026-10", "October 2026"],
    ["2027-01", "January 2027"],
    ["2026-13", "—"],
    ["2026-1", "—"],
    ["<b>", "—"],
  ])("writes %s as %s", (value, written) => {
    expect(formatMonth(value)).toBe(written);
  });
});

describe("addDaysIso", () => {
  it("counts forward and back across months and years", () => {
    expect(addDaysIso("2026-11-05", 7)).toBe("2026-11-12");
    expect(addDaysIso("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("leaves something that isn't a date alone", () => {
    expect(addDaysIso("soon", 3)).toBe("soon");
  });
});

describe("formatClockTime", () => {
  it.each([
    ["00:05", "12:05 AM"],
    ["09:30", "9:30 AM"],
    ["12:00", "12:00 PM"],
    ["14:05", "2:05 PM"],
    ["23:59", "11:59 PM"],
  ])("writes %s as %s", (value, shown) => {
    expect(formatClockTime(value)).toBe(shown);
  });

  it.each(["24:00", "9:30", "noon", ""])("shows a dash for %j", (value) => {
    expect(formatClockTime(value)).toBe("—");
  });
});
