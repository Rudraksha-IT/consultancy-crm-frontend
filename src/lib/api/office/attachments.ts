import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { ATTACHMENT_KINDS, EMAIL_MAX_BYTES, type AttachmentKind } from "@/constants/communication";

import { getJson } from "../core/client";
import type { ReadyMadeTarget } from "./readyMade";

/**
 * A file that can go with an email (ticket 12): a Course File, a Document Example or one of the
 * Student's own Document files. `name` is what Staff call it, `fileName` what the Student
 * receives, and `group` where it belongs (the University and Course, or the Document Type).
 */
export const AttachableSchema = z
  .object({
    kind: z.enum(ATTACHMENT_KINDS),
    /** A Document file's UUID; Course Files and Document Examples by number until ticket 18. */
    id: z.union([RecordIdSchema, z.number().int().positive()]),
    name: z.string().min(1),
    file_name: z.string().min(1),
    size: z.number().int().nonnegative(),
    group: z.string(),
  })
  .transform(({ file_name, ...rest }) => ({ ...rest, fileName: file_name }));

export type Attachable = z.infer<typeof AttachableSchema>;

/** A file as the API takes it when sending: only its kind and id. */
export type AttachmentRef = { kind: AttachmentKind; id: RecordId | number };

const AttachableFilesSchema = z
  .object({
    course_files: z.array(AttachableSchema),
    document_examples: z.array(AttachableSchema),
    documents: z.array(AttachableSchema),
    max_bytes: z.literal(EMAIL_MAX_BYTES),
  })
  .transform((answer) => ({
    courseFiles: answer.course_files,
    documentExamples: answer.document_examples,
    documents: answer.documents,
  }));

/** Everything that can be attached, by where it comes from (no Documents for many Students). */
export type AttachableFiles = z.infer<typeof AttachableFilesSchema>;

/** The files that can be attached to an email to one Student, or to many. */
export function fetchAttachable(
  target: ReadyMadeTarget,
  fetchFn: typeof fetch = fetch,
): Promise<AttachableFiles> {
  const path =
    target === "many" ? API_PATHS.bulkAttachable : API_PATHS.studentAttachable(target.studentId);
  return getJson(path, AttachableFilesSchema, fetchFn);
}

/** The kind and id of each file, as the API takes them. */
export function refsOf(files: readonly Attachable[]): AttachmentRef[] {
  return files.map(({ kind, id }) => ({ kind, id }));
}
