import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import {
  CHANNELS,
  EMAIL_PORTS,
  MESSAGE_STATUSES,
  SMS_PROVIDERS,
  type Channel,
  type EmailPort,
  type SmsProvider,
} from "@/constants/communication";

import { studentFilterValues, type StudentFilters } from "@/lib/students";

import { getJson, postJson, putJson } from "../core/client";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { DetailAnswerSchema } from "../core/types";

/** The office's SMS and email accounts (spec 88). Secrets never come back, only whether saved. */
export const ProviderSettingsSchema = z
  .object({
    sms_provider: z.enum(SMS_PROVIDERS),
    sms_sender: z.string().max(11),
    sms_token_saved: z.boolean(),
    email_host: z.string().max(253),
    email_port: z.union(EMAIL_PORTS.map((port) => z.literal(port))),
    email_username: z.string().max(254),
    email_password_saved: z.boolean(),
    email_from: z.string().max(254),
    sms_ready: z.boolean(),
    email_ready: z.boolean(),
  })
  .transform((answer) => ({
    smsProvider: answer.sms_provider,
    smsSender: answer.sms_sender,
    isSmsTokenSaved: answer.sms_token_saved,
    emailHost: answer.email_host,
    emailPort: answer.email_port,
    emailUsername: answer.email_username,
    isEmailPasswordSaved: answer.email_password_saved,
    emailFrom: answer.email_from,
    isSmsReady: answer.sms_ready,
    isEmailReady: answer.email_ready,
  }));

export type ProviderSettings = z.infer<typeof ProviderSettingsSchema>;

/** What an Admin saves. An empty secret keeps the one saved before. */
export type ProviderSettingsInput = {
  smsProvider: SmsProvider;
  smsSender: string;
  smsToken: string;
  emailHost: string;
  emailPort: EmailPort;
  emailUsername: string;
  emailPassword: string;
  emailFrom: string;
};

export type ProviderSettingsField = keyof ProviderSettingsInput;

const SETTINGS_API_FIELDS: Record<ProviderSettingsField, string> = {
  smsProvider: "sms_provider",
  smsSender: "sms_sender",
  smsToken: "sms_token",
  emailHost: "email_host",
  emailPort: "email_port",
  emailUsername: "email_username",
  emailPassword: "email_password",
  emailFrom: "email_from",
};

/** The office's SMS and email accounts (Admins, Communication on). */
export function fetchProviderSettings(fetchFn: typeof fetch = fetch): Promise<ProviderSettings> {
  return getJson(API_PATHS.communicationSettings, ProviderSettingsSchema, fetchFn);
}

/**
 * Save the office's accounts and return them as stored. Empty secrets are left out, so the saved
 * ones are kept. Rejects with `InvalidFieldsError` naming refused fields.
 */
export async function saveProviderSettings(
  input: ProviderSettingsInput,
  fetchFn: typeof fetch = fetch,
): Promise<ProviderSettings> {
  try {
    return await putJson(
      API_PATHS.communicationSettings,
      settingsBody(input),
      ProviderSettingsSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, SETTINGS_API_FIELDS) ?? error;
  }
}

/** The settings in API naming; an empty secret is left out, so the saved one is kept. */
function settingsBody(input: ProviderSettingsInput): Record<string, string | number> {
  const secrets = {
    ...(input.smsToken === "" ? {} : { sms_token: input.smsToken }),
    ...(input.emailPassword === "" ? {} : { email_password: input.emailPassword }),
  };
  return {
    sms_provider: input.smsProvider,
    sms_sender: input.smsSender,
    email_host: input.emailHost,
    email_port: input.emailPort,
    email_username: input.emailUsername,
    email_from: input.emailFrom,
    ...secrets,
  };
}

const TestSmsSchema = z
  .object({ status: z.enum(MESSAGE_STATUSES), error: z.string(), sent_to: z.string() })
  .transform((answer) => ({ status: answer.status, error: answer.error, sentTo: answer.sent_to }));

export type TestSmsResult = z.infer<typeof TestSmsSchema>;

/** Send a test SMS to the Admin's own mobile, to check the SMS settings. */
export function sendTestSms(fetchFn: typeof fetch = fetch): Promise<TestSmsResult> {
  return postJson(API_PATHS.communicationTestSms, {}, TestSmsSchema, fetchFn);
}

/** One SMS or email to one Student, sent or failed (spec 89, 91). */
export const MessageSchema = z
  .object({
    id: z.number().int(),
    student: z.object({ id: z.number().int(), name: z.string().min(1) }),
    channel: z.enum(CHANNELS),
    body: z.string(),
    status: z.enum(MESSAGE_STATUSES),
    error: z.string(),
    sent_to: z.string(),
    sent_at: z.iso.datetime({ offset: true }),
    sent_by: z.object({ id: z.number().int(), name: z.string().min(1) }),
  })
  .transform((message) => ({
    id: message.id,
    student: message.student,
    channel: message.channel,
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

/** One page of every message sent, newest first (the Messages page). */
export function fetchMessages(page: number, fetchFn: typeof fetch = fetch): Promise<MessagePage> {
  return getJson(withPage(API_PATHS.messages, page), MessagePageSchema, fetchFn);
}

/** One page of a Student's messages, newest first. */
export function fetchStudentMessages(
  studentId: number,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<MessagePage> {
  return getJson(withPage(API_PATHS.studentMessages(studentId), page), MessagePageSchema, fetchFn);
}

export type NewMessage = { channel: Channel; body: string };
export type NewMessageField = keyof NewMessage;

/**
 * Send an SMS or email to one Student (spec 89). Resolves with the message, sent or failed;
 * rejects with `InvalidFieldsError` when the API refuses it (e.g. the channel isn't set up).
 */
export async function sendMessage(
  studentId: number,
  message: NewMessage,
  fetchFn: typeof fetch = fetch,
): Promise<Message> {
  try {
    return await postJson(API_PATHS.studentMessages(studentId), message, MessageSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { channel: "channel", body: "body" }) ?? error;
  }
}

/** Who one message to many Students goes to (spec 90): a class, or a Student list's filters. */
export type BulkRecipients =
  { kind: "batch"; batchId: number } | { kind: "students"; filters: StudentFilters };

const BulkCountSchema = z.object({
  count: z.number().int().nonnegative(),
  max: z.number().int().positive(),
});

export type BulkCount = z.infer<typeof BulkCountSchema>;

/** How one message to many Students went: how many were sent, and each failed message. */
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
export type BulkMessageField = NewMessageField | "recipients";

function recipientValues(recipients: BulkRecipients): Record<string, string> {
  return recipients.kind === "batch"
    ? { batch: String(recipients.batchId) }
    : studentFilterValues(recipients.filters);
}

/** How many Students a class or a Student list names, and the most one message may go to. */
export function fetchBulkCount(
  recipients: BulkRecipients,
  fetchFn: typeof fetch = fetch,
): Promise<BulkCount> {
  const query = new URLSearchParams(recipientValues(recipients)).toString();
  const path = query === "" ? API_PATHS.bulkMessages : `${API_PATHS.bulkMessages}?${query}`;
  return getJson(path, BulkCountSchema, fetchFn);
}

/**
 * Send one SMS or email to every Student a class or a Student list names (spec 90), one by one;
 * resolves with how it went. Rejects with `InvalidFieldsError` naming `channel` or `body`, or
 * `recipients` with the API's reason (nobody to send to, too many).
 */
export async function sendBulkMessage(
  recipients: BulkRecipients,
  message: NewMessage,
  fetchFn: typeof fetch = fetch,
): Promise<BulkResult> {
  const body = { ...message, ...recipientBody(recipients) };
  try {
    return await postJson(API_PATHS.bulkMessages, body, BulkResultSchema, fetchFn);
  } catch (error) {
    throw (
      toFieldErrors(error, { channel: "channel", body: "body" }) ??
      recipientsRefusal(error) ??
      error
    );
  }
}

/** Who it goes to, as the API takes it: a class's id, or the Student list's filters. */
function recipientBody(recipients: BulkRecipients): Record<string, unknown> {
  return recipients.kind === "batch"
    ? { batch: recipients.batchId }
    : { students: studentFilterValues(recipients.filters) };
}

/** The API's reason for refusing who a message goes to, as a `recipients` field error. */
function recipientsRefusal(error: unknown): InvalidFieldsError<BulkMessageField> | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const parsed = DetailAnswerSchema.safeParse(error.body);
  return parsed.success ? new InvalidFieldsError({ recipients: [parsed.data.detail] }) : null;
}
