import { z } from "zod";

import type { RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import {
  ConfiguredDocumentTypeSchema,
  DocumentExampleSchema,
  DocumentLinkSchema,
  type ConfiguredDocumentType,
  type DocumentExample,
} from "./documentsTypes";
import { getJson, postForm, postJson, putJson, sendWithoutBody } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";

/** The form and body fields, by their API names. */
export const EXAMPLE_API_FIELDS = { file: "file", instruction: "instruction" } as const;

export type ExampleField = keyof typeof EXAMPLE_API_FIELDS;

/** The server's one-sentence refusal, e.g. a type that already has 3 example files. */
export class ExampleRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExampleRefusedError";
  }
}

const DetailSchema = z.object({ detail: z.string() });

function refused(error: unknown): unknown {
  const isBadRequest = error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest;
  const parsed = DetailSchema.safeParse(isBadRequest ? error.body : undefined);
  return parsed.success ? new ExampleRefusedError(parsed.data.detail) : error;
}

/**
 * Set (or clear, with "") how a Document Type should look, for Students (ticket 11; Admins).
 * Rejects with `InvalidFieldsError` on `instruction`.
 */
export async function setDocumentInstruction(
  typeId: RecordId,
  instruction: string,
  fetchFn: typeof fetch = fetch,
): Promise<ConfiguredDocumentType> {
  try {
    return await putJson(
      API_PATHS.documentInstruction(typeId),
      { instruction },
      ConfiguredDocumentTypeSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { instruction: EXAMPLE_API_FIELDS.instruction }) ?? error;
  }
}

function sendFile(path: string, file: File, fetchFn: typeof fetch): Promise<DocumentExample> {
  const form = new FormData();
  form.append(EXAMPLE_API_FIELDS.file, file);
  return postForm(path, form, DocumentExampleSchema, fetchFn).catch((error: unknown) => {
    throw toFieldErrors(error, { file: EXAMPLE_API_FIELDS.file }) ?? refused(error);
  });
}

/**
 * Add an example file (PDF, JPEG or PNG) to a Document Type. Rejects with `InvalidFieldsError`
 * on `file`, or `ExampleRefusedError` with the server's reason (already 3).
 */
export function addDocumentExample(
  typeId: RecordId,
  file: File,
  fetchFn: typeof fetch = fetch,
): Promise<DocumentExample> {
  return sendFile(API_PATHS.documentExamples(typeId), file, fetchFn);
}

/** Keep a new file in place of an example; the old one goes to the Bin. */
export function replaceDocumentExample(
  id: RecordId,
  file: File,
  fetchFn: typeof fetch = fetch,
): Promise<DocumentExample> {
  return sendFile(API_PATHS.replaceDocumentExample(id), file, fetchFn);
}

/** Remove an example file to the Bin, where an Admin restores it or deletes it for good. */
export function removeDocumentExample(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.documentExample(id), fetchFn);
}

/** A short-lived link to open (or save) an example file in use. */
export async function fetchDocumentExampleLink(
  id: RecordId,
  action: "open" | "download",
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const path = `${API_PATHS.documentExampleLink(id)}?action=${action}`;
  return (await getJson(path, DocumentLinkSchema, fetchFn)).url;
}

/**
 * Restore an example file from the Bin to its Document Type (Admins). A type that already has 3
 * rejects with `ApiRequestError`, whose reason `binFailure` reads.
 */
export function restoreDocumentExample(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<DocumentExample> {
  return postJson(API_PATHS.binDocumentExampleRestore(id), {}, DocumentExampleSchema, fetchFn);
}

/** Delete an example file in the Bin for good, with its stored file (Admins). */
export function deleteDocumentExampleForGood(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.binDocumentExample(id), fetchFn);
}

/** A short-lived link to open an example file waiting in the Bin, for an Admin on the Bin tab. */
export async function fetchBinDocumentExampleLink(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const path = `${API_PATHS.binDocumentExampleLink(id)}?action=open`;
  return (await getJson(path, DocumentLinkSchema, fetchFn)).url;
}
