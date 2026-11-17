import { HTTP_STATUS } from "@/constants/api";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { ApiRequestError } from "@/lib/api";

/**
 * Why a Document wasn't marked correct or rejected: no longer allowed (403), already checked or
 * replaced by someone else in the meantime (400), or anything else.
 */
export function checkFailure(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return DOCUMENT_TEXT.checkFailed;
  if (error.status === HTTP_STATUS.forbidden) return DOCUMENT_TEXT.checkNotAllowed;
  if (error.status === HTTP_STATUS.badRequest) return DOCUMENT_TEXT.changedMeanwhile;
  return DOCUMENT_TEXT.checkFailed;
}
