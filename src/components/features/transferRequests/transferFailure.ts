import { HTTP_STATUS } from "@/constants/api";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import { ApiRequestError, DetailAnswerSchema, updatingOr } from "@/lib/api";

/**
 * What to say when asking, answering or cancelling failed. A refusal (403) or a conflict (409)
 * carries the server's short reason, e.g. "Someone has already asked to take this Student."
 */
export function transferFailure(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return TRANSFER_TEXT.changeFailed;
  const isRefusal = error.status === HTTP_STATUS.forbidden || error.status === HTTP_STATUS.conflict;
  if (!isRefusal) return updatingOr(error, TRANSFER_TEXT.changeFailed);
  const refused = DetailAnswerSchema.safeParse(error.body);
  return refused.success ? refused.data.detail : TRANSFER_TEXT.notWaiting;
}

/** The first word of a name, e.g. "Anjali" for "Anjali Gurung". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
