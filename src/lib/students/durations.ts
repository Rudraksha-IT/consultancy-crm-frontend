/**
 * How long something lasted, read simply: "3 hours", "12 days", "3 weeks", "2 months 4 days"
 * (spec: Activity timeline, issue 82). Worked out from two moments, never stored.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DAYS_PER_WEEK = 7;
/** Under two weeks reads in days; under this many days, in weeks. */
const DAYS_AS_DAYS = 14;
const DAYS_AS_WEEKS = 60;
/** The average month, so "2 months" means the same however long the months were. */
const DAYS_PER_MONTH = 30.44;
const DAYS_PER_YEAR = 365;

/** The time from `from` to `to` (ISO moments). An end before the start, or no date, is no time. */
export function durationText(from: string, to: string): string {
  const ms = Date.parse(to) - Date.parse(from);
  if (!Number.isFinite(ms) || ms < HOUR_MS) return "less than an hour";
  return ms < DAY_MS
    ? counted(Math.floor(ms / HOUR_MS), "hour")
    : daysText(Math.floor(ms / DAY_MS));
}

/** A day or more: in days, then weeks, then months and days, then years and months. */
function daysText(days: number): string {
  if (days < DAYS_AS_DAYS) return counted(days, "day");
  if (days < DAYS_AS_WEEKS) return counted(Math.floor(days / DAYS_PER_WEEK), "week");
  if (days < DAYS_PER_YEAR) {
    const months = Math.floor(days / DAYS_PER_MONTH);
    return joined(counted(months, "month"), Math.floor(days - months * DAYS_PER_MONTH), "day");
  }
  const years = Math.floor(days / DAYS_PER_YEAR);
  const months = Math.floor((days - years * DAYS_PER_YEAR) / DAYS_PER_MONTH);
  return joined(counted(years, "year"), months, "month");
}

function counted(count: number, unit: string): string {
  return `${String(count)} ${unit}${count === 1 ? "" : "s"}`;
}

/** "2 months" with " 4 days" after it, unless there are none. */
function joined(first: string, count: number, unit: string): string {
  return count === 0 ? first : `${first} ${counted(count, unit)}`;
}
