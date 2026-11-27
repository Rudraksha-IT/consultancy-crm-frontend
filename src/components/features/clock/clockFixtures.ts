import type { RecordId } from "@/lib/recordId";
import { uid } from "@/test/ids";

/** Test-only: Clock-in answers as the server writes them (issue 56). */

type SessionAnswer = {
  id: RecordId;
  clocked_in_at: string;
  clocked_out_at: string | null;
  missing_clock_out: boolean;
  added_by_correction: boolean;
  clock_out_by_correction: boolean;
  work_from_home: boolean;
};

type DayAnswer = {
  date: string;
  minutes: number;
  first_in: string | null;
  last_out: string | null;
  day_off: boolean;
  later: boolean;
  today: boolean;
  not_in: boolean;
  missing_clock_out: boolean;
  still_in: boolean;
  short: boolean;
  corrected: boolean;
  correctable: boolean;
  home: boolean;
  holiday: string | null;
  sessions: SessionAnswer[];
};

/** A session from `start` to `end` ("HH:MM" in Kathmandu, UTC+5:45) on `date`. */
export function session(
  id: RecordId,
  date: string,
  start: string,
  end: string | null,
): SessionAnswer {
  return {
    id,
    clocked_in_at: `${date}T${start}:00+05:45`,
    clocked_out_at: end === null ? null : `${date}T${end}:00+05:45`,
    missing_clock_out: end === null,
    added_by_correction: false,
    clock_out_by_correction: false,
    work_from_home: false,
  };
}

const FULL = session(uid(1), "2026-11-02", "09:02", "17:26");
const SHORT = session(uid(2), "2026-11-03", "09:00", "13:00");
const FORGOTTEN = session(uid(3), "2026-11-04", "09:00", null);

/** The worked days of the month, by day number. */
const WORKED: Partial<Record<number, Partial<DayAnswer>>> = {
  2: {
    minutes: 504,
    first_in: FULL.clocked_in_at,
    last_out: FULL.clocked_out_at,
    not_in: false,
    correctable: false,
    corrected: true,
    sessions: [{ ...FULL, clock_out_by_correction: true }],
  },
  3: {
    minutes: 240,
    first_in: SHORT.clocked_in_at,
    last_out: SHORT.clocked_out_at,
    not_in: false,
    short: true,
    sessions: [SHORT],
  },
  4: {
    first_in: FORGOTTEN.clocked_in_at,
    not_in: false,
    missing_clock_out: true,
    sessions: [FORGOTTEN],
  },
};

const TODAY = 5;
const SATURDAY = 6;

function dayOf(
  number: number,
  holidays: Partial<Record<number, string>>,
  today: number,
): DayAnswer {
  const holiday = holidays[number] ?? null;
  const date = `2026-11-${String(number).padStart(2, "0")}`;
  const isSaturday = new Date(`${date}T12:00:00Z`).getUTCDay() === SATURDAY;
  const isPastWorkingDay = number < today && !isSaturday && holiday === null;
  return {
    date,
    minutes: 0,
    first_in: null,
    last_out: null,
    day_off: isSaturday,
    later: number > today,
    today: number === today,
    not_in: isPastWorkingDay,
    missing_clock_out: false,
    still_in: false,
    short: false,
    corrected: false,
    correctable: isPastWorkingDay,
    home: false,
    holiday,
    sessions: [],
    ...WORKED[number],
  };
}

/**
 * November 2026 seen on Thursday the 5th: a full day, a short day, a forgotten clock-out. A later
 * `today` (the day of the month) gives more days up to today, for the List's pages.
 */
export function novemberMonth(
  staff = { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
  holidays: Partial<Record<number, string>> = {},
  today = TODAY,
) {
  return {
    month: "2026-11",
    today: `2026-11-${String(today).padStart(2, "0")}`,
    working_day_minutes: 480,
    staff,
    figures: { days_worked: 3, minutes: 744, short_days: 1, missing_clock_outs: 1, corrected: 1 },
    days: Array.from({ length: 30 }, (_, index) => dayOf(index + 1, holidays, today)),
    corrections: [
      {
        id: uid(9),
        day: "2026-11-02",
        before: "In 9:02 AM, no clock-out",
        after: "Out 5:26 PM",
        reason: "Forgot to clock out.",
        by: "Maya Shrestha",
        at: "2026-11-03T04:00:00Z",
      },
    ],
  };
}
