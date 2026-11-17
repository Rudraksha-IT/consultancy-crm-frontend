import { HTTP_STATUS } from "@/constants/api";

import { ApiRequestError, InvalidFieldsError } from "./errors";
import { FieldErrorsSchema } from "./types";

/**
 * Turn the API's refusal of a form (400 with field errors) into an `InvalidFieldsError` named in
 * frontend fields; null for any other failure. Errors on fields the form doesn't have are dropped.
 */
export function toFieldErrors<Field extends string>(
  error: unknown,
  apiFields: Record<Field, string>,
): InvalidFieldsError<Field> | null {
  const apiErrors = refusedFields(error);
  if (apiErrors === null) return null;
  const fields = Object.keys(apiFields).filter((field): field is Field => field in apiFields);
  const fieldErrors: Partial<Record<Field, string[]>> = {};
  for (const field of fields) {
    const messages = apiErrors[apiFields[field]];
    if (messages !== undefined) fieldErrors[field] = messages;
  }
  return Object.keys(fieldErrors).length === 0 ? null : new InvalidFieldsError<Field>(fieldErrors);
}

function refusedFields(error: unknown): Record<string, string[]> | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const parsed = FieldErrorsSchema.safeParse(error.body);
  return parsed.success ? parsed.data : null;
}
