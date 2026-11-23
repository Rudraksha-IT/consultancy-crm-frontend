/**
 * How urgent something is: a Student's case (first live fixes, ticket 10) or a Task (spec 77a).
 * One list of words for both (GLOSSARY: Student Priority); values match the API's `priority`.
 */
export const Priority = {
  High: "high",
  Normal: "normal",
  Low: "low",
} as const;

export type Priority = (typeof Priority)[keyof typeof Priority];

/** High first: the order every choice of them shows. */
export const PRIORITIES = Object.values(Priority);

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  normal: "Normal",
  low: "Low",
};
