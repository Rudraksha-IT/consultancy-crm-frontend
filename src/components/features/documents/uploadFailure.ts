import { HTTP_STATUS } from "@/constants/api";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { ApiRequestError, DetailAnswerSchema } from "@/lib/api";

/**
 * What to say when an upload, or adding files, failed for a reason other than its fields: not
 * allowed (403), too big together for the server (413), the server's own short reason (400,
 * e.g. a Rejected Document needs a new copy), or anything else.
 */
export function uploadFailure(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return DOCUMENT_TEXT.uploadFailed;
  if (error.status === HTTP_STATUS.forbidden) return DOCUMENT_TEXT.notAllowed;
  if (error.status === HTTP_STATUS.payloadTooLarge) return DOCUMENT_TEXT.tooBigTogether;
  return serverReason(error) ?? DOCUMENT_TEXT.uploadFailed;
}

/** The server's short reason for a refusal (400), if it gave one. */
function serverReason(error: ApiRequestError): string | null {
  if (error.status !== HTTP_STATUS.badRequest) return null;
  const answer = DetailAnswerSchema.safeParse(error.body);
  return answer.success ? answer.data.detail : null;
}
