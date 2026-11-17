import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { TEST_TYPES } from "@/constants/batches";
import { EXPENSE_CATEGORIES } from "@/constants/expenses";
import { PROGRESS_COUNTS } from "@/constants/staffProgress";
import { COUNTRIES, SOURCES } from "@/constants/students";

import { getJson } from "./client";
import { toFieldErrors } from "./fieldErrors";

const Count = z.number().int().nonnegative();
/** Whole NPR. */
const Amount = z.number().int().nonnegative();
const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** How far back the charts go (spec 99). */
export type MonthCount = 6 | 12;

/** Both ends included, AD "YYYY-MM-DD". */
export type DateRange = { from: string; to: string };

const MonthSchema = z
  .object({
    month: z.string().regex(MONTH_KEY),
    new_visitors: Count,
    signed_up: Count,
    applied: Count,
    visas_granted: Count,
    visas_refused: Count,
    lost: Count,
  })
  .transform((row) => ({
    month: row.month,
    newVisitors: row.new_visitors,
    signedUp: row.signed_up,
    applied: row.applied,
    visasGranted: row.visas_granted,
    visasRefused: row.visas_refused,
    lost: row.lost,
  }));

/** What happened to Students in one month ("YYYY-MM"). */
export type StudentMonth = z.infer<typeof MonthSchema>;

const CountryCountSchema = z.object({ country: z.enum(COUNTRIES), count: Count });

/** How many for one country. */
export type CountryCount = z.infer<typeof CountryCountSchema>;

const StudentReportSchema = z
  .object({
    months: z.array(MonthSchema),
    visas_granted_by_country: z.array(CountryCountSchema),
    countries_wanted: z.array(CountryCountSchema),
  })
  .transform((answer) => ({
    months: answer.months,
    visasGrantedByCountry: answer.visas_granted_by_country,
    countriesWanted: answer.countries_wanted,
  }));

/**
 * What happened to Students each month, and over all the months: Visas granted by the country of
 * their University, and the countries new visitors want (each most first).
 */
export type StudentReport = z.infer<typeof StudentReportSchema>;

const MoneyMonthSchema = z
  .object({
    month: z.string().regex(MONTH_KEY),
    from_students: Amount,
    from_commission: Amount,
    money_out: Amount,
  })
  .transform((row) => ({
    month: row.month,
    fromStudents: row.from_students,
    fromCommission: row.from_commission,
    moneyOut: row.money_out,
  }));

/** Money in from Students (Payments) and from Commission received, and money out, in a month. */
export type MoneyMonth = z.infer<typeof MoneyMonthSchema>;

const MoneyReportSchema = z
  .object({
    months: z.array(MoneyMonthSchema),
    money_out_by_category: z.array(
      z.object({ category: z.enum(EXPENSE_CATEGORIES), amount: Amount }),
    ),
  })
  .transform((answer) => ({
    months: answer.months,
    moneyOutByCategory: answer.money_out_by_category,
  }));

/** Money in and out each month, and what the money out went on over all the months. */
export type MoneyReport = z.infer<typeof MoneyReportSchema>;

const SourceReportSchema = z.object({
  total: Count,
  sources: z.array(z.object({ source: z.enum(SOURCES), count: Count })),
});

/** New visitors (first Visits) between two dates, per Source, most first. */
export type SourceReport = z.infer<typeof SourceReportSchema>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const PersonSchema = z.object({ id: z.number().int(), name: z.string(), is_active: z.boolean() });
const CounsellorCounts = z.object({
  students: Count,
  moved_forward: Count,
  applications_made: Count,
  visas_applied_for: Count,
  visas_granted: Count,
  students_lost: Count,
  tasks_done: Count,
});
const FrontDeskCounts = z.object({
  visitors_registered: Count,
  new_leads: Count,
  payments_taken: Count,
});
const TeacherCounts = z.object({ classes_taken: Count, attendance_marked: Count });

/** A table's row: the person, and (already checked) their counts for the period. */
function progressRow<Counts>(
  person: z.infer<typeof PersonSchema>,
  counts: Counts,
): StaffProgressRow<Counts> {
  return { id: person.id, name: person.name, isActive: person.is_active, counts };
}

const CounsellorProgressSchema = PersonSchema.extend(CounsellorCounts.shape).transform((row) =>
  progressRow(row, CounsellorCounts.parse(row)),
);
const FrontDeskProgressSchema = PersonSchema.extend(FrontDeskCounts.shape).transform((row) =>
  progressRow(row, FrontDeskCounts.parse(row)),
);
const TeacherProgressSchema = PersonSchema.extend(TeacherCounts.shape).transform((row) =>
  progressRow(row, TeacherCounts.parse(row)),
);

const StaffProgressReportSchema = z
  .object({
    counsellors: z.array(CounsellorProgressSchema),
    front_desk: z.array(FrontDeskProgressSchema),
    teachers: z.array(TeacherProgressSchema),
    counted_from: z.partialRecord(z.enum(PROGRESS_COUNTS), z.string().regex(ISO_DATE)),
  })
  .transform((report) => ({
    counsellors: report.counsellors,
    frontDesk: report.front_desk,
    teachers: report.teachers,
    countedFrom: report.counted_from,
  }));

/**
 * Reports → Staff Progress (spec 127): one table per Role, each person with their counts for the
 * period, and the counts whose recording began inside it (the day it began).
 */
export type StaffProgressReport = z.infer<typeof StaffProgressReportSchema>;

/** One person in a Staff Progress table, with that table's counts. */
export type StaffProgressRow<Counts> = {
  id: number;
  name: string;
  isActive: boolean;
  counts: Counts;
};

const ClassSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    test_type: z.enum(TEST_TYPES),
    teacher: z.string(),
    students: Count,
    attended_percent: z.number().int().min(0).max(100).nullable(),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    testType: row.test_type,
    teacher: row.teacher,
    students: row.students,
    attendedPercent: row.attended_percent,
  }));

/** One class (Batch): its Students now, and their share of class days attended (null: none marked). */
export type ClassReportRow = z.infer<typeof ClassSchema>;

const ClassReportSchema = z.object({ batches: z.array(ClassSchema) });

const RANGE_FIELDS: Record<keyof DateRange, string> = { from: "from", to: "to" };

function rangePath(path: string, range: DateRange): string {
  return `${path}?${new URLSearchParams({ from: range.from, to: range.to }).toString()}`;
}

/**
 * New visitors, sign-ups, applications, visas and Lost in each of the last 6 or 12 months, and
 * the countries over all of them.
 */
export async function fetchStudentReport(
  months: MonthCount,
  fetchFn: typeof fetch = fetch,
): Promise<StudentReport> {
  const query = new URLSearchParams({ months: String(months) });
  return getJson(`${API_PATHS.reportsStudents}?${query.toString()}`, StudentReportSchema, fetchFn);
}

/** Money in and out in each of the last 6 or 12 months, and money out by category. */
export async function fetchMoneyReport(
  months: MonthCount,
  fetchFn: typeof fetch = fetch,
): Promise<MoneyReport> {
  const query = new URLSearchParams({ months: String(months) });
  return getJson(`${API_PATHS.reportsMoney}?${query.toString()}`, MoneyReportSchema, fetchFn);
}

/** Where visitors came from between the dates. Rejects with `InvalidFieldsError` for bad dates. */
export async function fetchSourceReport(
  range: DateRange,
  fetchFn: typeof fetch = fetch,
): Promise<SourceReport> {
  try {
    return await getJson(rangePath(API_PATHS.reportsSources, range), SourceReportSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, RANGE_FIELDS) ?? error;
  }
}

/** Staff Progress for everyone between the dates. Rejects with `InvalidFieldsError` for bad dates. */
export async function fetchStaffProgressReport(
  range: DateRange,
  fetchFn: typeof fetch = fetch,
): Promise<StaffProgressReport> {
  try {
    return await getJson(
      rangePath(API_PATHS.reportsStaffProgress, range),
      StaffProgressReportSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, RANGE_FIELDS) ?? error;
  }
}

/** Each class running between the dates, with its Students and share of class days attended. */
export async function fetchClassReport(
  range: DateRange,
  fetchFn: typeof fetch = fetch,
): Promise<ClassReportRow[]> {
  try {
    const answer = await getJson(
      rangePath(API_PATHS.reportsBatches, range),
      ClassReportSchema,
      fetchFn,
    );
    return answer.batches;
  } catch (error) {
    throw toFieldErrors(error, RANGE_FIELDS) ?? error;
  }
}
