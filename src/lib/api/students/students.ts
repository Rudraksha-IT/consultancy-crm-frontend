import { parseRecordId, type RecordId } from "@/lib/recordId";
import { API_PATHS } from "@/constants/api";
import type { Stage } from "@/constants/stages";
import { studentBoardQuery, studentListQuery, type StudentFilters } from "@/lib/students";

import { getJson, postJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import {
  BoardStudentPageSchema,
  NEW_STUDENT_API_FIELDS,
  StudentPageSchema,
  StudentSchema,
  type BoardStudentPage,
  type NewStudent,
  type Student,
  type StudentPage,
} from "../core/types";

/** One page of the Students matching the search and filters, newest first. */
/**
 * The High priority Students still being worked on (Lost left out), newest first: the first page
 * and the total, for Home (ticket 12). `mine` keeps a counsellor to their own Students.
 */
export function fetchHighPriorityStudents(
  { mine }: { mine: boolean },
  fetchFn: typeof fetch = fetch,
): Promise<StudentPage> {
  const query = new URLSearchParams({ priority: "high", hide_lost: "true" });
  if (mine) query.set("counsellor", "me");
  return getJson(`${API_PATHS.students}?${query.toString()}`, StudentPageSchema, fetchFn);
}

export function fetchStudents(
  filters: StudentFilters,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<StudentPage> {
  const path = `${API_PATHS.students}${studentListQuery(filters, page)}`;
  return getJson(path, StudentPageSchema, fetchFn);
}

/**
 * One page of one column of the Students board: the Students at `stage` matching the filters,
 * newest first, each with their next step and document counts (UI revamp 08).
 */
export function fetchBoardStudents(
  filters: StudentFilters,
  stage: Stage,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<BoardStudentPage> {
  const path = `${API_PATHS.students}${studentBoardQuery(filters, stage, page)}`;
  return getJson(path, BoardStudentPageSchema, fetchFn);
}

/**
 * The first page of Students matching `search` (everyone when it is empty), A to Z by name: the
 * email picker (list tidy-ups 34).
 */
export function fetchStudentsByName(
  search: string,
  fetchFn: typeof fetch = fetch,
): Promise<StudentPage> {
  const typed = search.trim();
  const query = new URLSearchParams({ ...(typed === "" ? {} : { q: typed }), order: "name" });
  return getJson(`${API_PATHS.students}?${query.toString()}`, StudentPageSchema, fetchFn);
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
function counsellorId(value: string): RecordId | null {
  return parseRecordId(value);
}
