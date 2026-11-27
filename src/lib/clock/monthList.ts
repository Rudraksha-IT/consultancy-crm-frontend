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

/**
 * The month before or after `month` among the months offered (newest first, as `recentMonths`
 * gives them), or null at either end or when `month` is not one of them.
 */
export function monthBeside(
  months: readonly string[],
  month: string,
  toward: "older" | "newer",
): string | null {
  const at = months.indexOf(month);
  if (at < 0) return null;
  return months[toward === "older" ? at + 1 : at - 1] ?? null;
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
