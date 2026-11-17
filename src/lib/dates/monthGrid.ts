import type { DateDisplay } from "@/constants/dates";

import { adToBs, BS_MONTHS, BS_YEARS, bsMonthDays, bsToAd } from "./bs";
import { formatMonth } from "./dates";

/** A month in the office's calendar (month 1 is January, or Baisakh in BS). */
export type CalendarMonth = { year: number; month: number };

/** One day of a month grid: its AD date (what is stored) and its number in the month shown. */
export type GridDay = { iso: string; day: number };

/** A month laid out Sunday first: its name, the blank cells before the 1st, and every day. */
export type MonthGrid = { title: string; leadingBlanks: number; days: GridDay[] };

const MONTHS_IN_A_YEAR = 12;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The month `iso` ("YYYY-MM-DD", AD) is in, in the office's calendar; null if it isn't a day. */
export function monthOf(iso: string, display: DateDisplay): CalendarMonth | null {
  if (display === "BS") {
    const bs = adToBs(iso);
    return bs === null ? null : { year: bs.year, month: bs.month };
  }
  const match = ISO_DAY.exec(iso);
  if (match === null || !isRealAdDay(iso)) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** The month laid out for a calendar, or null when it is outside the calendar. */
export function monthGrid(month: CalendarMonth, display: DateDisplay): MonthGrid | null {
  const days = display === "BS" ? bsDays(month) : adDays(month);
  const first = days[0];
  if (first === undefined) return null;
  return { title: titleOf(month, display), leadingBlanks: weekdayOf(first.iso), days };
}

/** The month `by` months later (or earlier, when negative); null past the calendar's ends. */
export function shiftMonth(
  month: CalendarMonth,
  by: number,
  display: DateDisplay,
): CalendarMonth | null {
  const index = month.year * MONTHS_IN_A_YEAR + month.month - 1 + by;
  const next = {
    year: Math.floor(index / MONTHS_IN_A_YEAR),
    month: (index % MONTHS_IN_A_YEAR) + 1,
  };
  const isInTable = next.year >= BS_YEARS.first && next.year <= BS_YEARS.last;
  return display === "BS" && !isInTable ? null : next;
}

function adDays({ year, month }: CalendarMonth): GridDay[] {
  if (month < 1 || month > MONTHS_IN_A_YEAR) return [];
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length }, (_, index) => ({
    iso: `${String(year)}-${pad(month)}-${pad(index + 1)}`,
    day: index + 1,
  }));
}

function bsDays({ year, month }: CalendarMonth): GridDay[] {
  const length = bsMonthDays(year, month) ?? 0;
  return Array.from({ length }, (_, index) => ({
    iso: bsToAd({ year, month, day: index + 1 }) ?? "",
    day: index + 1,
  }));
}

function titleOf({ year, month }: CalendarMonth, display: DateDisplay): string {
  if (display === "BS") return `${BS_MONTHS[month - 1] ?? ""} ${String(year)}`;
  return formatMonth(`${String(year)}-${pad(month)}`);
}

/** 0 for Sunday to 6 for Saturday. */
function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function isRealAdDay(iso: string): boolean {
  const moment = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(moment.getTime()) && moment.toISOString().startsWith(iso);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
