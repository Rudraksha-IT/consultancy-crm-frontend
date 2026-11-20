import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { Stage } from "@/constants/stages";
import { VISIT_KINDS, type VisitReason } from "@/constants/visits";

import { getJson, postJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";

const PERCENT_MAX = 100;
const Count = z.number().int().nonnegative();

/** One time a Student came to the office: when, New or Follow-up, why, and who logged it. */
const VisitSchema = z
  .object({
    id: RecordIdSchema,
    kind: z.enum(VISIT_KINDS),
    purpose: z.string(),
    at: z.iso.datetime({ offset: true }),
    // Who logged it; the id is gone if their account was ever removed, the name stays.
    recorded_by: z.object({ id: z.number().int().nullable(), name: z.string() }),
  })
  .transform(({ recorded_by, ...visit }) => ({ ...visit, recordedBy: recorded_by }));

export type Visit = z.infer<typeof VisitSchema>;

/** A Visit on today's timeline, with its Student and the first line of their Note. */
const TimelineVisitSchema = z
  .object({
    id: RecordIdSchema,
    kind: z.enum(VISIT_KINDS),
    purpose: z.string(),
    at: z.iso.datetime({ offset: true }),
    recorded_by: z.object({ id: z.number().int().nullable(), name: z.string() }),
    student: z.object({ id: RecordIdSchema, name: z.string(), note_first_line: z.string() }),
  })
  .transform(({ recorded_by, student, ...visit }) => ({
    ...visit,
    recordedBy: recorded_by,
    student: { id: student.id, name: student.name, noteFirstLine: student.note_first_line },
  }));

export type TimelineVisit = z.infer<typeof TimelineVisitSchema>;

const TodaysVisitsSchema = z
  .object({ count: Count, results: z.array(TimelineVisitSchema) })
  .transform(({ count, results }) => ({ count, visits: results }));

export type TodaysVisits = z.infer<typeof TodaysVisitsSchema>;

const VisitPageSchema = z
  .object({
    count: Count,
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(VisitSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    visits: page.results,
  }));

export type VisitPage = z.infer<typeof VisitPageSchema>;

const StudentProgressSchema = z
  .object({
    stage: z.enum(Stage),
    percent: z.number().int().min(0).max(PERCENT_MAX),
    next_step: z.string(),
    is_done: z.boolean(),
  })
  .transform(({ next_step, is_done, ...progress }) => ({
    ...progress,
    nextStep: next_step,
    isDone: is_done,
  }));

export type StudentProgress = z.infer<typeof StudentProgressSchema>;

/** Why a returning Student came in, and anything more to say. */
export type NewVisit = { reason: VisitReason; details: string };
export type NewVisitField = keyof NewVisit;

/** The office's Visits today, newest first (the visitor desk's timeline, spec 23b). */
export function fetchTodaysVisits(fetchFn: typeof fetch = fetch): Promise<TodaysVisits> {
  return getJson(API_PATHS.visitsToday, TodaysVisitsSchema, fetchFn);
}

/** One page of a Student's Visits, newest first (their Activity, spec 23c). */
export function fetchStudentVisits(
  studentId: RecordId,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<VisitPage> {
  const query = new URLSearchParams({ page: String(page) }).toString();
  return getJson(`${API_PATHS.studentVisits(studentId)}?${query}`, VisitPageSchema, fetchFn);
}

/**
 * Log a returning Student's Visit, made now (spec 23a). Rejects with `InvalidFieldsError` when
 * the API refuses the reason or details.
 */
export async function logVisit(
  studentId: RecordId,
  visit: NewVisit,
  fetchFn: typeof fetch = fetch,
): Promise<Visit> {
  try {
    return await postJson(API_PATHS.studentVisits(studentId), visit, VisitSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { reason: "reason", details: "details" }) ?? error;
  }
}

/** How far along one Student is and their next step, for the visitor desk. */
export function fetchStudentProgress(
  studentId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProgress> {
  return getJson(API_PATHS.studentProgress(studentId), StudentProgressSchema, fetchFn);
}
