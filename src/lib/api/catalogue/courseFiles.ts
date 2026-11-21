import { z } from "zod";

import type { RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { CatalogueRefusedError } from "./catalogueEdit";
import { CourseFileSchema, type CourseFile } from "./courseFileTypes";
import { getJson, patchJson, postForm, postJson, sendWithoutBody } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { DocumentLinkSchema } from "../documents/documentsTypes";

/** The upload form's fields, by their API names. */
export const COURSE_FILE_API_FIELDS = { file: "file", name: "name" } as const;

export type CourseFileField = keyof typeof COURSE_FILE_API_FIELDS;

const DetailSchema = z.object({ detail: z.string() });

/** The server's one-sentence refusal (an archived Course, too many files), or the error itself. */
function refused(error: unknown): unknown {
  const isBadRequest = error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest;
  const parsed = DetailSchema.safeParse(isBadRequest ? error.body : undefined);
  return parsed.success ? new CatalogueRefusedError(parsed.data.detail) : error;
}

/**
 * Upload a PDF to a Course with the name Staff will see (ticket 10; Admins). Rejects with
 * `InvalidFieldsError` on `file` or `name`, or `CatalogueRefusedError` with the server's reason.
 */
export async function uploadCourseFile(
  courseId: RecordId,
  file: File,
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<CourseFile> {
  const form = new FormData();
  form.append(COURSE_FILE_API_FIELDS.file, file);
  form.append(COURSE_FILE_API_FIELDS.name, name);
  try {
    return await postForm(API_PATHS.courseFiles(courseId), form, CourseFileSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, COURSE_FILE_API_FIELDS) ?? refused(error);
  }
}

/** Give a Course File a new name. Rejects with `InvalidFieldsError` on `name`. */
export async function renameCourseFile(
  id: RecordId,
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<CourseFile> {
  try {
    return await patchJson(API_PATHS.courseFile(id), { name }, CourseFileSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { name: COURSE_FILE_API_FIELDS.name }) ?? error;
  }
}

/** Put a Course File in the Bin, where an Admin restores it or deletes it for good. */
export function binCourseFile(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.courseFile(id), fetchFn);
}

/** A short-lived link to open (or save) a Course File in use. */
export async function fetchCourseFileLink(
  id: RecordId,
  action: "open" | "download",
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const path = `${API_PATHS.courseFileLink(id)}?action=${action}`;
  return (await getJson(path, DocumentLinkSchema, fetchFn)).url;
}

/** Restore a Course File from the Bin to its Course (Admins). */
export function restoreCourseFile(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<CourseFile> {
  return postJson(API_PATHS.binCourseFileRestore(id), {}, CourseFileSchema, fetchFn);
}

/** Delete a Course File in the Bin for good, with its stored file (Admins). */
export function deleteCourseFileForGood(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.binCourseFile(id), fetchFn);
}

/** A short-lived link to open a Course File waiting in the Bin, for an Admin on the Bin tab. */
export async function fetchBinCourseFileLink(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const path = `${API_PATHS.binCourseFileLink(id)}?action=open`;
  return (await getJson(path, DocumentLinkSchema, fetchFn)).url;
}
