import type { Holiday } from "@/lib/api";
import { addDaysIso } from "@/lib/dates";

import { weekdayName } from "./monthList";

/** The most days one holiday can be added with, and the most removed at once (the server's limit). */
export const HOLIDAY_DAYS_MAX = 31;

const YEAR_LENGTH = 4;
const SHORT_WEEKDAY = 3;

/**
 * One holiday as people see it (UI revamp 17): every day with the same name in the same year,
 * even with gaps (Dashain on 23, 24 and 26). Its days are in order.
 */
export type HolidayGroup = { key: string; name: string; days: readonly Holiday[] };

/** The holidays as groups of days, the earliest first. Different names stay apart. */
export function holidayGroups(holidays: readonly Holiday[]): HolidayGroup[] {
  const byKey = new Map<string, { name: string; days: Holiday[] }>();
  const inOrder = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  for (const holiday of inOrder) {
    const name = holiday.name.trim();
    const key = `${holiday.date.slice(0, YEAR_LENGTH)}|${name.toLowerCase()}`;
    const known = byKey.get(key);
    if (known === undefined) byKey.set(key, { name, days: [holiday] });
    else known.days.push(holiday);
  }
  return [...byKey].map(([key, group]) => ({ key, ...group }));
}

/** Days in order as runs: days in a row are one run [first, last]; a gap starts another. */
export function dayRuns(days: readonly string[]): [string, string][] {
  const runs: [string, string][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run !== undefined && addDaysIso(run[1], 1) === day) run[1] = day;
    else runs.push([day, day]);
  }
  return runs;
}

/** What a holiday's card says. */
export type HolidayWords = {
  /** The small word on the date leaf: "Nov", or "Oct–Nov". */
  leafMonth: string;
  /** The big text on the date leaf: "21", "8–10" or "8–10, 12". */
  leafDays: string;
  /** More than one day: the leaf's text is drawn a size smaller. */
  isRange: boolean;
  /** Under the name: "Wednesday", "3 days, Sun to Tue" or "4 days". */
  when: string;
  /** Every day in words, for screen readers and the Remove button: "8–10, 12 Nov 2026". */
  full: string;
};

type DayParts = { day: string; month: string; year: string };

/** A formatted day ("8 Nov 2026", "22 Kartik 2083") as its parts. */
function partsOf(text: string): DayParts {
  const [day = "", month = "", year = ""] = text.split(" ");
  return { day, month, year };
}

function runWords(first: DayParts, last: DayParts, withMonth: boolean): string {
  if (first.month !== last.month) {
    return `${first.day} ${first.month}–${last.day} ${last.month}`;
  }
  const days = first.day === last.day ? first.day : `${first.day}–${last.day}`;
  return withMonth ? `${days} ${last.month}` : days;
}

function whenWords(count: number, runs: readonly [string, string][], spread: string): string {
  const [first] = runs;
  if (first === undefined) return "";
  if (count === 1) return weekdayName(first[0]);
  const days = `${String(count)} days`;
  if (runs.length > 1) return spread === "" ? days : `${days}: ${spread}`;
  const from = weekdayName(first[0]).slice(0, SHORT_WEEKDAY);
  const to = weekdayName(first[1]).slice(0, SHORT_WEEKDAY);
  return `${days}, ${from} to ${to}`;
}

/** The leaf and the full words of a holiday inside one month, or spread over two. */
function leafWords(
  first: DayParts,
  last: DayParts,
  inRuns: (withMonth: boolean) => string,
): Pick<HolidayWords, "leafMonth" | "leafDays" | "full"> & { spread: string } {
  if (first.month === last.month) {
    const days = inRuns(false);
    return {
      leafMonth: first.month,
      leafDays: days,
      full: `${days} ${last.month} ${last.year}`,
      spread: "",
    };
  }
  const spread = inRuns(true);
  return {
    leafMonth: `${first.month}–${last.month}`,
    leafDays: `${first.day}–${last.day}`,
    full: `${spread} ${last.year}`,
    spread,
  };
}

/**
 * The words of one holiday's card. `formatDay` writes a day in the office's calendar ("8 Nov
 * 2026"); runs are days in a row whichever calendar shows them.
 */
export function holidayWords(
  group: HolidayGroup,
  formatDay: (iso: string) => string,
): HolidayWords {
  const dates = group.days.map((day) => day.date);
  const runs = dayRuns(dates);
  const parts = (iso: string | undefined): DayParts => partsOf(formatDay(iso ?? ""));
  const inRuns = (withMonth: boolean): string =>
    runs.map(([from, to]) => runWords(parts(from), parts(to), withMonth)).join(", ");
  const { spread, ...leaf } = leafWords(parts(dates[0]), parts(dates.at(-1)), inRuns);
  return { ...leaf, isRange: dates.length > 1, when: whenWords(dates.length, runs, spread) };
}

/** Coming up (the last day is today or later, soonest first) and past (newest first). */
export function splitHolidays(
  groups: readonly HolidayGroup[],
  today: string,
): { coming: HolidayGroup[]; past: HolidayGroup[] } {
  const isComing = (group: HolidayGroup): boolean => (group.days.at(-1)?.date ?? "") >= today;
  return {
    coming: groups.filter(isComing),
    past: groups.filter((group) => !isComing(group)).reverse(),
  };
}

/** How many holidays, and how many days they are together. */
export function holidayCount(groups: readonly HolidayGroup[]): { holidays: number; days: number } {
  return {
    holidays: groups.length,
    days: groups.reduce((sum, group) => sum + group.days.length, 0),
  };
}

/** The days chosen on the calendar after a tap on `iso`: added in order, or taken off again. */
export function toggleDay(chosen: readonly string[], iso: string): string[] {
  if (chosen.includes(iso)) return chosen.filter((one) => one !== iso);
  return [...chosen, iso].sort();
}
