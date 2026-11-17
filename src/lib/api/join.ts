import { API_PATHS } from "@/constants/api";

import { checkCodeAt, choosePasswordAt, requestCodeAt } from "./codeSteps";
import type { PasswordReset, ResetCode } from "./types";
import type { StaffLoginOutcome } from "./staffLogin";

/** "Send me a new code" on the Join screen; the answer never says whether the email is invited. */
export function requestJoinCode(email: string, fetchFn: typeof fetch = fetch): Promise<void> {
  return requestCodeAt(API_PATHS.joinRequest, email, fetchFn);
}

/** Check an Invite Code without using it up. Rejects with InvalidCodeError when it's refused. */
export function checkJoinCode(code: ResetCode, fetchFn: typeof fetch = fetch): Promise<void> {
  return checkCodeAt(API_PATHS.joinCode, code, fetchFn);
}

/**
 * Choose one's first password, which activates the account and logs in; returns the new login's
 * context. Rejects with PasswordRulesNotMetError or InvalidCodeError.
 */
export function completeJoin(
  choice: PasswordReset,
  fetchFn: typeof fetch = fetch,
): Promise<StaffLoginOutcome> {
  return choosePasswordAt(API_PATHS.joinComplete, choice, fetchFn);
}
