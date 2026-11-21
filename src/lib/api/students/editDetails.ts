import type { RecordId } from "@/lib/recordId";
import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { putJson } from "../core/client";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  academicRecordBody,
  detailsBody,
  testScoreBody,
  workExperienceBody,
} from "./studentProfile";
import {
  ACADEMIC_RECORD_API_FIELDS,
  STUDENT_DETAILS_FORM_API_FIELDS,
  StudentProfileSchema,
  TEST_SCORE_API_FIELDS,
  WORK_EXPERIENCE_API_FIELDS,
  type AcademicRecordInput,
  type StudentDetailsChange,
  type StudentProfile,
  type TestScoreInput,
  type WorkExperienceInput,
} from "../core/types";

/** A stored row (with its id) or a new one (id null). */
type Row<Input> = Input & { id: RecordId | null };

/** The three lists on the Edit details page, by their frontend names. */
export const EDIT_LISTS = ["academicRecords", "testScores", "workExperience"] as const;

export type EditList = (typeof EDIT_LISTS)[number];

/**
 * Everything the Edit details page saves at once (issue 81): the version the page opened with,
 * the details as typed, and each list whole (a stored row left out is removed).
 */
export type EditDetailsInput = {
  version: number;
  details: StudentDetailsChange;
  academicRecords: Row<AcademicRecordInput>[];
  testScores: Row<TestScoreInput>[];
  workExperience: Row<WorkExperienceInput>[];
};

const LIST_API: Record<EditList, { name: string; fields: Record<string, string> }> = {
  academicRecords: { name: "academic_records", fields: ACADEMIC_RECORD_API_FIELDS },
  testScores: { name: "test_scores", fields: TEST_SCORE_API_FIELDS },
  workExperience: { name: "work_experience", fields: WORK_EXPERIENCE_API_FIELDS },
};

/**
 * Save the whole Edit details page, or nothing. Rejects with `InvalidFieldsError` naming each
 * refused field as the form does ("permanentAddress.ward"), a refused row's field as
 * "academicRecords.<row number sent>.institution" and a whole list as "academicRecords"; and with
 * `ApiRequestError` for anything else, such as 409 when someone changed the Student meanwhile.
 */
export async function saveEditDetails(
  id: RecordId,
  input: EditDetailsInput,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  try {
    return await putJson(API_PATHS.studentDetails(id), body(input), StudentProfileSchema, fetchFn);
  } catch (error) {
    throw refusal(error) ?? error;
  }
}

function body(input: EditDetailsInput): Record<string, unknown> {
  return {
    version: input.version,
    ...detailsBody(input.details),
    academic_records: input.academicRecords.map((row) => withId(row, academicRecordBody(row))),
    test_scores: input.testScores.map((row) => withId(row, testScoreBody(row))),
    work_experience: input.workExperience.map((row) => withId(row, workExperienceBody(row))),
  };
}

function withId(row: { id: RecordId | null }, sent: Record<string, unknown>) {
  return row.id === null ? sent : { id: row.id, ...sent };
}

/** The 400 refusal in frontend names, or null when it isn't one the form can show. */
function refusal(error: unknown): InvalidFieldsError<string> | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const fieldErrors = formErrors(flatten(error.body, ""));
  return Object.keys(fieldErrors).length === 0 ? null : new InvalidFieldsError(fieldErrors);
}

/** The refusals the form has a place for, by its names. */
function formErrors(flat: Record<string, string[]>): Record<string, string[]> {
  const named: Record<string, string[]> = {};
  for (const [path, messages] of Object.entries(flat)) {
    const name = formName(path);
    if (name !== null) named[name] = messages;
  }
  return named;
}

const DETAIL_NAMES = new Map<string, string>(
  Object.entries(STUDENT_DETAILS_FORM_API_FIELDS).map(([form, api]) => [api, form]),
);

const WHOLE_NUMBER = /^\d+$/;

/** "academic_records.1.finished_year" -> "academicRecords.1.finishedYear"; unknown -> null. */
function formName(path: string): string | null {
  return DETAIL_NAMES.get(path) ?? listFieldName(path.split("."));
}

function listFieldName([listName, row, field]: string[]): string | null {
  const list = EDIT_LISTS.find((known) => LIST_API[known].name === listName);
  if (list === undefined || row === undefined) return null;
  return field === undefined ? listMessageName(list, row) : rowFieldName(list, row, field);
}

/** A message about a whole list, e.g. too many rows. */
function listMessageName(list: EditList, key: string): string | null {
  return key === "non_field_errors" ? list : null;
}

function rowFieldName(list: EditList, row: string, field: string): string | null {
  const formField = Object.entries(LIST_API[list].fields).find(([, api]) => api === field)?.[0];
  return WHOLE_NUMBER.test(row) && formField !== undefined ? `${list}.${row}.${formField}` : null;
}

/** Nested refusals as dotted paths to their messages; anything not text is dropped. */
function flatten(value: unknown, prefix: string): Record<string, string[]> {
  if (Array.isArray(value)) return messagesAt(value, prefix);
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, inner]) =>
      Object.entries(flatten(inner, joined(prefix, key))),
    ),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function joined(prefix: string, key: string): string {
  return prefix === "" ? key : `${prefix}.${key}`;
}

function messagesAt(values: unknown[], path: string): Record<string, string[]> {
  const messages = values.filter((item): item is string => typeof item === "string");
  return messages.length > 0 ? { [path]: messages } : {};
}
