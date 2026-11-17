/** One-time Codes (glossary: Code): 6 digits, shown to people as "123 456". */

const CODE_PATTERN = /^[0-9]{6}$/;

/** The Code as the API takes it: the spaces people type or paste removed. */
export function normaliseCode(typed: string): string {
  return typed.replace(/\s/g, "");
}

/** Whether `code` is exactly six digits (0–9). */
export function isCompleteCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
