import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { ATTENDANCE_MARKS, type AttendanceMark } from "@/constants/batches";

import { getJson, putJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";

const MarkSchema = z.enum(ATTENDANCE_MARKS);

/** A share of class days attended, or null before any day is marked. */
const AttendedSchema = z.number().int().min(0).max(100).nullable();

/** Each marked Student's mark, by Student id; Students not marked that day are left out. */
export type DayMarks = Partial<Record<RecordId, AttendanceMark>>;

/** One class day (spec 85): who is marked how, and whether this person may change it. */
export const AttendanceDaySchema = z
  .object({
    day: z.iso.date(),
    can_mark: z.boolean(),
    marks: z.array(z.object({ student: RecordIdSchema, mark: MarkSchema.nullable() })),
  })
  .transform((answer) => {
    const marks: DayMarks = {};
    for (const { student, mark } of answer.marks) {
      if (mark !== null) marks[student] = mark;
    }
    return { day: answer.day, canMark: answer.can_mark, marks };
  });

export type AttendanceDay = z.infer<typeof AttendanceDaySchema>;

/** One class a Student is in, with their Attendance in it (spec 86). */
export const StudentClassSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string().min(1),
    time_slot: z.string(),
    attended_percent: AttendedSchema,
    recent_days: z.array(z.object({ day: z.iso.date(), mark: MarkSchema.nullable() })),
  })
  .transform((entry) => ({
    id: entry.id,
    name: entry.name,
    timeSlot: entry.time_slot,
    attendedPercent: entry.attended_percent,
    recentDays: entry.recent_days,
  }));

export type StudentClass = z.infer<typeof StudentClassSchema>;

/** A class day as the API names it: AD, "YYYY-MM-DD". Anything else never reaches a URL. */
const DaySchema = z.iso.date();

function dayPath(batchId: RecordId, day: string): string {
  return API_PATHS.batchAttendance(batchId, DaySchema.parse(day));
}

/** One class day's marks. */
export function fetchAttendanceDay(
  batchId: RecordId,
  day: string,
  fetchFn: typeof fetch = fetch,
): Promise<AttendanceDay> {
  return Promise.resolve()
    .then(() => dayPath(batchId, day))
    .then((path) => getJson(path, AttendanceDaySchema, fetchFn));
}

/**
 * Save a class day's marks (spec 85); Students left out are unmarked that day. Rejects with
 * `InvalidFieldsError` naming the refused day or marks.
 */
export async function saveAttendanceDay(
  batchId: RecordId,
  day: string,
  marks: DayMarks,
  fetchFn: typeof fetch = fetch,
): Promise<AttendanceDay> {
  const body = {
    marks: Object.entries(marks).map(([student, mark]) => ({ student, mark })),
  };
  try {
    return await putJson(dayPath(batchId, day), body, AttendanceDaySchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { day: "day", marks: "marks" }) ?? error;
  }
}

/** The classes a Student is in, by name, with their Attendance (spec 86). */
export function fetchStudentClasses(
  studentId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentClass[]> {
  return getJson(API_PATHS.studentBatches(studentId), z.array(StudentClassSchema), fetchFn);
}
