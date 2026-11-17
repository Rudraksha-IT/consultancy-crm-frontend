import { API_PATHS } from "@/constants/api";

import { postJson } from "../core/client";
import { checkCodeAt, explainPasswordRefusal, requestCodeAt } from "../auth/codeSteps";
import { DetailAnswerSchema, type PasswordReset, type ResetCode } from "../core/types";

/**
 * Forgot password on the Platform (issue 63): the same three steps as for Staff, on the
 * Platform's own endpoints. Choosing the password doesn't log in: every Platform session ends and
 * the person logs in again (with two-step login if it is on).
 */

/** Ask for a reset Code; the answer is the same whether or not the email is a Platform Admin's. */
export function requestPlatformResetCode(
  email: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  return requestCodeAt(API_PATHS.platformPasswordReset, email, fetchFn);
}

/** Check a reset Code without using it up. Rejects with InvalidCodeError when it's refused. */
export function checkPlatformResetCode(
  resetCode: ResetCode,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  return checkCodeAt(API_PATHS.platformPasswordResetVerify, resetCode, fetchFn);
}

/** Set the new password. Rejects with PasswordRulesNotMetError or InvalidCodeError. */
export async function completePlatformPasswordReset(
  { email, code, password }: PasswordReset,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const body = { email, code, new_password: password };
  try {
    await postJson(API_PATHS.platformPasswordResetConfirm, body, DetailAnswerSchema, fetchFn);
  } catch (error) {
    throw explainPasswordRefusal(error);
  }
}
