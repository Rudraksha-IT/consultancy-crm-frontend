import "server-only";

import {
  PLATFORM_RESET_MAX_ADDRESSES,
  PLATFORM_RESET_PATH,
  PLATFORM_RESET_TRIES_PER_ADDRESS,
  PLATFORM_RESET_WINDOW_MS,
} from "@/constants/backend";

import { refuseOverAddressLimit } from "./addressLimit";
import { createRateLimiter, type RateLimiter } from "./rateLimit";

/** This server's one count of Platform forgot-password calls per browser address (issue 63). */
export const platformResetLimiter = createRateLimiter({
  limit: PLATFORM_RESET_TRIES_PER_ADDRESS,
  windowMs: PLATFORM_RESET_WINDOW_MS,
  maxKeys: PLATFORM_RESET_MAX_ADDRESSES,
});

/**
 * The Platform's forgot password (issue 63): its three steps share one count per browser address
 * here, and Django limits each email by its hash. Returns 429 once the address has used up its
 * tries, or null for every other call and for calls still within the limit.
 */
export function limitPlatformPasswordReset(
  request: Request,
  limiter: RateLimiter = platformResetLimiter,
): Response | null {
  if (request.method !== "POST") return null;
  if (!PLATFORM_RESET_PATH.test(new URL(request.url).pathname)) return null;
  return refuseOverAddressLimit(request, limiter, PLATFORM_RESET_WINDOW_MS);
}
