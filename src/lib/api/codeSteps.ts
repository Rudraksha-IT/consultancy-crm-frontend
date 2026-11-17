import { HTTP_STATUS } from "@/constants/api";

import { postJson } from "./client";
import { ApiRequestError, InvalidCodeError, PasswordRulesNotMetError } from "./errors";
import { StaffLoginOutcomeSchema, type StaffLoginOutcome } from "./staffLogin";
import {
  DetailAnswerSchema,
  UnmetRulesAnswerSchema,
  type PasswordReset,
  type ResetCode,
} from "./types";

/**
 * The steps shared by every screen that uses an emailed Code to choose a password (a reset, or
 * joining with an Invite): ask for a Code, check it, then choose the password and log in.
 */

/** Ask for a Code; the answer is the same whether or not the email belongs to anyone. */
export async function requestCodeAt(
  path: string,
  email: string,
  fetchFn: typeof fetch,
): Promise<void> {
  await postJson(path, { email }, DetailAnswerSchema, fetchFn);
}

/** Check a Code without using it up. Rejects with InvalidCodeError when it's refused. */
export async function checkCodeAt(
  path: string,
  code: ResetCode,
  fetchFn: typeof fetch,
): Promise<void> {
  try {
    await postJson(path, code, DetailAnswerSchema, fetchFn);
  } catch (error) {
    throw isRefusal(error) ? new InvalidCodeError() : error;
  }
}

/**
 * Choose the password and log in, returning the new login's context (the Next.js server keeps the
 * tokens, ADR 0003), or the two-step login step that still comes next (issue 62): a Code never
 * skips it. Rejects with PasswordRulesNotMetError or InvalidCodeError.
 */
export async function choosePasswordAt(
  path: string,
  choice: PasswordReset,
  fetchFn: typeof fetch,
): Promise<StaffLoginOutcome> {
  try {
    return await postJson(path, choice, StaffLoginOutcomeSchema, fetchFn);
  } catch (error) {
    throw explainPasswordRefusal(error);
  }
}

function isRefusal(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest;
}

/** A refused password choice: the unmet rules the server names, or else a refused Code. */
export function explainPasswordRefusal(error: unknown): unknown {
  if (!isRefusal(error)) return error;
  const rules = UnmetRulesAnswerSchema.safeParse(error.body);
  return rules.success
    ? new PasswordRulesNotMetError(rules.data.unmet_rules)
    : new InvalidCodeError();
}
