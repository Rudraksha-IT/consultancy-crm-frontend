import { API_PATHS } from "@/constants/api";
import { studentListQuery, type StudentFilters } from "@/lib/students";

import { getJson, postJson } from "./client";
import { toFieldErrors } from "./fieldErrors";
import {
  NEW_STUDENT_API_FIELDS,
  StudentPageSchema,
  StudentSchema,
  type NewStudent,
  type Student,
  type StudentPage,
} from "./types";

/** One page of the Students matching the search and filters, newest first. */
export function fetchStudents(
  filters: StudentFilters,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<StudentPage> {
  const path = `${API_PATHS.students}${studentListQuery(filters, page)}`;
  return getJson(path, StudentPageSchema, fetchFn);
}

/**
 * Add a new visitor as a Lead. Rejects with `InvalidFieldsError` when the API refuses some of
 * the input.
 */
export async function addStudent(
  student: NewStudent,
  fetchFn: typeof fetch = fetch,
): Promise<Student> {
  try {
    return await postJson(API_PATHS.students, toApiFields(student), StudentSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, NEW_STUDENT_API_FIELDS) ?? error;
  }
}

function toApiFields(student: NewStudent): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = {
    [NEW_STUDENT_API_FIELDS.name]: student.name,
    [NEW_STUDENT_API_FIELDS.phone]: student.phone,
    [NEW_STUDENT_API_FIELDS.email]: student.email,
    [NEW_STUDENT_API_FIELDS.country]: student.country,
    [NEW_STUDENT_API_FIELDS.source]: student.source,
    [NEW_STUDENT_API_FIELDS.highestQualification]: student.highestQualification,
    [NEW_STUDENT_API_FIELDS.pastDegree]: student.pastDegree,
    [NEW_STUDENT_API_FIELDS.previousJob]: student.previousJob,
    [NEW_STUDENT_API_FIELDS.note]: student.note,
    [NEW_STUDENT_API_FIELDS.assignedCounsellor]: counsellorId(student.assignedCounsellor),
  };
  if (student.subAgentName !== "") {
    fields[NEW_STUDENT_API_FIELDS.subAgentName] = student.subAgentName;
  }
  return fields;
}

/** The chosen Staff id, or null for "Decide later" (anything that isn't an id). */
function counsellorId(value: string): number | null {
  return /^[1-9][0-9]*$/.test(value) ? Number(value) : null;
}
