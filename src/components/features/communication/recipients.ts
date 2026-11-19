/** A Student an email goes to: their name and email address ("" when they have none). */
export type EmailRecipient = { id: number; name: string; email: string };

/** The first word of a name, for "Dear Sita,". */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
