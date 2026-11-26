import { HTTP_STATUS } from "@/constants/api";
import { MESSAGES } from "@/constants/messages";
import { ApiRequestError, InvalidFieldsError } from "@/lib/api";

/**
 * What to say when a change wasn't saved: no longer allowed (403), changed by someone else in the
 * meantime (409), or anything else.
 */
export function saveFailure(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return MESSAGES.saveFailed;
  if (error.status === HTTP_STATUS.forbidden) return MESSAGES.cannotChangeStudent;
  if (error.status === HTTP_STATUS.conflict) return MESSAGES.studentChangedMeanwhile;
  return MESSAGES.saveFailed;
}

/** Why a Stage change wasn't saved: the server's own reason when it gives one. */
export function stageFailure(error: unknown): string {
  if (error instanceof InvalidFieldsError) {
    const [first] = Object.values<string[] | undefined>(error.fieldErrors).flat();
    if (first !== undefined) return first;
  }
  return saveFailure(error);
}
