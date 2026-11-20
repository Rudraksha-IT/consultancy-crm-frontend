import { z } from "zod";

/**
 * How every record is named outside the server: a UUID, never its database number (ADR 0027).
 * The server writes UUIDs in lower case.
 */
export const RecordIdSchema = z.uuid();

/** A record's id as the API answers it and takes it. */
export type RecordId = z.infer<typeof RecordIdSchema>;

/** The record id in a page address, or null when the address holds anything else. */
export function parseRecordId(text: string): RecordId | null {
  const parsed = RecordIdSchema.safeParse(text.toLowerCase());
  return parsed.success ? parsed.data : null;
}
