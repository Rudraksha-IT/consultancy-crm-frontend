import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import {
  BODY_MAX_LENGTH,
  CHANNELS,
  MESSAGE_STATUSES,
  SUBJECT_MAX_LENGTH,
} from "@/constants/communication";
import { Stage } from "@/constants/stages";
import { studentFilterValues, type StudentFilters } from "@/lib/students";

import { getJson, postJson } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import type { AttachmentRef } from "./attachments";

/** The office has no contact email yet, so nothing can be sent to Students (ADR 0023). */
export class NoContactEmailError extends Error {
  constructor() {
    super("No contact email");
    this.name = "NoContactEmailError";
  }
}

/** Storage couldn't give back a file to attach, so nothing was sent (503). */
export class FilesNotFetchedError extends Error {
  constructor() {
    super("Files not fetched");
    this.name = "FilesNotFetchedError";
  }
}

const NO_CONTACT_EMAIL_CODE = "no_contact_email";
const NoContactAnswerSchema = z.object({ code: z.literal(NO_CONTACT_EMAIL_CODE) });

/** One email to one Student (or a past SMS), sent or failed. */
export const MessageSchema = z
  .object({
    id: RecordIdSchema,
    student: z.object({ id: RecordIdSchema, name: z.string().min(1) }),
    channel: z.enum(CHANNELS),
    subject: z.string().max(SUBJECT_MAX_LENGTH),
    body: z.string().max(BODY_MAX_LENGTH),
    status: z.enum(MESSAGE_STATUSES),
    error: z.string(),
    sent_to: z.string(),
    attachments: z.array(z.string().min(1)),
    sent_at: z.iso.datetime({ offset: true }),
    sent_by: z.object({ id: RecordIdSchema.nullable(), name: z.string().min(1) }),
  })
  .transform((message) => ({
    id: message.id,
    student: message.student,
    channel: message.channel,
    subject: message.subject,
    body: message.body,
    status: message.status,
    error: message.error,
    sentTo: message.sent_to,
    attachments: message.attachments,
    sentAt: message.sent_at,
    sentBy: message.sent_by,
  }));

export type Message = z.infer<typeof MessageSchema>;

export const MessagePageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(MessageSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    rows: page.results,
  }));

export type MessagePage = z.infer<typeof MessagePageSchema>;

function withPage(path: string, page: number): string {
  return `${path}?${new URLSearchParams({ page: String(page) }).toString()}`;
}

/** One page of every email sent, newest first (the Email page). */
export function fetchMessages(page: number, fetchFn: typeof fetch = fetch): Promise<MessagePage> {
  return getJson(withPage(API_PATHS.messages, page), MessagePageSchema, fetchFn);
}

/** One page of a Student's emails, newest first. */
export function fetchStudentMessages(
  studentId: RecordId,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<MessagePage> {
  return getJson(withPage(API_PATHS.studentMessages(studentId), page), MessagePageSchema, fetchFn);
}

/** The subject line and message Staff wrote, and the files to attach (by kind and id). */
export type NewEmail = { subject: string; body: string; attachments: AttachmentRef[] };
export type NewEmailField = keyof NewEmail;
const EMAIL_FIELDS: Record<NewEmailField, string> = {
  subject: "subject",
  body: "body",
  attachments: "attachments",
};

/** The API's "add the contact email first" refusal, or a file it couldn't get, as its own error. */
function knownFailure(error: unknown): NoContactEmailError | FilesNotFetchedError | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status === HTTP_STATUS.serviceUnavailable) return new FilesNotFetchedError();
  if (error.status !== HTTP_STATUS.badRequest) return null;
  return NoContactAnswerSchema.safeParse(error.body).success ? new NoContactEmailError() : null;
}

/**
 * Email one Student. Resolves with the email, sent or failed; rejects with
 * `NoContactEmailError` while the office has no contact email, `FilesNotFetchedError` when a file
 * couldn't be got, or `InvalidFieldsError` naming `subject`, `body` or `attachments`.
 */
export async function sendEmail(
  studentId: RecordId,
  email: NewEmail,
  fetchFn: typeof fetch = fetch,
): Promise<Message> {
  try {
    return await postJson(API_PATHS.studentMessages(studentId), email, MessageSchema, fetchFn);
  } catch (error) {
    throw knownFailure(error) ?? toFieldErrors(error, EMAIL_FIELDS) ?? error;
  }
}

/** Where pre-ticked Students come from: a class, or the Student list's filters. */
export type PreTickSource =
  { kind: "batch"; batchId: RecordId } | { kind: "students"; filters: StudentFilters };

const ChoosableSchema = z.object({
  students: z.array(
    z.object({
      id: RecordIdSchema,
      name: z.string().min(1),
      email: z.string().min(1),
      stage: z.enum(Stage),
    }),
  ),
  count: z.number().int().nonnegative(),
  max: z.number().int().positive(),
});

/** The Students a class or the Student list pre-ticks, how many in all, and the most at once. */
export type Choosable = z.infer<typeof ChoosableSchema>;

/** The Students who can be chosen from a class or the Student list's filters. */
export function fetchChoosable(
  source: PreTickSource,
  fetchFn: typeof fetch = fetch,
): Promise<Choosable> {
  const values =
    source.kind === "batch" ? { batch: source.batchId } : studentFilterValues(source.filters);
  const query = new URLSearchParams(values).toString();
  const path = query === "" ? API_PATHS.bulkMessages : `${API_PATHS.bulkMessages}?${query}`;
  return getJson(path, ChoosableSchema, fetchFn);
}

/** How one email to many Students went: how many were sent, and each failed email. */
const BulkResultSchema = z
  .object({
    sent: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    failed_messages: z.array(MessageSchema),
  })
  .transform((answer) => ({
    sent: answer.sent,
    failed: answer.failed,
    failedMessages: answer.failed_messages,
  }));

export type BulkResult = z.infer<typeof BulkResultSchema>;
export type BulkEmailField = NewEmailField | "students";

/**
 * Email each of the Students chosen their own copy, one by one; resolves with how it went.
 * Rejects with `NoContactEmailError`, `FilesNotFetchedError`, or `InvalidFieldsError` naming
 * `subject`, `body`, `attachments` or `students` (nobody, too many, Lost or unknown Students).
 */
export async function sendBulkEmail(
  studentIds: readonly RecordId[],
  email: NewEmail,
  fetchFn: typeof fetch = fetch,
): Promise<BulkResult> {
  const body = { ...email, students: studentIds };
  try {
    return await postJson(API_PATHS.bulkMessages, body, BulkResultSchema, fetchFn);
  } catch (error) {
    throw (
      knownFailure(error) ??
      toFieldErrors<BulkEmailField>(error, { ...EMAIL_FIELDS, students: "students" }) ??
      error
    );
  }
}
