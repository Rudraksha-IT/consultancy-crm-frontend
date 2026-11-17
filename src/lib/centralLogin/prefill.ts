import { z } from "zod";

const EMAIL_MAX_LENGTH = 254;

const PrefillSchema = z.email().max(EMAIL_MAX_LENGTH);

/**
 * The email a Central login link carries in `?email=`, if it looks like one; otherwise "". It only
 * fills the login form's field: nothing else ever trusts it.
 */
export function emailFromAddress(value: string | null): string {
  const parsed = PrefillSchema.safeParse(value?.trim());
  return parsed.success ? parsed.data : "";
}
