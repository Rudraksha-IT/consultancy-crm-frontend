import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import { WEEKLY_OFF_CHOICES, type WeeklyOff } from "@/constants/clock";

import { getJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { DetailAnswerSchema, MomentSchema } from "../core/types";

const DaySchema = z.iso.date();
/** The longest holiday name the server takes. */
const HOLIDAY_NAME_MAX = 60;
const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const MinutesSchema = z.number().int().nonnegative();
const CountSchema = z.number().int().nonnegative();

const MyClockSchema = z
  .object({
    now: MomentSchema,
    office_network: z.enum(["on", "off", "none"]),
    /** Why I may clock in from any network: an Admin, or on Work From Home dates (issue 87). */
    anywhere: z.enum(["admin", "work_from_home"]).nullable(),
    open: z.object({ id: RecordIdSchema, clocked_in_at: MomentSchema }).nullable(),
    forgotten_day: DaySchema.nullable(),
    today_minutes: MinutesSchema,
    last_out: MomentSchema.nullable(),
  })
  .transform((clock) => ({
    now: clock.now,
    officeNetwork: clock.office_network,
    anywhere: clock.anywhere,
    open: clock.open === null ? null : { id: clock.open.id, clockedInAt: clock.open.clocked_in_at },
    forgottenDay: clock.forgotten_day,
    todayMinutes: clock.today_minutes,
    lastOut: clock.last_out,
  }));

const ClockInAnswerSchema = z
  .object({ clock: MyClockSchema, marked_not_clocked_out: DaySchema.nullable() })
  .transform(({ clock, marked_not_clocked_out }) => ({
    clock,
    markedNotClockedOut: marked_not_clocked_out,
  }));

const ClockOutAnswerSchema = z.object({ clock: MyClockSchema, minutes: MinutesSchema });

const StaffSchema = z
  .object({ id: RecordIdSchema, name: z.string(), job_title: z.string(), has_left: z.boolean() })
  .transform((staff) => ({
    id: staff.id,
    name: staff.name,
    jobTitle: staff.job_title,
    hasLeft: staff.has_left,
  }));

const FiguresShape = {
  days_worked: CountSchema,
  minutes: MinutesSchema,
  short_days: CountSchema,
  missing_clock_outs: CountSchema,
  corrected: CountSchema,
};

type RawFigures = {
  days_worked: number;
  minutes: number;
  short_days: number;
  missing_clock_outs: number;
  corrected: number;
};

function figuresOf(figures: RawFigures) {
  return {
    daysWorked: figures.days_worked,
    minutes: figures.minutes,
    shortDays: figures.short_days,
    missingClockOuts: figures.missing_clock_outs,
    corrected: figures.corrected,
  };
}

const SessionSchema = z
  .object({
    id: RecordIdSchema,
    clocked_in_at: MomentSchema,
    clocked_out_at: MomentSchema.nullable(),
    missing_clock_out: z.boolean(),
    added_by_correction: z.boolean(),
    clock_out_by_correction: z.boolean(),
    work_from_home: z.boolean(),
  })
  .transform((session) => ({
    id: session.id,
    clockedInAt: session.clocked_in_at,
    clockedOutAt: session.clocked_out_at,
    isMissingClockOut: session.missing_clock_out,
    isAddedByCorrection: session.added_by_correction,
    isClockOutByCorrection: session.clock_out_by_correction,
    isWorkFromHome: session.work_from_home,
  }));

const DayEntrySchema = z
  .object({
    date: DaySchema,
    minutes: MinutesSchema,
    first_in: MomentSchema.nullable(),
    last_out: MomentSchema.nullable(),
    day_off: z.boolean(),
    later: z.boolean(),
    today: z.boolean(),
    not_in: z.boolean(),
    missing_clock_out: z.boolean(),
    still_in: z.boolean(),
    short: z.boolean(),
    corrected: z.boolean(),
    correctable: z.boolean(),
    /** Worked on Approved Work From Home dates, shown as "Home" (issue 87). */
    home: z.boolean(),
    /** The office's holiday on this day, by name (asked 2026-11-16). */
    holiday: z.string().max(HOLIDAY_NAME_MAX).nullable(),
    sessions: z.array(SessionSchema),
  })
  .transform((day) => ({
    date: day.date,
    minutes: day.minutes,
    firstIn: day.first_in,
    lastOut: day.last_out,
    isDayOff: day.day_off,
    isLater: day.later,
    isToday: day.today,
    isNotIn: day.not_in,
    isMissingClockOut: day.missing_clock_out,
    isStillIn: day.still_in,
    isShort: day.short,
    isCorrected: day.corrected,
    isCorrectable: day.correctable,
    isHome: day.home,
    holiday: day.holiday,
    sessions: day.sessions,
  }));

const CorrectionSchema = z.object({
  id: RecordIdSchema,
  day: DaySchema,
  before: z.string(),
  after: z.string(),
  reason: z.string(),
  by: z.string(),
  at: MomentSchema,
});

const ClockMonthSchema = z
  .object({
    month: MonthSchema,
    today: DaySchema,
    working_day_minutes: z.number().int().positive(),
    staff: StaffSchema,
    figures: z.object(FiguresShape),
    days: z.array(DayEntrySchema),
    corrections: z.array(CorrectionSchema),
  })
  .transform((month) => ({
    month: month.month,
    today: month.today,
    workingDayMinutes: month.working_day_minutes,
    staff: month.staff,
    figures: figuresOf(month.figures),
    days: month.days,
    corrections: month.corrections,
  }));

const PersonNowSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string(),
    job_title: z.string(),
    state: z.enum(["in", "left", "not_in"]),
    since: MomentSchema.nullable(),
    left_at: MomentSchema.nullable(),
  })
  .transform((person) => ({
    id: person.id,
    name: person.name,
    jobTitle: person.job_title,
    state: person.state,
    since: person.since,
    leftAt: person.left_at,
  }));

const TeamNowSchema = z
  .object({
    now: MomentSchema,
    office_network: z.enum(["on", "off", "none"]),
    clocked_in_count: CountSchema,
    people: z.array(PersonNowSchema),
  })
  .transform((team) => ({
    now: team.now,
    officeNetwork: team.office_network,
    clockedInCount: team.clocked_in_count,
    people: team.people,
  }));

const TeamMonthSchema = z
  .object({
    month: MonthSchema,
    working_day_minutes: z.number().int().positive(),
    rows: z.array(z.object({ staff: StaffSchema, ...FiguresShape })),
  })
  .transform((team) => ({
    month: team.month,
    workingDayMinutes: team.working_day_minutes,
    rows: team.rows.map(({ staff, ...figures }) => ({ staff, ...figuresOf(figures) })),
  }));

const WorkingDaySchema = z
  .object({
    minutes: z.number().int().positive(),
    weekly_off: z.enum(WEEKLY_OFF_CHOICES),
    changes: z.array(
      z.object({
        id: RecordIdSchema,
        old_minutes: z.number().int().positive(),
        new_minutes: z.number().int().positive(),
        by: z.string(),
        at: MomentSchema,
      }),
    ),
  })
  .transform(({ minutes, weekly_off, changes }) => ({
    minutes,
    weeklyOff: weekly_off,
    changes: changes.map((change) => ({
      id: change.id,
      oldMinutes: change.old_minutes,
      newMinutes: change.new_minutes,
      by: change.by,
      at: change.at,
    })),
  }));

/** Why someone may clock in from any network; null when only the office network will do. */
export type ClockAnywhere = z.infer<typeof MyClockSchema>["anywhere"];
/** Where the person is, for clocking: on an Office Network, off it, or none is set up yet. */
export type OfficeNetworkState = z.infer<typeof MyClockSchema>["officeNetwork"];
/** The Home clock (spec 103): open or not, a forgotten clock-out, today so far. */
export type MyClock = z.infer<typeof MyClockSchema>;
export type ClockMonth = z.infer<typeof ClockMonthSchema>;
export type ClockDay = ClockMonth["days"][number];
export type ClockSession = ClockDay["sessions"][number];
export type ClockCorrection = z.infer<typeof CorrectionSchema>;
export type ClockStaff = ClockMonth["staff"];
export type MonthFigures = ClockMonth["figures"];
export type TeamNow = z.infer<typeof TeamNowSchema>;
export type PersonNow = TeamNow["people"][number];
export type TeamMonth = z.infer<typeof TeamMonthSchema>;
export type TeamMonthRow = TeamMonth["rows"][number];
export type WorkingDay = z.infer<typeof WorkingDaySchema>;

const HolidaySchema = z.object({
  id: RecordIdSchema,
  date: DaySchema,
  name: z.string().min(1).max(HOLIDAY_NAME_MAX),
});
const HolidayListSchema = z.object({ holidays: z.array(HolidaySchema) });

/** A day the office is closed, set by an Admin in Configuration (asked 2026-11-16). */
export type Holiday = z.infer<typeof HolidaySchema>;
export type NewHoliday = { date: string; name: string };

/** The server refused clocking in or out, or a correction; its own short reason is the message. */
export class ClockRefusedError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ClockRefusedError";
    this.status = status;
  }
}

export const MISSING_CLOCK_OUT_FIELDS = {
  clockedOutAt: "clocked_out_at",
  reason: "reason",
} as const;
export const MISSED_TIME_FIELDS = { day: "day", from: "from", to: "to", reason: "reason" } as const;
export const WORKING_DAY_FIELDS = { minutes: "minutes" } as const;
export const HOLIDAY_FIELDS = { date: "date", name: "name" } as const;

/** My clock: whether I'm clocked in, from the server's clock. */
export function fetchMyClock(fetchFn: typeof fetch = fetch): Promise<MyClock> {
  return getJson(API_PATHS.clock, MyClockSchema, fetchFn);
}

/** Clock in now (the server's time). Rejects with `ClockRefusedError` when it isn't allowed. */
export async function clockIn(fetchFn: typeof fetch = fetch) {
  try {
    return await postJson(API_PATHS.clockIn, {}, ClockInAnswerSchema, fetchFn);
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** Clock out now (the server's time). Rejects with `ClockRefusedError` when it isn't allowed. */
export async function clockOut(fetchFn: typeof fetch = fetch) {
  try {
    return await postJson(API_PATHS.clockOut, {}, ClockOutAnswerSchema, fetchFn);
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** One month, day by day: my own, or (Admins) someone else's by their id. */
export function fetchClockMonth(
  month: string,
  staffId: RecordId | null = null,
  fetchFn: typeof fetch = fetch,
): Promise<ClockMonth> {
  const query = new URLSearchParams({ month });
  if (staffId !== null) query.set("staff", staffId);
  return getJson(`${API_PATHS.clockMonth}?${query.toString()}`, ClockMonthSchema, fetchFn);
}

/** Who's in now (Admins). */
export function fetchTeamNow(fetchFn: typeof fetch = fetch): Promise<TeamNow> {
  return getJson(API_PATHS.clockTeamNow, TeamNowSchema, fetchFn);
}

/** Everyone's month (Admins). */
export function fetchTeamMonth(month: string, fetchFn: typeof fetch = fetch): Promise<TeamMonth> {
  const query = new URLSearchParams({ month });
  return getJson(`${API_PATHS.clockTeam}?${query.toString()}`, TeamMonthSchema, fetchFn);
}

/** The Working Day and its latest changes (Admins). */
export function fetchWorkingDay(fetchFn: typeof fetch = fetch): Promise<WorkingDay> {
  return getJson(API_PATHS.clockWorkingDay, WorkingDaySchema, fetchFn);
}

/** Set the Working Day, in minutes. Rejects with `InvalidFieldsError` on `minutes`. */
export async function saveWorkingDay(
  minutes: number,
  fetchFn: typeof fetch = fetch,
): Promise<WorkingDay> {
  try {
    return await putJson(API_PATHS.clockWorkingDay, { minutes }, WorkingDaySchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, WORKING_DAY_FIELDS) ?? error;
  }
}

/** Choose the weekly days off (Admins; asked 2026-11-17); answers like the Working Day. */
export function saveWeeklyOff(
  weeklyOff: WeeklyOff,
  fetchFn: typeof fetch = fetch,
): Promise<WorkingDay> {
  return putJson(API_PATHS.clockDaysOff, { weekly_off: weeklyOff }, WorkingDaySchema, fetchFn);
}

/** This year's and later holidays, by day (Admins). */
export async function fetchHolidays(fetchFn: typeof fetch = fetch): Promise<Holiday[]> {
  const answer = await getJson(API_PATHS.clockHolidays, HolidayListSchema, fetchFn);
  return answer.holidays;
}

/** Add a holiday. Rejects with `InvalidFieldsError` on `date` or `name`. */
export async function addHoliday(
  holiday: NewHoliday,
  fetchFn: typeof fetch = fetch,
): Promise<Holiday> {
  try {
    return await postJson(API_PATHS.clockHolidays, holiday, HolidaySchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, HOLIDAY_FIELDS) ?? error;
  }
}

/** Remove a holiday. */
export function removeHoliday(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.clockHoliday(id), fetchFn);
}

/**
 * Set a forgotten clock-out ("HH:MM" on that day) with a reason. Rejects with
 * `InvalidFieldsError` on a field, or `ClockRefusedError` when the rules don't allow it.
 */
export async function setMissingClockOut(
  sessionId: RecordId,
  correction: { clockedOutAt: string; reason: string },
  fetchFn: typeof fetch = fetch,
): Promise<ClockCorrection> {
  try {
    return await postJson(
      API_PATHS.clockSetClockOut(sessionId),
      { clocked_out_at: correction.clockedOutAt, reason: correction.reason },
      CorrectionSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, MISSING_CLOCK_OUT_FIELDS) ?? refusalOf(error) ?? error;
  }
}

/**
 * Add missed time to a past short or empty day ("HH:MM" to "HH:MM") with a reason. Rejects with
 * `InvalidFieldsError` on a field, or `ClockRefusedError` when the rules don't allow it.
 */
export async function addMissedTime(
  staffId: RecordId,
  missed: { day: string; from: string; to: string; reason: string },
  fetchFn: typeof fetch = fetch,
): Promise<ClockCorrection> {
  try {
    return await postJson(API_PATHS.clockMissedTime(staffId), missed, CorrectionSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, MISSED_TIME_FIELDS) ?? refusalOf(error) ?? error;
  }
}

// The statuses the server refuses with, giving its own short reason as `detail`.
const REFUSAL_STATUSES: readonly (number | null)[] = [
  HTTP_STATUS.badRequest,
  HTTP_STATUS.forbidden,
];

function refusalOf(error: unknown): ClockRefusedError | null {
  if (!(error instanceof ApiRequestError) || !REFUSAL_STATUSES.includes(error.status)) return null;
  const parsed = DetailAnswerSchema.safeParse(error.body);
  return parsed.success ? new ClockRefusedError(parsed.data.detail, error.status ?? 0) : null;
}
