const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * An AD date as the app writes it, e.g. "2026-11-01" -> "1 Nov 2026". Read from the text, never
 * through the browser's time zone. Anything that isn't a date shows as "—". Screens use
 * `formatDate` from `./display`, which follows the office's AD/BS setting.
 */
export function formatAdDate(iso: string): string {
  const match = ISO_DATE.exec(iso);
  const month = match === null ? undefined : MONTHS[Number(match[2]) - 1];
  if (match === null || month === undefined) return "—";
  return `${String(Number(match[3]))} ${month} ${match[1] ?? ""}`;
}

/** Today's date in the browser's own calendar day, as "YYYY-MM-DD". */
export function todayIso(now: Date = new Date()): string {
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The AD date `days` after `iso` ("YYYY-MM-DD"; negative goes back); `iso` itself if not a date. */
export function addDaysIso(iso: string, days: number): string {
  const match = ISO_DATE.exec(iso);
  if (match === null) return iso;
  // Noon UTC, so no time zone moves it to another day.
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** A clock time ("HH:MM", 24-hour) as written on screen, e.g. "14:05" -> "2:05 PM". */
export function formatClockTime(value: string): string {
  const match = CLOCK.exec(value);
  if (match === null) return "—";
  const hours = Number(match[1]);
  const half = hours < NOON ? "AM" : "PM";
  return `${String(((hours + HALF_DAY - 1) % HALF_DAY) + 1)}:${match[2] ?? ""} ${half}`;
}

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const NOON = 12;
const HALF_DAY = 12;

/** Tomorrow in the browser's own calendar, as "YYYY-MM-DD": the earliest "after today" date. */
export function tomorrowIso(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return todayIso(tomorrow);
}

const INTAKE = /^(\d{4})-(\d{2})$/;

/** An Intake ("YYYY-MM", always AD) as written on screen, e.g. "2027-02" -> "Feb 2027". */
export function formatIntake(value: string): string {
  const match = INTAKE.exec(value);
  const month = match === null ? undefined : MONTHS[Number(match[2]) - 1];
  if (match === null || month === undefined) return "—";
  return `${month} ${match[1] ?? ""}`;
}

/** A moment from the API, in the browser's time, e.g. "22 Oct 2026, 13:48". */
export function formatAdDateTime(iso: string): string {
  const day = localDayIso(iso);
  return day === null ? "—" : `${formatAdDate(day)}, ${localTime(iso)}`;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The browser's calendar day of a moment from the API, as "YYYY-MM-DD"; null if it isn't one. */
export function localDayIso(iso: string): string | null {
  const moment = new Date(iso);
  return Number.isNaN(moment.getTime()) ? null : todayIso(moment);
}

/** The browser's time of a moment from the API, as "HH:MM" (call with a valid moment). */
export function localTime(iso: string): string {
  const moment = new Date(iso);
  return `${pad(moment.getHours())}:${pad(moment.getMinutes())}`;
}

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTHS_IN_A_YEAR = 12;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** A month ("YYYY-MM", AD) written in full, e.g. "2026-10" -> "October 2026"; "—" if not one. */
export function formatMonth(value: string): string {
  const match = MONTH.exec(value);
  const month = match === null ? undefined : FULL_MONTHS[Number(match[2]) - 1];
  if (match === null || month === undefined) return "—";
  return `${month} ${match[1] ?? ""}`;
}

/** The `count` months up to the one `today` ("YYYY-MM-DD") is in, newest first, as "YYYY-MM". */
export function recentMonths(today: string, count: number): string[] {
  const match = ISO_DATE.exec(today);
  if (match === null) return [];
  const start = Number(match[1]) * MONTHS_IN_A_YEAR + Number(match[2]) - 1;
  return Array.from({ length: count }, (_, back) => {
    const index = start - back;
    const year = Math.floor(index / MONTHS_IN_A_YEAR);
    return `${String(year)}-${pad((index % MONTHS_IN_A_YEAR) + 1)}`;
  });
}
