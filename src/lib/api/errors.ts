import { HTTP_STATUS } from "@/constants/api";
import type { PasswordRuleId } from "@/lib/password";

import { isReadOnlyRestriction, restrictionOf, type Restriction } from "./restriction";

const NOT_LOGGED_IN_STATUSES: readonly number[] = [HTTP_STATUS.unauthorized, HTTP_STATUS.forbidden];

/**
 * A same-origin API call failed: the network failed (`status` null), or the response was not OK or
 * not the expected shape. `body` holds the JSON of a non-OK answer (e.g. field errors), if any.
 */
export class ApiRequestError extends Error {
  readonly path: string;
  readonly status: number | null;
  readonly body: unknown;

  constructor(path: string, status: number | null, body?: unknown) {
    super(
      `API request to ${path} failed${status === null ? "" : ` with status ${String(status)}`}`,
    );
    this.name = "ApiRequestError";
    this.path = path;
    this.status = status;
    this.body = body;
  }
}

/** The API refused the email and password given at login. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

/** The API refused a Code: wrong, expired, used, replaced or out of tries (it never says which). */
export class InvalidCodeError extends Error {
  constructor() {
    super("Invalid code");
    this.name = "InvalidCodeError";
  }
}

/** The API refused a new password; `unmet` names the rules it breaks. */
export class PasswordRulesNotMetError extends Error {
  readonly unmet: PasswordRuleId[];

  constructor(unmet: PasswordRuleId[]) {
    super("The password doesn't meet every rule");
    this.name = "PasswordRulesNotMetError";
    this.unmet = unmet;
  }
}

/** The current password typed when changing it isn't the person's password. */
export class WrongCurrentPasswordError extends Error {
  constructor() {
    super("That isn't the current password");
    this.name = "WrongCurrentPasswordError";
  }
}

/** Too many wrong current passwords on the Platform's Account page; wait, then try again. */
export class TooManyPasswordTriesError extends Error {
  constructor() {
    super("Too many wrong passwords");
    this.name = "TooManyPasswordTriesError";
  }
}

/** Too many Codes were emailed to the person in the last hour. */
export class TooManyCodesError extends Error {
  constructor() {
    super("Too many codes");
    this.name = "TooManyCodesError";
  }
}

/** Nobody is logged in on this subdomain (or the session has ended). */
export class NotLoggedInError extends Error {
  constructor() {
    super("Not logged in");
    this.name = "NotLoggedInError";
  }
}

/** The API refused a form's input; `fieldErrors` maps each field (frontend naming) to its messages. */
export class InvalidFieldsError<Field extends string> extends Error {
  readonly fieldErrors: Partial<Record<Field, string[]>>;

  constructor(fieldErrors: Partial<Record<Field, string[]>>) {
    super("Invalid input");
    this.name = "InvalidFieldsError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Whether a failed API call means nobody is logged in on this subdomain. A change refused because
 * the office is read-only (Past due or Suspended) is not: the person is still logged in.
 */
export function isNotLoggedInFailure(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status !== null &&
    NOT_LOGGED_IN_STATUSES.includes(error.status) &&
    !isReadOnlyRestriction(restrictionOf(error.status, error.body))
  );
}

/** The office's Status refusal behind a failed call, if that is why it failed (issue 42). */
export function restrictionOfError(error: unknown): Restriction | null {
  return error instanceof ApiRequestError ? restrictionOf(error.status, error.body) : null;
}
