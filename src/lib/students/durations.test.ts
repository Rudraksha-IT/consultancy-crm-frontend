import { durationText } from "./durations";

const START = "2026-01-01T09:00:00+05:45";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function after(ms: number): string {
  return new Date(Date.parse(START) + ms).toISOString();
}

describe("durationText", () => {
  it.each([
    [0, "less than an hour"],
    [59 * 60 * 1000, "less than an hour"],
    [HOUR, "1 hour"],
    [3 * HOUR + 59 * 60 * 1000, "3 hours"],
    [23 * HOUR, "23 hours"],
    [DAY, "1 day"],
    [12 * DAY + 5 * HOUR, "12 days"],
    [13 * DAY, "13 days"],
    [14 * DAY, "2 weeks"],
    [21 * DAY, "3 weeks"],
    [59 * DAY, "8 weeks"],
    [60 * DAY, "1 month 29 days"],
    [61 * DAY, "2 months"],
    [65 * DAY, "2 months 4 days"],
    [364 * DAY, "11 months 29 days"],
    [365 * DAY, "1 year"],
    [400 * DAY, "1 year 1 month"],
    [800 * DAY, "2 years 2 months"],
  ])("reads %i ms as %s", (ms, text) => {
    expect(durationText(START, after(ms))).toBe(text);
  });

  it("compares moments, not the text, when offsets differ", () => {
    // 09:00 in Nepal is 03:15 UTC: two hours later is 05:15 UTC.
    expect(durationText("2026-01-01T09:00:00+05:45", "2026-01-01T05:15:00Z")).toBe("2 hours");
  });

  it("reads an end before the start, or a date it can't read, as no time", () => {
    expect(durationText(START, after(-5 * DAY))).toBe("less than an hour");
    expect(durationText("not a date", START)).toBe("less than an hour");
  });
});
