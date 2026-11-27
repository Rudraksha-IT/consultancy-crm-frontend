import { OFFICE_TIME_ZONE } from "@/constants/clock";

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const NOON = 12;

/** A length of time as people say it, e.g. "8 h 25 min", "1 h", "40 min". */
export function durationText(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(whole / MINUTES_PER_HOUR);
  const rest = whole % MINUTES_PER_HOUR;
  if (hours > 0 && rest > 0) return `${String(hours)} h ${String(rest)} min`;
  return hours > 0 ? `${String(hours)} h` : `${String(rest)} min`;
}

/** A day's hours in a calendar cell, e.g. "8h 24m". */
export function shortHours(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  const rest = String(whole % MINUTES_PER_HOUR).padStart(2, "0");
  return `${String(Math.floor(whole / MINUTES_PER_HOUR))}h ${rest}m`;
}

/** Hours with at most one decimal, e.g. 480 -> "8 h", 450 -> "7.5 h". */
export function hoursText(minutes: number): string {
  return `${String(Math.round((minutes / MINUTES_PER_HOUR) * 10) / 10)} h`;
}

type OfficeClock = { day: string; hour: number; minute: number };

const OFFICE_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: OFFICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** A moment from the API as the office's clock shows it (Asia/Kathmandu); null if not one. */
export function officeClock(iso: string): OfficeClock | null {
  const moment = new Date(iso);
  if (Number.isNaN(moment.getTime())) return null;
  const parts = Object.fromEntries(
    OFFICE_PARTS.formatToParts(moment).map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year ?? ""}-${parts.month ?? ""}-${parts.day ?? ""}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** The office's time of a moment, e.g. "9:02 AM"; "—" if it isn't one. */
export function officeTime(iso: string): string {
  const clock = officeClock(iso);
  if (clock === null) return "—";
  const half = clock.hour < NOON ? "AM" : "PM";
  return `${String(clock.hour % NOON || NOON)}:${String(clock.minute).padStart(2, "0")} ${half}`;
}

/** The office's time of a moment as "HH:MM" (24 hours), for a time field; "" if not one. */
export function officeHhMm(iso: string): string {
  const clock = officeClock(iso);
  if (clock === null) return "";
  return `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`;
}

/**
 * Minutes since clocking in, from the server's own clock: the server's "now" when it answered,
 * plus however long ago (by the browser's steady clock) that answer came. The browser's own time
 * of day is never used.
 */
export function elapsedMinutes(clockedInAt: string, serverNow: string, sinceAnswerMs: number) {
  const worked = Date.parse(serverNow) - Date.parse(clockedInAt) + Math.max(0, sinceAnswerMs);
  return Number.isNaN(worked) ? 0 : Math.max(0, Math.floor(worked / MINUTE_MS));
}

/** How many empty cells come before the 1st in a Sunday-first calendar of `month` ("YYYY-MM"). */
export function leadingBlanks(month: string): number {
  const [year, number] = month.split("-").map(Number);
  if (year === undefined || number === undefined) return 0;
  return new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
}

export {
  clockTabFrom,
  clockViewFrom,
  correctableDays,
  dayStatus,
  listedDays,
  pageOf,
  weekdayName,
} from "./monthList";
