import { z } from "zod";

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

/** The office has no contact email yet, so nothing can be sent to Students (ADR 0023). */
export class NoContactEmailError extends Error {
  constructor() {
    super("No contact email");
    this.name = "NoContactEmailError";
  }
}

const NO_CONTACT_EMAIL_CODE = "no_contact_email";
const NoContactAnswerSchema = z.object({ code: z.literal(NO_CONTACT_EMAIL_CODE) });

/** One email to one Student (or a past SMS), sent or failed. */
export const MessageSchema = z
  .object({
    id: z.number().int(),
    student: z.object({ id: z.number().int(), name: z.string().min(1) }),
    channel: z.enum(CHANNELS),
    subject: z.string().max(SUBJECT_MAX_LENGTH),
    body: z.string().max(BODY_MAX_LENGTH),
    status: z.enum(MESSAGE_STATUSES),
    error: z.string(),
    sent_to: z.string(),
    sent_at: z.iso.datetime({ offset: true }),
    sent_by: z.object({ id: z.number().int().nullable(), name: z.string().min(1) }),
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
  studentId: number,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<MessagePage> {
  return getJson(withPage(API_PATHS.studentMessages(studentId), page), MessagePageSchema, fetchFn);
}

/** The subject line and message Staff wrote. */
export type NewEmail = { subject: string; body: string };
export type NewEmailField = keyof NewEmail;
const EMAIL_FIELDS: Record<NewEmailField, string> = { subject: "subject", body: "body" };

/** The API's "add the contact email first" refusal, as its own error. */
function noContactEmail(error: unknown): NoContactEmailError | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  return NoContactAnswerSchema.safeParse(error.body).success ? new NoContactEmailError() : null;
}

/**
 * Email one Student. Resolves with the email, sent or failed; rejects with
 * `NoContactEmailError` while the office has no contact email, or `InvalidFieldsError` naming
 * `subject` or `body`.
 */
export async function sendEmail(
  studentId: number,
  email: NewEmail,
  fetchFn: typeof fetch = fetch,
): Promise<Message> {
  try {
    return await postJson(API_PATHS.studentMessages(studentId), email, MessageSchema, fetchFn);
  } catch (error) {
    throw noContactEmail(error) ?? toFieldErrors(error, EMAIL_FIELDS) ?? error;
  }
}

/** Where pre-ticked Students come from: a class, or the Student list's filters. */
export type PreTickSource =
  { kind: "batch"; batchId: number } | { kind: "students"; filters: StudentFilters };

const ChoosableSchema = z.object({
  students: z.array(
    z.object({
      id: z.number().int().positive(),
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
    source.kind === "batch"
      ? { batch: String(source.batchId) }
      : studentFilterValues(source.filters);
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
 * Rejects with `NoContactEmailError`, or `InvalidFieldsError` naming `subject`, `body` or
 * `students` (nobody, too many, Lost or unknown Students).
 */
export async function sendBulkEmail(
  studentIds: readonly number[],
  email: NewEmail,
  fetchFn: typeof fetch = fetch,
): Promise<BulkResult> {
  const body = { ...email, students: studentIds };
  try {
    return await postJson(API_PATHS.bulkMessages, body, BulkResultSchema, fetchFn);
  } catch (error) {
    throw (
      noContactEmail(error) ??
      toFieldErrors<BulkEmailField>(error, { ...EMAIL_FIELDS, students: "students" }) ??
      error
    );
  }
}
