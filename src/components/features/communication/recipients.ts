import type { Stage } from "@/constants/stages";
import type { RecordId } from "@/lib/recordId";

/**
 * A Student an email goes to: their name and email address ("" when they have none), and their
 * Stage when known (a Lost Student's email opens on Checking in, list tidy-ups 34).
 */
export type EmailRecipient = { id: RecordId; name: string; email: string; stage?: Stage };

/** The first word of a name, for "Dear Sita,". */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
