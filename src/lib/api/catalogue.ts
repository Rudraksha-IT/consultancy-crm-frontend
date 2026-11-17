import { API_PATHS } from "@/constants/api";
import { catalogueListQuery, type CatalogueFilters } from "@/lib/catalogue";

import {
  CatalogueImportResultSchema,
  COURSE_API_FIELDS,
  IMPORT_API_FIELDS,
  CourseSchema,
  UNIVERSITY_API_FIELDS,
  UniversityPageSchema,
  UniversitySchema,
  type CatalogueImportResult,
  type Course,
  type CourseInput,
  type University,
  type UniversityInput,
  type UniversityPage,
} from "./catalogueTypes";
import { getJson, postJson } from "./client";
import { toFieldErrors } from "./fieldErrors";

/** One page of Universities by name, with their Courses and Intakes. */
export function fetchUniversities(
  filters: CatalogueFilters,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<UniversityPage> {
  const path = `${API_PATHS.catalogueUniversities}${catalogueListQuery(filters, page)}`;
  return getJson(path, UniversityPageSchema, fetchFn);
}

/** Add a University (Admins only). Rejects with `InvalidFieldsError` for refused fields. */
export async function addUniversity(
  input: UniversityInput,
  fetchFn: typeof fetch = fetch,
): Promise<University> {
  try {
    return await postJson(API_PATHS.catalogueUniversities, input, UniversitySchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, UNIVERSITY_API_FIELDS) ?? error;
  }
}

/** Add a Course to a University. Rejects with `InvalidFieldsError` for refused fields. */
export async function addCourse(
  universityId: number,
  input: CourseInput,
  fetchFn: typeof fetch = fetch,
): Promise<Course> {
  try {
    return await postJson(API_PATHS.catalogueCourses(universityId), input, CourseSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, COURSE_API_FIELDS) ?? error;
  }
}

/**
 * Import Universities and Courses from a CSV file's text (Admins only). Good rows are imported
 * and every bad row is in the result; a file refused as a whole rejects with `InvalidFieldsError`
 * on `csv`.
 */
export async function importCatalogue(
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<CatalogueImportResult> {
  try {
    return await postJson(
      API_PATHS.catalogueImport,
      { csv: text },
      CatalogueImportResultSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, IMPORT_API_FIELDS) ?? error;
  }
}
