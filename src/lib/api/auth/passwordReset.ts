import { API_PATHS } from "@/constants/api";

import { checkCodeAt, choosePasswordAt, requestCodeAt } from "./codeSteps";
import type { PasswordReset, ResetCode } from "../core/types";
import type { StaffLoginOutcome } from "./staffLogin";

/**
 * Ask for a reset Code to be emailed. The answer is the same whether or not the email belongs to
 * anyone, so it tells this screen nothing.
 */
export function requestResetCode(email: string, fetchFn: typeof fetch = fetch): Promise<void> {
  return requestCodeAt(API_PATHS.passwordReset, email, fetchFn);
}

/** Check a reset Code without using it up. Rejects with InvalidCodeError when it's refused. */
export function checkResetCode(resetCode: ResetCode, fetchFn: typeof fetch = fetch): Promise<void> {
  return checkCodeAt(API_PATHS.passwordResetCode, resetCode, fetchFn);
}

/**
 * Set the new password and log in, returning the new login's context (the Next.js server keeps
 * the tokens, ADR 0003). Rejects with PasswordRulesNotMetError or InvalidCodeError.
 */
export function completePasswordReset(
  reset: PasswordReset,
  fetchFn: typeof fetch = fetch,
): Promise<StaffLoginOutcome> {
  return choosePasswordAt(API_PATHS.passwordResetComplete, reset, fetchFn);
}
