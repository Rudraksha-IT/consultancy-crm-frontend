import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import { PROXY_MESSAGES } from "@/constants/backend";

import { readClientAddress } from "./clientAddress";
import type { RateLimiter } from "./rateLimit";
import { refusal } from "./responses";

/** The key for a call with no valid address (only locally: Cloudflare always sets one). */
const NO_ADDRESS = "no-address";

/**
 * Count one call from the browser's address (Cloudflare's, ADR 0004) and answer 429 once it has
 * used up its tries, or null to go on. A call from another site's page is never counted: it is
 * refused by forwardToBackend, so it can't use up someone else's tries.
 */
export function refuseOverAddressLimit(
  request: Request,
  limiter: RateLimiter,
  windowMs: number,
): Response | null {
  if (!isFromOwnPage(request)) return null;
  if (limiter.take(readClientAddress(request.headers) ?? NO_ADDRESS)) return null;
  return refusal(HTTP_STATUS.tooManyRequests, PROXY_MESSAGES.tooManyTries, {
    "retry-after": String(windowMs / 1000),
  });
}

function isFromOwnPage(request: Request): boolean {
  const origin = request.headers.get("origin") ?? "";
  return URL.canParse(origin) && new URL(origin).host === request.headers.get("host");
}
