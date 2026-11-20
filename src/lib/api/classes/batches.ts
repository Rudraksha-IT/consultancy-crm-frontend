import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { BATCH_TIMINGS, TEST_TYPES, type TestType } from "@/constants/batches";

import { getJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";

const PersonSchema = z.object({ id: z.number().int(), name: z.string() });

/** A share of class days attended, or null before any day is marked. */
const AttendedSchema = z.number().int().min(0).max(100).nullable();

const BatchFields = {
  id: z.number().int(),
  name: z.string().min(1),
  test_type: z.enum(TEST_TYPES),
  teacher: PersonSchema,
  time_slot: z.string().min(1),
  starts_on: z.iso.date(),
  ends_on: z.iso.date(),
  timing: z.enum(BATCH_TIMINGS),
  student_count: z.number().int().nonnegative(),
  /** Whether anyone in the class is marked today (spec 85). */
  attendance_taken_today: z.boolean(),
  can_change: z.boolean(),
};

type BatchFromApi = z.infer<z.ZodObject<typeof BatchFields>>;

function toBatch(batch: BatchFromApi) {
  return {
    id: batch.id,
    name: batch.name,
    testType: batch.test_type,
    teacher: batch.teacher,
    timeSlot: batch.time_slot,
    startsOn: batch.starts_on,
    endsOn: batch.ends_on,
    timing: batch.timing,
    studentCount: batch.student_count,
    attendanceTakenToday: batch.attendance_taken_today,
    canChange: batch.can_change,
  };
}

/** One class as a list shows it (spec 83). Dates are AD, "YYYY-MM-DD". */
export const BatchSchema = z.object(BatchFields).transform(toBatch);

export type Batch = z.infer<typeof BatchSchema>;

const MemberSchema = z
  .object({ id: RecordIdSchema, name: z.string(), attended_percent: AttendedSchema })
  .transform((member) => ({
    id: member.id,
    name: member.name,
    attendedPercent: member.attended_percent,
  }));

export type BatchMember = z.infer<typeof MemberSchema>;

/** One class with its Students by name. Teachers get only these, never finances. */
export const BatchWithStudentsSchema = z
  .object({ ...BatchFields, students: z.array(MemberSchema) })
  .transform(({ students, ...batch }) => ({ ...toBatch(batch), students }));

export type BatchWithStudents = z.infer<typeof BatchWithStudentsSchema>;

const PageFields = {
  count: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
};

/** One page of classes. */
export const BatchPageSchema = z
  .object({ ...PageFields, results: z.array(BatchSchema) })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    batches: page.results,
  }));

export type BatchPage = z.infer<typeof BatchPageSchema>;

const EnrolledStudentSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string(),
    batches: z.array(PersonSchema),
    attended_percent: AttendedSchema,
  })
  .transform((student) => ({
    id: student.id,
    name: student.name,
    batches: student.batches,
    attendedPercent: student.attended_percent,
  }));

export type EnrolledStudent = z.infer<typeof EnrolledStudentSchema>;

/** One page of the Students in classes. */
export const EnrolledStudentPageSchema = z
  .object({ ...PageFields, results: z.array(EnrolledStudentSchema) })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    students: page.results,
  }));

export type EnrolledStudentPage = z.infer<typeof EnrolledStudentPageSchema>;

/** Someone who can teach a class: an active Teacher. */
export const BatchTeacherSchema = PersonSchema;

export type BatchTeacher = z.infer<typeof BatchTeacherSchema>;

/** A class as the class form sends it. */
export type BatchForm = {
  name: string;
  testType: TestType;
  teacherId: number;
  timeSlot: string;
  /** AD, "YYYY-MM-DD". */
  startsOn: string;
  endsOn: string;
};

const FORM_FIELDS: Record<keyof BatchForm, string> = {
  name: "name",
  testType: "test_type",
  teacherId: "teacher",
  timeSlot: "time_slot",
  startsOn: "starts_on",
  endsOn: "ends_on",
};

function formBody(batch: BatchForm) {
  return {
    name: batch.name,
    test_type: batch.testType,
    teacher: batch.teacherId,
    time_slot: batch.timeSlot,
    starts_on: batch.startsOn,
    ends_on: batch.endsOn,
  };
}

/** One page of the classes I can see: running and upcoming first (spec 22, 83). */
export function fetchBatches(page: number, fetchFn: typeof fetch = fetch): Promise<BatchPage> {
  const query = new URLSearchParams({ page: String(page) });
  return getJson(`${API_PATHS.batches}?${query.toString()}`, BatchPageSchema, fetchFn);
}

/** One class with its Students. */
export function fetchBatch(id: number, fetchFn: typeof fetch = fetch): Promise<BatchWithStudents> {
  return getJson(API_PATHS.batch(id), BatchWithStudentsSchema, fetchFn);
}

/** Create a class (spec 83). Rejects with `InvalidFieldsError` for refused fields. */
export async function createBatch(
  batch: BatchForm,
  fetchFn: typeof fetch = fetch,
): Promise<BatchWithStudents> {
  try {
    return await postJson(API_PATHS.batches, formBody(batch), BatchWithStudentsSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, FORM_FIELDS) ?? error;
  }
}

/** Save a whole class (spec 83). Rejects with `InvalidFieldsError` for refused fields. */
export async function saveBatch(
  id: number,
  batch: BatchForm,
  fetchFn: typeof fetch = fetch,
): Promise<BatchWithStudents> {
  try {
    return await putJson(API_PATHS.batch(id), formBody(batch), BatchWithStudentsSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, FORM_FIELDS) ?? error;
  }
}

/** Put a Student in a class (spec 84). Rejects with `InvalidFieldsError` naming why not. */
export async function addStudentToBatch(
  batchId: number,
  studentId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<BatchWithStudents> {
  try {
    return await postJson(
      API_PATHS.batchStudents(batchId),
      { student: studentId },
      BatchWithStudentsSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { studentId: "student" }) ?? error;
  }
}

/** Take a Student out of a class (spec 84). */
export function removeStudentFromBatch(
  batchId: number,
  studentId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.batchStudent(batchId, studentId), fetchFn);
}

/** One page of the Students in classes, with their classes (spec 86a). */
export function fetchEnrolledStudents(
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<EnrolledStudentPage> {
  const query = new URLSearchParams({ page: String(page) });
  return getJson(
    `${API_PATHS.batchEnrolledStudents}?${query.toString()}`,
    EnrolledStudentPageSchema,
    fetchFn,
  );
}

/** Who can teach a class, by name. */
export function fetchBatchTeachers(fetchFn: typeof fetch = fetch): Promise<BatchTeacher[]> {
  return getJson(API_PATHS.batchTeachers, z.array(BatchTeacherSchema), fetchFn);
}
