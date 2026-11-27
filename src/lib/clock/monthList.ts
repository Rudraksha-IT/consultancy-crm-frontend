import { z } from "zod";

import { ClockTab, ClockView, DayStatus, WEEKDAY_NAMES } from "@/constants/clock";
import type { ClockDay } from "@/lib/api";

const ClockViewSchema = z.enum(ClockView);

/**
 * How a month is shown, from what the device remembers. Anything that is not a view (nothing
 * stored yet, or something else written there) gives the Calendar.
 */
export function clockViewFrom(stored: string | null): ClockView {
  const parsed = ClockViewSchema.safeParse(stored);
  return parsed.success ? parsed.data : ClockView.Calendar;
}

/**
 * The tab the address asks for (`?tab=wfh`), if this person has it; otherwise Working hours. An
 * Admin has no Work from home tab, so an old link to it lands on their hours.
 */
export function clockTabFrom(asked: string | null, tabs: readonly ClockTab[]): ClockTab {
  return tabs.find((tab) => tab === asked) ?? ClockTab.Hours;
}

/** The days the month's list shows: up to today, newest first. Days still to come are left out. */
export function listedDays(days: readonly ClockDay[]): ClockDay[] {
  return days.filter((day) => !day.isLater).reverse();
}

/** The days an Admin can correct, newest first, in the same order as the List above them. */
export function correctableDays(days: readonly ClockDay[]): ClockDay[] {
  return days.filter((day) => day.isCorrectable).reverse();
}

/** One page of `items`; a page past the end gives the last one. */
export function pageOf<Item>(items: readonly Item[], page: number, pageSize: number): Item[] {
  const last = Math.max(1, Math.ceil(items.length / pageSize));
  const shown = Math.min(Math.max(1, Math.floor(page)), last);
  return items.slice((shown - 1) * pageSize, shown * pageSize);
}

type Rule = readonly [applies: (day: ClockDay) => boolean, status: DayStatus];

/** A day with a clock-in: the first that applies, else a full day. */
const WORKED_RULES: readonly Rule[] = [
  [(day) => day.isMissingClockOut, DayStatus.NoClockOut],
  [(day) => day.isShort, DayStatus.ShortDay],
  [(day) => day.isStillIn, DayStatus.StillIn],
];

/** A day with no clock-in: the first that applies, else nothing to say. */
const EMPTY_RULES: readonly Rule[] = [
  [(day) => day.holiday !== null, DayStatus.Holiday],
  [(day) => day.isDayOff, DayStatus.DayOff],
  [(day) => day.isToday, DayStatus.NotInYet],
  [(day) => day.isNotIn, DayStatus.NotIn],
];

/** What a day's Status says in the month's list, from the server's own marks for the day. */
export function dayStatus(day: ClockDay): DayStatus {
  const isWorked = day.sessions.length > 0;
  const rule = (isWorked ? WORKED_RULES : EMPTY_RULES).find(([applies]) => applies(day));
  if (rule !== undefined) return rule[1];
  return isWorked ? DayStatus.FullDay : DayStatus.None;
}

/** The weekday's name of a day ("YYYY-MM-DD"), e.g. "Thursday"; "" if it isn't a day. */
export function weekdayName(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(day.getTime()) ? "" : (WEEKDAY_NAMES[day.getUTCDay()] ?? "");
}
