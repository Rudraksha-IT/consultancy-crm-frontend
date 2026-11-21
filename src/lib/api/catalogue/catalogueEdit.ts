import { z } from "zod";

import type { RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { CourseSchema, UniversitySchema, type Course, type University } from "./catalogueTypes";
import { getJson, patchJson, putJson, sendWithoutBody } from "../core/client";
import { ApiRequestError } from "../core/errors";

const INTAKE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** One Course on a University's edit page; `id` is null for a new one (issue 92). */
export type CourseEditInput = {
  id: RecordId | null;
  name: string;
  level: string;
  intakes: readonly string[];
  archived: boolean;
  /** The Required documents ticked: Document Type ids. */
  documents: readonly RecordId[];
};

/** Everything a University's edit page saves at once. */
export type UniversityEditInput = {
  name: string;
  country: string;
  archived: boolean;
  courses: readonly CourseEditInput[];
  /** Archived Courses to delete on this save. */
  deletedCourses: readonly RecordId[];
};

export type UniversityEditField = "name" | "country";
export type CourseEditField = "name" | "level" | "intakes" | "documents";

/** The server refused the edit page: by University field, by Course row, and anything else. */
export class UniversityEditRefusedError extends Error {
  readonly fields: Partial<Record<UniversityEditField, string[]>>;
  /** By the row's place on the page. */
  readonly rows: Record<number, Partial<Record<CourseEditField, string[]>>>;
  readonly general: string[];

  constructor(refusal: EditRefusal) {
    super("The university's edit page was refused");
    this.name = "UniversityEditRefusedError";
    this.fields = refusal.fields;
    this.rows = refusal.rows;
    this.general = refusal.general;
  }
}

/** The server refused a Catalogue change and said why in a short sentence. */
export class CatalogueRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueRefusedError";
  }
}

type EditRefusal = Pick<UniversityEditRefusedError, "fields" | "rows" | "general">;

const Messages = z.array(z.string());
const RowErrors = z
  .object({
    name: Messages,
    level: Messages,
    intakes: Messages,
    documents: Messages,
  })
  .partial();
const EditRefusalSchema = z
  .object({
    name: Messages,
    country: Messages,
    archived: Messages,
    courses: z.union([Messages, z.record(z.string().regex(/^\d+$/), RowErrors)]),
    deleted_courses: Messages,
    detail: Messages,
  })
  .partial();
const DetailSchema = z.object({ detail: z.string() });

/** One University with every Course, archived ones too (the edit page). */
export function fetchUniversity(id: RecordId, fetchFn: typeof fetch = fetch): Promise<University> {
  return getJson(API_PATHS.catalogueUniversity(id), UniversitySchema, fetchFn);
}

/**
 * Save the University and every Course on its edit page at once, or nothing. Rejects with
 * `UniversityEditRefusedError` when the server names what to fix.
 */
export async function saveUniversityEdit(
  id: RecordId,
  input: UniversityEditInput,
  fetchFn: typeof fetch = fetch,
): Promise<University> {
  const body = {
    name: input.name,
    country: input.country,
    archived: input.archived,
    courses: input.courses.map(({ id: courseId, ...row }) =>
      courseId === null ? row : { id: courseId, ...row },
    ),
    deleted_courses: input.deletedCourses,
  };
  try {
    return await putJson(API_PATHS.catalogueUniversity(id), body, UniversitySchema, fetchFn);
  } catch (error) {
    throw editRefusal(error) ?? error;
  }
}

/**
 * Delete an archived University and its Courses. Rejects with `CatalogueRefusedError` when the
 * server says why not (not archived, or something uses it).
 */
export async function deleteUniversity(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  try {
    await sendWithoutBody("DELETE", API_PATHS.catalogueUniversity(id), fetchFn);
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** Make a Course's Intakes exactly these (the list page's add and remove). */
export function setCourseIntakes(
  id: RecordId,
  intakes: readonly string[],
  fetchFn: typeof fetch = fetch,
): Promise<Course> {
  return patchJson(API_PATHS.catalogueCourse(id), { intakes }, CourseSchema, fetchFn);
}

/** The Catalogue's Intakes from this month on, for a Student's preferred Intake (spec 145). */
export function fetchUpcomingIntakes(fetchFn: typeof fetch = fetch): Promise<string[]> {
  return getJson(
    API_PATHS.catalogueIntakes,
    z.object({ intakes: z.array(z.string().regex(INTAKE)) }).transform(({ intakes }) => intakes),
    fetchFn,
  );
}

function badRequestBody(error: unknown): unknown {
  const isBadRequest = error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest;
  return isBadRequest ? error.body : undefined;
}

function refusalOf(error: unknown): CatalogueRefusedError | null {
  const parsed = DetailSchema.safeParse(badRequestBody(error));
  return parsed.success ? new CatalogueRefusedError(parsed.data.detail) : null;
}

type EditRefusalBody = z.infer<typeof EditRefusalSchema>;

function editRefusal(error: unknown): UniversityEditRefusedError | null {
  const parsed = EditRefusalSchema.safeParse(badRequestBody(error));
  if (!parsed.success) return null;
  const body = parsed.data;
  return new UniversityEditRefusedError({
    fields: fieldsOf(body),
    rows: body.courses === undefined || Array.isArray(body.courses) ? {} : rowErrors(body.courses),
    general: generalOf(body),
  });
}

function fieldsOf(body: EditRefusalBody): Partial<Record<UniversityEditField, string[]>> {
  const fields: Partial<Record<UniversityEditField, string[]>> = {};
  if (body.name !== undefined) fields.name = body.name;
  if (body.country !== undefined) fields.country = body.country;
  return fields;
}

/** What isn't about one field or one row: the archive switch, the list as a whole, deletions. */
function generalOf(body: EditRefusalBody): string[] {
  const listWide = Array.isArray(body.courses) ? body.courses : [];
  return [
    ...(body.archived ?? []),
    ...listWide,
    ...(body.deleted_courses ?? []),
    ...(body.detail ?? []),
  ];
}

const COURSE_EDIT_FIELDS: readonly CourseEditField[] = ["name", "level", "intakes", "documents"];

function rowErrors(
  byPlace: Record<string, z.infer<typeof RowErrors>>,
): Record<number, Partial<Record<CourseEditField, string[]>>> {
  return Object.fromEntries(
    Object.entries(byPlace).map(([place, found]) => [Number(place), givenOnly(found)]),
  );
}

function givenOnly(found: z.infer<typeof RowErrors>): Partial<Record<CourseEditField, string[]>> {
  const given: Partial<Record<CourseEditField, string[]>> = {};
  for (const field of COURSE_EDIT_FIELDS) {
    const messages = found[field];
    if (messages !== undefined) given[field] = messages;
  }
  return given;
}
