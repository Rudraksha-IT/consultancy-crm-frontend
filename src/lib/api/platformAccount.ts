import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { patchJson, postJson } from "./client";
import {
  ApiRequestError,
  PasswordRulesNotMetError,
  TooManyPasswordTriesError,
  WrongCurrentPasswordError,
} from "./errors";
import { toFieldErrors } from "./fieldErrors";
import { WrongNumberError } from "./twoFactor";
import {
  FieldErrorsSchema,
  PlatformAdminAnswerSchema,
  UnmetRulesAnswerSchema,
  type PlatformAdmin,
} from "./types";

/**
 * The Platform Admin's own Account page (issues 59, 65): the name changes without a password; the
 * email can't be changed here; the password change needs the current one. The Next.js server
 * keeps the tokens each change gives this session.
 */

export type PlatformAccountField = "name";

const ACCOUNT_API_FIELDS: Record<PlatformAccountField, string> = { name: "name" };
const PASSWORD_API_FIELDS = { newPassword: "new_password" } as const;

// The tokens stay with the Next.js server (ADR 0003); the browser gets nothing else.
const NoTokensSchema = z.object({});

/** Save my name (no password, issue 65). Rejects with InvalidFieldsError (`name`). */
export async function savePlatformName(
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<PlatformAdmin> {
  try {
    return await patchJson(API_PATHS.platformMe, { name }, PlatformAdminAnswerSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, ACCOUNT_API_FIELDS) ?? error;
  }
}

/**
 * Change my password; my other sessions are signed out. Rejects with PasswordRulesNotMetError,
 * WrongCurrentPasswordError, TooManyPasswordTriesError, or InvalidFieldsError (`newPassword`).
 */
export async function changePlatformPassword(
  change: { currentPassword: string; newPassword: string; code?: string },
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const body = {
    current_password: change.currentPassword,
    new_password: change.newPassword,
    ...numberOf(change),
  };
  try {
    await postJson(API_PATHS.platformMyPassword, body, NoTokensSchema, fetchFn);
  } catch (error) {
    throw explainRefusal(error) ?? toFieldErrors(error, PASSWORD_API_FIELDS) ?? error;
  }
}

function numberOf(change: { code?: string }): { code?: string } {
  return change.code === undefined ? {} : { code: change.code };
}

function explainRefusal(error: unknown): Error | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status === HTTP_STATUS.tooManyRequests) return new TooManyPasswordTriesError();
  return error.status === HTTP_STATUS.badRequest ? explainBadRequest(error) : null;
}

function explainBadRequest(error: ApiRequestError): Error | null {
  const rules = UnmetRulesAnswerSchema.safeParse(error.body);
  if (rules.success) return new PasswordRulesNotMetError(rules.data.unmet_rules);
  const fields = FieldErrorsSchema.safeParse(error.body);
  if (!fields.success) return null;
  if (fields.data.current_password !== undefined) return new WrongCurrentPasswordError();
  return fields.data.code === undefined ? null : new WrongNumberError("code");
}
