import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { postJson } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { DetailAnswerSchema, FieldErrorsSchema } from "../core/types";

/**
 * A Staff member changes their own email (first live fixes, ticket 04): ask with the new
 * email and password (and the two-step number when it is on), then confirm with the Code sent
 * to the new email. The Next.js server keeps the new tokens confirming gives this device.
 */

// The longest address email allows (Django's limit too).
const EMAIL_MAX_LENGTH = 254;
// Far longer than any message the server writes.
const MESSAGE_MAX_LENGTH = 300;

/** The new email and my password, and the number or a recovery code when two-step login is on. */
export type EmailChangeRequest = { email: string; password: string } & Partial<
  Record<"code" | "recoveryCode", string>
>;

/** The form's fields a refusal can name: the number covers a recovery code too. */
export type WorkEmailField = "email" | "password" | "number" | "code";

/** The server refused: its words under the fields they belong to, or across the form. */
export class WorkEmailRefusedError extends Error {
  readonly fieldErrors: Partial<Record<WorkEmailField, string>>;
  readonly problem: string | null;

  constructor(fieldErrors: Partial<Record<WorkEmailField, string>>, problem: string | null) {
    super("Work email change refused");
    this.name = "WorkEmailRefusedError";
    this.fieldErrors = fieldErrors;
    this.problem = problem;
  }
}

// After confirming, only the new email reaches the browser; tokens never do (ADR 0003).
const ConfirmedSchema = z.strictObject({ email: z.email().max(EMAIL_MAX_LENGTH) });
const RefusalDetailSchema = z.object({ detail: z.string().min(1).max(MESSAGE_MAX_LENGTH) });

// Which API field a refusal names, per step, and the form field it is shown under.
const ASK_FIELDS: Record<string, WorkEmailField> = {
  email: "email",
  password: "password",
  code: "number",
  recovery_code: "number",
};
const CONFIRM_FIELDS: Record<string, WorkEmailField> = { code: "code" };

/** Email a Code to the new address. Rejects with WorkEmailRefusedError for what the server refused. */
export async function askForEmailChange(
  request: EmailChangeRequest,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  try {
    await postJson(API_PATHS.myEmail, askBody(request), DetailAnswerSchema, fetchFn);
  } catch (error) {
    throw explain(error, ASK_FIELDS, null) ?? error;
  }
}

/** Make the new email mine with its Code; returns it. This device stays logged in. */
export async function confirmEmailChange(
  email: string,
  code: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  try {
    const answer = await postJson(
      API_PATHS.myEmailConfirm,
      { email, code },
      ConfirmedSchema,
      fetchFn,
    );
    return answer.email;
  } catch (error) {
    throw explain(error, CONFIRM_FIELDS, "code") ?? error;
  }
}

function askBody(request: EmailChangeRequest): Record<string, string> {
  return {
    email: request.email,
    password: request.password,
    ...(request.code === undefined ? {} : { code: request.code }),
    ...(request.recoveryCode === undefined ? {} : { recovery_code: request.recoveryCode }),
  };
}

const REFUSAL_STATUSES: readonly number[] = [
  HTTP_STATUS.badRequest,
  HTTP_STATUS.tooManyRequests,
  HTTP_STATUS.serviceUnavailable,
];

/**
 * The refusal an API failure stands for, or null for any other failure. A `detail` goes under
 * `detailField` when given (a refused Code), otherwise across the form; a field the form doesn't
 * have goes across the form too.
 */
function explain(
  error: unknown,
  fields: Record<string, WorkEmailField>,
  detailField: WorkEmailField | null,
): WorkEmailRefusedError | null {
  if (!isRefusal(error)) return null;
  const detail = RefusalDetailSchema.safeParse(error.body);
  if (!detail.success) return fieldRefusal(error.body, fields);
  const words = detail.data.detail;
  return detailField === null
    ? new WorkEmailRefusedError({}, words)
    : new WorkEmailRefusedError({ [detailField]: words }, null);
}

function isRefusal(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && REFUSAL_STATUSES.includes(error.status ?? 0);
}

function fieldRefusal(
  body: unknown,
  fields: Record<string, WorkEmailField>,
): WorkEmailRefusedError | null {
  const parsed = FieldErrorsSchema.safeParse(body);
  if (!parsed.success) return null;
  const refusals = Object.entries(parsed.data).flatMap(([apiField, messages]) =>
    messages.slice(0, 1).map((words) => ({
      field: fields[apiField],
      words: words.slice(0, MESSAGE_MAX_LENGTH),
    })),
  );
  if (refusals.length === 0) return null;
  const fieldErrors: Partial<Record<WorkEmailField, string>> = Object.fromEntries(
    refusals.flatMap(({ field, words }) => (field === undefined ? [] : [[field, words]])),
  );
  const problem = refusals.find(({ field }) => field === undefined)?.words ?? null;
  return new WorkEmailRefusedError(fieldErrors, problem);
}
