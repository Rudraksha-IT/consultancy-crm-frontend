import type { RecordId } from "@/lib/recordId";
import { API_PATHS } from "@/constants/api";

import { getJson, putJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import {
  ACADEMIC_RECORD_API_FIELDS,
  HistoryPageSchema,
  NOTE_API_FIELDS,
  STUDENT_DETAILS_API_FIELDS,
  StudentProfileSchema,
  TEST_SCORE_API_FIELDS,
  WORK_EXPERIENCE_API_FIELDS,
  type AcademicRecordInput,
  type AddressInput,
  type HistoryPage,
  type StudentDetails,
  type StudentDetailsChange,
  type StudentProfile,
  type TestScoreInput,
  type WorkExperienceInput,
} from "../core/types";

const WHOLE_NUMBER = /^[0-9]+$/;

/** The details sent as dates ("" is none, sent as null). */
const DATE_FIELDS = ["dateOfBirth", "passportIssueDate", "passportExpiryDate"] as const;

const ADDRESS_FIELDS = ["permanentAddress", "mailingAddress"] as const;

type AddressField = (typeof ADDRESS_FIELDS)[number];

/** One Student's profile. A missing Student rejects with an `ApiRequestError` of status 404. */
export function fetchStudentProfile(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  return getJson(API_PATHS.student(id), StudentProfileSchema, fetchFn);
}

function isDetailsField(field: string): field is keyof StudentDetails {
  return field in STUDENT_DETAILS_API_FIELDS;
}

function isAddressField(field: string): field is AddressField {
  return ADDRESS_FIELDS.some((known) => known === field);
}

export function detailsBody(changes: StudentDetailsChange): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(changes)) {
    if (isDetailsField(field)) {
      body[STUDENT_DETAILS_API_FIELDS[field]] = bodyValue(field, value);
    }
  }
  return body;
}

function bodyValue(field: string, value: unknown): unknown {
  if (DATE_FIELDS.some((known) => known === field) && typeof value === "string") {
    return emptyAsNull(value);
  }
  if (isAddressField(field) && isAddressInput(value)) {
    return { ...value, ward: wardValue(value.ward) };
  }
  return value;
}

/** A ward as typed: "" is none; a ward that isn't a number goes as typed, so the server explains. */
function wardValue(ward: string): number | string | null {
  const typed = ward.trim();
  if (typed === "") return null;
  return WHOLE_NUMBER.test(typed) ? Number(typed) : typed;
}

function isAddressInput(value: unknown): value is AddressInput {
  return isRecord(value) && typeof value.ward === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Replace the Student's Note. The API keeps the old text in History. */
export async function saveNote(
  id: RecordId,
  note: string,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  try {
    return await putJson(API_PATHS.studentNote(id), { note }, StudentProfileSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, NOTE_API_FIELDS) ?? error;
  }
}

/** One page of the Student's History, newest first. */
export function fetchStudentHistory(
  id: RecordId,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<HistoryPage> {
  const query = page > 1 ? `?page=${String(page)}` : "";
  return getJson(`${API_PATHS.studentHistory(id)}${query}`, HistoryPageSchema, fetchFn);
}

export function academicRecordBody(
  input: AcademicRecordInput,
): Record<string, string | number | null> {
  const fields = ACADEMIC_RECORD_API_FIELDS;
  const year = input.finishedYear.trim();
  return {
    [fields.level]: input.level,
    [fields.institution]: input.institution,
    // A year that isn't a number goes as typed, so the server explains what's wrong.
    [fields.finishedYear]: year === "" ? null : WHOLE_NUMBER.test(year) ? Number(year) : year,
    [fields.result]: input.result,
  };
}

export function testScoreBody(input: TestScoreInput): Record<string, string | null> {
  const fields = TEST_SCORE_API_FIELDS;
  return {
    [fields.test]: input.test,
    [fields.overall]: input.overall.trim(),
    [fields.takenOn]: emptyAsNull(input.takenOn),
    [fields.details]: input.details,
  };
}

export function workExperienceBody(input: WorkExperienceInput): Record<string, string | null> {
  const fields = WORK_EXPERIENCE_API_FIELDS;
  return {
    [fields.employer]: input.employer,
    [fields.jobTitle]: input.jobTitle,
    [fields.startedOn]: input.startedOn,
    [fields.endedOn]: emptyAsNull(input.endedOn),
  };
}

function emptyAsNull(value: string): string | null {
  return value === "" ? null : value;
}
