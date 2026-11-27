import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { getJson, postJson, postWithoutBody } from "../core/client";
import {
  ApiRequestError,
  InvalidCredentialsError,
  isNotLoggedInFailure,
  notLoggedInErrorOf,
  TooManyPasswordTriesError,
} from "../core/errors";
import { StaffLoginOutcomeSchema, type StaffLoginOutcome } from "./staffLogin";
import { StaffContextSchema, type Credentials, type StaffContext } from "../core/types";

/**
 * Log in on this subdomain's Consultancy and return the new login's context, or the two-step
 * login step that comes next (issue 62). The tokens stay with the Next.js server, in its sealed
 * cookie; this answer never carries them.
 */
export async function logIn(
  credentials: Credentials,
  fetchFn: typeof fetch = fetch,
): Promise<StaffLoginOutcome> {
  try {
    return await postJson(API_PATHS.login, credentials, StaffLoginOutcomeSchema, fetchFn);
  } catch (error) {
    throw loginErrorOf(error);
  }
}

/**
 * The error a failed password login stands for: wrong credentials, or the wrong passwords used up
 * for the email or the browser's address (security 01); anything else as it was.
 */
export function loginErrorOf(error: unknown): unknown {
  if (!(error instanceof ApiRequestError)) return error;
  if (error.status === HTTP_STATUS.badRequest) return new InvalidCredentialsError();
  if (error.status === HTTP_STATUS.tooManyRequests) return new TooManyPasswordTriesError();
  return error;
}

/** End the current session. */
export function logOut(fetchFn: typeof fetch = fetch): Promise<void> {
  return postWithoutBody(API_PATHS.logout, fetchFn);
}

/** The logged-in Staff member, their Role, the Modules on and the date display setting. */
export async function fetchStaffContext(fetchFn: typeof fetch = fetch): Promise<StaffContext> {
  try {
    return await getJson(API_PATHS.staffContext, StaffContextSchema, fetchFn);
  } catch (error) {
    throw isNotLoggedInFailure(error) ? notLoggedInErrorOf(error) : error;
  }
}
