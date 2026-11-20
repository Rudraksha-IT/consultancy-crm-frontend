import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import {
  BODY_MAX_LENGTH,
  READY_MADE_KINDS,
  READY_MADE_RECORDS,
  RECORD_LABEL_MAX_LENGTH,
  SUBJECT_MAX_LENGTH,
  UNAVAILABLE_MAX_LENGTH,
  type ReadyMadeKind,
} from "@/constants/communication";

import { getJson } from "../core/client";
import { AttachableSchema } from "./attachments";

/** Who the ready-made emails are for: one Student, or many (Plain email and Class details). */
export type ReadyMadeTarget = { studentId: RecordId } | "many";

const MenuSchema = z
  .object({
    kinds: z.array(
      z.object({
        kind: z.enum(READY_MADE_KINDS),
        record: z.enum(READY_MADE_RECORDS).nullable(),
        records: z.array(
          z.object({
            /** A Payment's, Offer Letter's or Visa's UUID; a class's number until ticket 18. */
            id: z.union([RecordIdSchema, z.number().int().positive()]),
            label: z.string().min(1).max(RECORD_LABEL_MAX_LENGTH),
          }),
        ),
        unavailable: z.string().min(1).max(UNAVAILABLE_MAX_LENGTH).nullable(),
      }),
    ),
  })
  .transform((answer) => answer.kinds);

/** One ready-made email offered: the record it needs, those to pick, and why it can't be used. */
export type ReadyMadeEntry = z.infer<typeof MenuSchema>[number];

const DraftSchema = z.object({
  subject: z.string().max(SUBJECT_MAX_LENGTH),
  body: z.string().max(BODY_MAX_LENGTH),
  attachments: z.array(AttachableSchema),
});

/**
 * A ready-made email's starting subject line and message, filled in, as plain text, and the
 * files it suggests attaching (Documents needed: the missing Documents' examples).
 */
export type ReadyMadeDraft = z.infer<typeof DraftSchema>;

/** The ready-made emails offered for one Student, or for an email to many. */
export function fetchReadyMade(
  target: ReadyMadeTarget,
  fetchFn: typeof fetch = fetch,
): Promise<ReadyMadeEntry[]> {
  const path =
    target === "many" ? API_PATHS.bulkReadyMade : API_PATHS.studentReadyMade(target.studentId);
  return getJson(path, MenuSchema, fetchFn);
}

/** One ready-made email filled in, about `record` (the id of the Payment, Offer Letter, …). */
export function fetchReadyMadeDraft(
  target: ReadyMadeTarget,
  kind: ReadyMadeKind,
  record: RecordId | number | null,
  fetchFn: typeof fetch = fetch,
): Promise<ReadyMadeDraft> {
  const path =
    target === "many" ? API_PATHS.bulkEmailDraft : API_PATHS.studentEmailDraft(target.studentId);
  const query = new URLSearchParams(record === null ? { kind } : { kind, record: String(record) });
  return getJson(`${path}?${query.toString()}`, DraftSchema, fetchFn);
}
