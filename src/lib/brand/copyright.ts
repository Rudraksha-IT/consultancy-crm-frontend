import { OFFICE_TIME_ZONE } from "@/constants/clock";

/*
 * The copyright line shown on the product (owner, 2026-11-27): the first year alone while it is
 * still that year; after it, the first year to this one, so it never needs a change by hand. The
 * backend's emails use the same words (config/copyright.py).
 */

export const COPYRIGHT_HOLDER = "Rudraksha Labs";
export const FIRST_YEAR = 2026;

const YEAR_IN_NEPAL = new Intl.DateTimeFormat("en", {
  timeZone: OFFICE_TIME_ZONE,
  year: "numeric",
});

/** The year at `now` in Nepal, where the year turns at midnight Kathmandu time. */
export function yearInNepal(now: Date = new Date()): number {
  return Number(YEAR_IN_NEPAL.format(now));
}

/** "© 2026 Rudraksha Labs. All rights reserved.", or "© 2026-2028 …" from 2028. */
export function copyrightLine(year: number): string {
  const years = year <= FIRST_YEAR ? String(FIRST_YEAR) : `${String(FIRST_YEAR)}-${String(year)}`;
  return `© ${years} ${COPYRIGHT_HOLDER}. All rights reserved.`;
}
