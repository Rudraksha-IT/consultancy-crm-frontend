import { WORK_FROM_HOME_TEXT as TEXT } from "@/constants/workFromHome";
import { WorkFromHomeRefusedError } from "@/lib/api";

/** What to say when a change was refused (the server's own reason) or failed. */
export function workFromHomeFailure(error: unknown): string {
  return error instanceof WorkFromHomeRefusedError ? error.message : TEXT.changeFailed;
}

/** The first word of a name, e.g. "Bikash" for "Bikash Thapa". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
