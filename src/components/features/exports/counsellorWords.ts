import { EXPORT_TEXT } from "@/constants/exports";
import { CounsellorFilter } from "@/constants/students";
import type { CounsellorChoice } from "@/lib/api";

const FIXED_WORDS: Readonly<Record<string, string>> = {
  [CounsellorFilter.Any]: "",
  [CounsellorFilter.Me]: EXPORT_TEXT.myStudents,
  [CounsellorFilter.None]: EXPORT_TEXT.noCounsellor,
};

/** A counsellor filter as it reads: "My Students", "No counsellor yet", a name, or "" for any. */
export function counsellorWords(value: string, counsellors: readonly CounsellorChoice[]): string {
  if (Object.hasOwn(FIXED_WORDS, value)) return FIXED_WORDS[value] ?? "";
  const found = counsellors.find((choice) => String(choice.id) === value);
  return found === undefined ? value : found.name;
}
