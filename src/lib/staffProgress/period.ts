import type { ProgressPeriod } from "@/constants/staffProgress";
import type { DateRange } from "@/lib/api";
import { addDaysIso } from "@/lib/dates";

const DAYS_FROM_MONDAY = [6, 0, 1, 2, 3, 4, 5] as const;

/** Where each period starts and ends, given today and the first day of this month. */
const RANGES: Record<
  Exclude<ProgressPeriod, "custom">,
  (today: string, first: string) => DateRange
> = {
  week: (today) => {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    return { from: addDaysIso(today, -(DAYS_FROM_MONDAY[weekday] ?? 0)), to: today };
  },
  month: (today, first) => ({ from: first, to: today }),
  last: (_, first) => {
    const lastDay = addDaysIso(first, -1);
    return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
  },
};

/**
 * The days a period covers, both included, as "YYYY-MM-DD" (AD), ending today: this week (from
 * Monday), this month, the whole of last month, or the dates picked (this month until some are).
 */
export function periodRange(period: ProgressPeriod, today: string, picked?: DateRange): DateRange {
  if (period === "custom") return picked ?? RANGES.month(today, `${today.slice(0, 7)}-01`);
  return RANGES[period](today, `${today.slice(0, 7)}-01`);
}
