import type { ClockDay } from "@/lib/api";

import {
  clockTabFrom,
  clockViewFrom,
  correctableDays,
  dayStatus,
  listedDays,
  pageOf,
  weekdayName,
} from ".";

function day(overrides: Partial<ClockDay> = {}): ClockDay {
  return {
    date: "2026-11-04",
    minutes: 0,
    firstIn: null,
    lastOut: null,
    isDayOff: false,
    isLater: false,
    isToday: false,
    isNotIn: false,
    isMissingClockOut: false,
    isStillIn: false,
    isShort: false,
    isCorrected: false,
    isCorrectable: false,
    isHome: false,
    holiday: null,
    sessions: [],
    ...overrides,
  };
}

const SESSION: ClockDay["sessions"][number] = {
  id: "0190a000-0000-7000-8000-000000000001",
  clockedInAt: "2026-11-04T03:15:00Z",
  clockedOutAt: "2026-11-04T11:15:00Z",
  isMissingClockOut: false,
  isAddedByCorrection: false,
  isClockOutByCorrection: false,
  isWorkFromHome: false,
};

const worked = (overrides: Partial<ClockDay> = {}): ClockDay =>
  day({ minutes: 480, sessions: [SESSION], ...overrides });

describe("clockViewFrom", () => {
  it("reads a stored view", () => {
    expect(clockViewFrom("list")).toBe("list");
    expect(clockViewFrom("calendar")).toBe("calendar");
  });

  it.each([null, "", "LIST", "board", "<script>alert(1)</script>", "{}"])(
    "gives the Calendar for %j",
    (stored) => {
      expect(clockViewFrom(stored)).toBe("calendar");
    },
  );
});

describe("clockTabFrom", () => {
  it("opens the tab the address asks for when this person has it", () => {
    expect(clockTabFrom("wfh", ["hours", "wfh"])).toBe("wfh");
    expect(clockTabFrom("hours", ["hours", "wfh"])).toBe("hours");
  });

  it("gives Working hours to an Admin asking for Work from home", () => {
    expect(clockTabFrom("wfh", ["hours"])).toBe("hours");
  });

  it.each([null, "", "WFH", "holidays", "<img src=x>", "../staff"])(
    "gives Working hours for %j",
    (asked) => {
      expect(clockTabFrom(asked, ["hours", "wfh"])).toBe("hours");
    },
  );
});

describe("listedDays", () => {
  it("lists the days up to today, newest first, without the days still to come", () => {
    const days = [
      day({ date: "2026-11-03" }),
      day({ date: "2026-11-04" }),
      day({ date: "2026-11-05", isToday: true }),
      day({ date: "2026-11-06", isLater: true }),
    ];

    expect(listedDays(days).map((one) => one.date)).toEqual([
      "2026-11-05",
      "2026-11-04",
      "2026-11-03",
    ]);
    expect(days[0]?.date).toBe("2026-11-03");
  });
});

describe("correctableDays", () => {
  it("lists only the days that can be corrected, newest first, as the List does", () => {
    const days = [
      day({ date: "2026-11-03", isCorrectable: true }),
      day({ date: "2026-11-04" }),
      day({ date: "2026-11-05", isCorrectable: true }),
      day({ date: "2026-11-06", isCorrectable: true }),
    ];

    expect(correctableDays(days).map((one) => one.date)).toEqual([
      "2026-11-06",
      "2026-11-05",
      "2026-11-03",
    ]);
    expect(days[0]?.date).toBe("2026-11-03");
  });
});

describe("pageOf", () => {
  const items = Array.from({ length: 25 }, (_, index) => index + 1);

  it("gives ten at a time", () => {
    expect(pageOf(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pageOf(items, 3, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  it.each([
    [0, 1],
    [-4, 1],
    [99, 21],
  ])("keeps page %d inside the list", (page, first) => {
    expect(pageOf(items, page, 10)[0]).toBe(first);
  });

  it("gives nothing for an empty list", () => {
    expect(pageOf([], 1, 10)).toEqual([]);
  });
});

describe("dayStatus", () => {
  it.each([
    ["a full day", worked(), "full_day"],
    ["a short day", worked({ minutes: 240, isShort: true }), "short_day"],
    ["a forgotten clock-out", worked({ isMissingClockOut: true }), "no_clock_out"],
    [
      "a forgotten clock-out before a short day",
      worked({ isMissingClockOut: true, isShort: true }),
      "no_clock_out",
    ],
    ["today, still in", worked({ isToday: true, isStillIn: true }), "still_in"],
    ["a holiday worked in full", worked({ holiday: "Dashain" }), "full_day"],
    ["today with no clock-in", day({ isToday: true }), "not_in_yet"],
    ["a past working day with no clock-in", day({ isNotIn: true }), "not_in"],
    ["a weekly day off", day({ isDayOff: true }), "day_off"],
    ["a holiday", day({ holiday: "Dashain", isDayOff: true }), "holiday"],
    ["today, a day off", day({ isToday: true, isDayOff: true }), "day_off"],
    ["a day that was never a working day for them", day(), "none"],
  ])("%s is %s", (_name, one, status) => {
    expect(dayStatus(one)).toBe(status);
  });
});

describe("weekdayName", () => {
  it.each([
    ["2026-11-01", "Sunday"],
    ["2026-11-05", "Thursday"],
    ["2026-11-07", "Saturday"],
    ["not a day", ""],
  ])("%s is %s", (iso, name) => {
    expect(weekdayName(iso)).toBe(name);
  });
});
