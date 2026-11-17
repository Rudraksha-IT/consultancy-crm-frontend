import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import {
  CONSULTANCY_STATUSES,
  READ_ONLY_STATUSES,
  type ConsultancyStatus,
} from "@/constants/consultancyStatus";

/** The longest refusal shown as it is; anything longer is not the server's short message. */
const MESSAGE_MAX_LENGTH = 300;

/** How the server refuses a request because of the office's Status (issue 42). */
const RestrictionSchema = z.object({
  detail: z.string().min(1).max(MESSAGE_MAX_LENGTH),
  status: z.enum(CONSULTANCY_STATUSES),
});

/** A request refused by the office's Status, with the server's words for why. */
export type Restriction = { status: ConsultancyStatus; message: string };

type RestrictionListener = (restriction: Restriction) => void;

const listeners = new Set<RestrictionListener>();

/** The Status refusal in a failed answer, or null when the answer failed for another reason. */
export function restrictionOf(status: number | null, body: unknown): Restriction | null {
  if (status !== HTTP_STATUS.forbidden) return null;
  const parsed = RestrictionSchema.safeParse(body);
  return parsed.success ? { status: parsed.data.status, message: parsed.data.detail } : null;
}

/** Whether a refusal comes from a read-only office (Past due or Suspended), where Staff stay in. */
export function isReadOnlyRestriction(restriction: Restriction | null): boolean {
  return restriction !== null && READ_ONLY_STATUSES.includes(restriction.status);
}

/** Tell every listener (the app shell) that the server refused a request because of the Status. */
export function reportRestriction(restriction: Restriction): void {
  for (const listener of listeners) listener(restriction);
}

/** Listen for Status refusals; returns the function that stops listening. */
export function onRestriction(listener: RestrictionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
