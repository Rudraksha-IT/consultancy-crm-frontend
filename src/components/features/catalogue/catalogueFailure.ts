import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { HTTP_STATUS } from "@/constants/api";
import { ApiRequestError, updatingOr } from "@/lib/api";

/** What to say when a Catalogue change wasn't saved: not an Admin (403), or anything else. */
export function catalogueFailure(error: unknown): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? CATALOGUE_TEXT.notAdmin : updatingOr(error, CATALOGUE_TEXT.changeFailed);
}
