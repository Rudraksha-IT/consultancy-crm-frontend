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

// A positive database number, as the address writes it: no leading zero, at most ten digits.
const RECORD_NUMBER = /^[1-9][0-9]{0,9}$/;

/**
 * The record number in a page address, or null when it isn't one. Only for the records still
 * known by number (employees, classes, Fee Types) until ticket 18 switches them to UUIDs.
 */
export function parseRecordNumber(text: string): number | null {
  return RECORD_NUMBER.test(text) ? Number(text) : null;
}
