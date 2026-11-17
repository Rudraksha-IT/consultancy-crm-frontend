import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import { PROXY_MESSAGES } from "@/constants/backend";
import { answerCentralLogin, onlyPost, refusal } from "@/lib/backend";
import { getServerConfig, type ServerConfig } from "@/lib/config";

/**
 * The Central login's lookup (issue 44): limited per browser address here, then forwarded to
 * Django, which answers the same for every email. Only POST.
 */
export async function POST(request: Request): Promise<Response> {
  const config = readConfig();
  if (config === null) return refusal(HTTP_STATUS.serverError, PROXY_MESSAGES.misconfigured);
  return answerCentralLogin(request, { config });
}

/** Startup already refuses a bad environment (src/instrumentation.ts); this is the fallback. */
function readConfig(): ServerConfig | null {
  try {
    return getServerConfig();
  } catch {
    return null;
  }
}

export const GET = onlyPost;
export const PUT = onlyPost;
export const PATCH = onlyPost;
export const DELETE = onlyPost;
export const HEAD = onlyPost;
export const OPTIONS = onlyPost;
