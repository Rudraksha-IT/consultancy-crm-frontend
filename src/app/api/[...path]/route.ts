import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import { PROXY_MESSAGES } from "@/constants/backend";
import {
  forwardToBackend,
  limitLoginStep,
  limitPasswordLogin,
  limitPlatformPasswordReset,
  methodNotAllowed,
  refusal,
} from "@/lib/backend";
import { dropProductNameIfChanged } from "@/lib/brand/productName";
import { getServerConfig, type ServerConfig } from "@/lib/config";

/**
 * Every browser call to `/api/...` lands here and is forwarded to Django by this server
 * (ADR 0002). The browser never talks to Django.
 */
async function forward(request: Request): Promise<Response> {
  const config = readConfig();
  if (config === null) return refusal(HTTP_STATUS.serverError, PROXY_MESSAGES.misconfigured);
  // Limited per browser address too: the Platform's reset and Join (63, 65), the email step (66),
  // the password step (security 01).
  const limited =
    limitPlatformPasswordReset(request) ?? limitLoginStep(request) ?? limitPasswordLogin(request);
  if (limited !== null) return limited;
  const answer = await forwardToBackend(request, { config });
  dropProductNameIfChanged(request, answer);
  return answer;
}

/** Startup already refuses a bad environment (src/instrumentation.ts); this is the fallback. */
function readConfig(): ServerConfig | null {
  try {
    return getServerConfig();
  } catch {
    return null;
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;

// Next.js would answer these by itself; the API refuses them.
export function HEAD(): Response {
  return methodNotAllowed();
}

export function OPTIONS(): Response {
  return methodNotAllowed();
}
