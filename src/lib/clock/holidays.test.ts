import { formatAdDate, formatBsDate } from "@/lib/dates";
import { uid } from "@/test/ids";

import {
  dayRuns,
  HOLIDAY_DAYS_MAX,
  holidayCount,
  holidayGroups,
  holidayWords,
  splitHolidays,
  toggleDay,
} from "./holidays";

let next = 0;
function day(date: string, name: string) {
  next += 1;
  return { id: uid(next), date, name };
}

function group(name: string, ...dates: string[]) {
  const [made] = holidayGroups(dates.map((date) => day(date, name)));
  if (made === undefined) throw new Error("no days");
  return made;
}

describe("holidayGroups (UI revamp 17)", () => {
  it("makes one holiday of the days with the same name in the same year, even with gaps", () => {
    const groups = holidayGroups([
      day("2026-11-12", "Tihar"),
      day("2026-11-08", "Tihar"),
      day("2026-11-09", "Tihar"),
      day("2026-11-10", "Tihar"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("Tihar");
    expect(groups[0]?.days.map((one) => one.date)).toEqual([
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-12",
    ]);
  });

  it("keeps different names apart, and the same name in another year", () => {
    const groups = holidayGroups([
      day("2027-10-10", "Dashain"),
      day("2026-11-08", "Tihar"),
      day("2026-10-21", "Dashain"),
      day("2026-11-09", "Bhai Tika"),
    ]);

    expect(groups.map((one) => [one.name, one.days.length])).toEqual([
      ["Dashain", 1],
      ["Tihar", 1],
      ["Bhai Tika", 1],
      ["Dashain", 1],
    ]);
  });

  it("takes names that differ only by capitals or spaces as one, shown as first written", () => {
    const groups = holidayGroups([day("2026-11-08", "Tihar"), day("2026-11-09", " tihar ")]);

    expect(groups.map((one) => one.name)).toEqual(["Tihar"]);
  });

  it("gives each holiday a key of its own", () => {
    const groups = holidayGroups([
      day("2026-10-21", "Dashain"),
      day("2027-10-10", "Dashain"),
      day("2026-11-08", "Tihar"),
    ]);

    expect(new Set(groups.map((one) => one.key)).size).toBe(3);
  });
});

describe("dayRuns", () => {
  it("joins days in a row and breaks at a gap", () => {
    expect(dayRuns(["2026-11-08", "2026-11-09", "2026-11-10", "2026-11-12"])).toEqual([
      ["2026-11-08", "2026-11-10"],
      ["2026-11-12", "2026-11-12"],
    ]);
  });

  it("joins across a month's end", () => {
    expect(dayRuns(["2026-10-31", "2026-11-01"])).toEqual([["2026-10-31", "2026-11-01"]]);
  });
});

describe("holidayWords", () => {
  it("one day: the day on the leaf and its weekday", () => {
    expect(holidayWords(group("Dashain", "2026-10-21"), formatAdDate)).toEqual({
      leafMonth: "Oct",
      leafDays: "21",
      isRange: false,
      when: "Wednesday",
      full: "21 Oct 2026",
    });
  });

  it("days in a row: Nov 8–10, 3 days, Sun to Tue", () => {
    const words = holidayWords(
      group("Tihar", "2026-11-08", "2026-11-09", "2026-11-10"),
      formatAdDate,
    );

    expect(words).toEqual({
      leafMonth: "Nov",
      leafDays: "8–10",
      isRange: true,
      when: "3 days, Sun to Tue",
      full: "8–10 Nov 2026",
    });
  });

  it("days with a gap: 8–10, 12", () => {
    const words = holidayWords(
      group("Tihar", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-12"),
      formatAdDate,
    );

    expect(words.leafDays).toBe("8–10, 12");
    expect(words.when).toBe("4 days");
    expect(words.full).toBe("8–10, 12 Nov 2026");
  });

  it("days apart: 23, 24, 26", () => {
    const words = holidayWords(
      group("Dashain", "2026-10-23", "2026-10-24", "2026-10-26"),
      formatAdDate,
    );

    expect(words.leafDays).toBe("23–24, 26");
    expect(words.when).toBe("3 days");
  });

  it("over two months: both months on the leaf and every run named", () => {
    const words = holidayWords(
      group("Winter", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-03"),
      formatAdDate,
    );

    expect(words.leafMonth).toBe("Oct–Nov");
    expect(words.leafDays).toBe("30–3");
    expect(words.when).toBe("4 days: 30 Oct–1 Nov, 3 Nov");
    expect(words.full).toBe("30 Oct–1 Nov, 3 Nov 2026");
  });

  it("one run over two months says its weekdays", () => {
    const words = holidayWords(group("Winter", "2026-10-31", "2026-11-01"), formatAdDate);

    expect(words.when).toBe("2 days, Sat to Sun");
    expect(words.full).toBe("31 Oct–1 Nov 2026");
  });

  it("follows the office's calendar (BS)", () => {
    const words = holidayWords(group("Tihar", "2026-11-08", "2026-11-09"), formatBsDate);
    const [first = "", month = ""] = formatBsDate("2026-11-08").split(" ");
    const [last = ""] = formatBsDate("2026-11-09").split(" ");

    expect(words.leafMonth).toBe(month);
    expect(words.leafDays).toBe(`${first}–${last}`);
  });
});

describe("splitHolidays", () => {
  const groups = holidayGroups([
    day("2026-10-21", "Dashain"),
    day("2026-09-19", "Constitution Day"),
    day("2026-11-08", "Tihar"),
    day("2026-11-09", "Tihar"),
    day("2026-12-25", "Christmas"),
  ]);

  it("coming up: every holiday whose last day is today or later, soonest first", () => {
    const { coming } = splitHolidays(groups, "2026-11-09");

    expect(coming.map((one) => one.name)).toEqual(["Tihar", "Christmas"]);
  });

  it("past: the ones that are over, newest first", () => {
    const { past } = splitHolidays(groups, "2026-11-10");

    expect(past.map((one) => one.name)).toEqual(["Tihar", "Dashain", "Constitution Day"]);
  });
});

describe("holidayCount", () => {
  it("counts holidays and their days", () => {
    const groups = holidayGroups([
      day("2026-11-08", "Tihar"),
      day("2026-11-09", "Tihar"),
      day("2026-12-25", "Christmas"),
    ]);

    expect(holidayCount(groups)).toEqual({ holidays: 2, days: 3 });
  });
});

describe("toggleDay", () => {
  it("adds a day, in order, and takes it off on a second tap", () => {
    const chosen = toggleDay(toggleDay([], "2026-11-10"), "2026-11-08");

    expect(chosen).toEqual(["2026-11-08", "2026-11-10"]);
    expect(toggleDay(chosen, "2026-11-10")).toEqual(["2026-11-08"]);
  });

  it("the server takes at most 31 days at once", () => {
    expect(HOLIDAY_DAYS_MAX).toBe(31);
  });
});
