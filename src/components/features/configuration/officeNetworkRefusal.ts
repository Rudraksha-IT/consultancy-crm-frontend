import { OFFICE_NETWORK_TEXT as TEXT } from "@/constants/officeNetworks";
import { InvalidFieldsError, OfficeNetworkRefusedError } from "@/lib/api";

/** Why adding an Office Network failed, in the server's words where it gave any. */
export function officeNetworkRefusalOf(error: unknown): string {
  if (error instanceof OfficeNetworkRefusedError) return error.message;
  return firstFieldError(error) ?? TEXT.saveFailed;
}

/** The first reason the server gave on a field, e.g. "That network is already on the list." */
function firstFieldError(error: unknown): string | undefined {
  if (!(error instanceof InvalidFieldsError)) return undefined;
  const refused: Partial<Record<string, string[]>> = error.fieldErrors;
  return Object.values(refused).flat()[0];
}
