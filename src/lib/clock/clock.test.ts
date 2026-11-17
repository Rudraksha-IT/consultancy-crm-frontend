import {
  durationText,
  elapsedMinutes,
  hoursText,
  leadingBlanks,
  officeClock,
  officeHhMm,
  officeTime,
  shortHours,
} from ".";

describe("durationText", () => {
  it.each([
    [0, "0 min"],
    [40, "40 min"],
    [60, "1 h"],
    [505, "8 h 25 min"],
    [-5, "0 min"],
  ])("%i minutes read as %s", (minutes, text) => {
    expect(durationText(minutes)).toBe(text);
  });
});

describe("shortHours", () => {
  it.each([
    [504, "8h 24m"],
    [0, "0h 00m"],
    [65, "1h 05m"],
  ])("%i minutes read as %s in a calendar cell", (minutes, text) => {
    expect(shortHours(minutes)).toBe(text);
  });
});

describe("hoursText", () => {
  it.each([
    [480, "8 h"],
    [450, "7.5 h"],
    [240, "4 h"],
  ])("a %i-minute working day reads as %s", (minutes, text) => {
    expect(hoursText(minutes)).toBe(text);
  });
});

describe("the office's clock (Asia/Kathmandu, UTC+5:45)", () => {
  it.each([
    ["2026-11-05T03:17:00Z", "9:02 AM", "09:02", "2026-11-05"],
    ["2026-11-05T06:15:00Z", "12:00 PM", "12:00", "2026-11-05"],
    ["2026-11-04T18:15:00Z", "12:00 AM", "00:00", "2026-11-05"],
    ["2026-11-04T18:14:00Z", "11:59 PM", "23:59", "2026-11-04"],
    ["2026-11-05T11:45:00+00:00", "5:30 PM", "17:30", "2026-11-05"],
  ])("%s is %s on %s's office day", (iso, time, hhmm, day) => {
    expect(officeTime(iso)).toBe(time);
    expect(officeHhMm(iso)).toBe(hhmm);
    expect(officeClock(iso)?.day).toBe(day);
  });

  it("shows a dash for anything that isn't a moment", () => {
    expect(officeTime("yesterday")).toBe("—");
    expect(officeHhMm("yesterday")).toBe("");
    expect(officeClock("yesterday")).toBeNull();
  });
});

describe("elapsedMinutes", () => {
  it("counts from the server's own now, plus the time since it answered", () => {
    expect(elapsedMinutes("2026-11-05T03:00:00Z", "2026-11-05T05:00:00Z", 0)).toBe(120);
    expect(elapsedMinutes("2026-11-05T03:00:00Z", "2026-11-05T05:00:00Z", 90_000)).toBe(121);
  });

  it("never goes below zero or breaks on a bad moment", () => {
    expect(elapsedMinutes("2026-11-05T05:00:00Z", "2026-11-05T03:00:00Z", 0)).toBe(0);
    expect(elapsedMinutes("x", "2026-11-05T03:00:00Z", 0)).toBe(0);
    expect(elapsedMinutes("2026-11-05T03:00:00Z", "2026-11-05T03:00:00Z", -60_000)).toBe(0);
  });
});

describe("leadingBlanks", () => {
  it.each([
    ["2026-11", 0],
    ["2026-10", 4],
    ["2026-02", 0],
    ["2027-05", 6],
    ["nonsense", 0],
  ])("%s starts after %i blank days (Sunday first)", (month, blanks) => {
    expect(leadingBlanks(month)).toBe(blanks);
  });
});
