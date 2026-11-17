import { HTTP_STATUS } from "@/constants/api";
import { MESSAGES } from "@/constants/messages";
import { ApiRequestError } from "@/lib/api";

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
