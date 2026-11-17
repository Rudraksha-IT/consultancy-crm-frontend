import "server-only";

import {
  LOGIN_STEP_MAX_ADDRESSES,
  LOGIN_STEP_PATH,
  LOGIN_STEP_TRIES_PER_ADDRESS,
  LOGIN_STEP_WINDOW_MS,
} from "@/constants/backend";

import { refuseOverAddressLimit } from "./addressLimit";
import { createRateLimiter, type RateLimiter } from "./rateLimit";

/** This server's count of email-first login steps per browser address (issue 66). */
export const loginStepLimiter = createRateLimiter({
  limit: LOGIN_STEP_TRIES_PER_ADDRESS,
  windowMs: LOGIN_STEP_WINDOW_MS,
  maxKeys: LOGIN_STEP_MAX_ADDRESSES,
});

/** 429 once a browser address has used up its email steps; null for any other call. */
export function limitLoginStep(
  request: Request,
  limiter: RateLimiter = loginStepLimiter,
): Response | null {
  if (request.method !== "POST") return null;
  if (!LOGIN_STEP_PATH.test(new URL(request.url).pathname)) return null;
  return refuseOverAddressLimit(request, limiter, LOGIN_STEP_WINDOW_MS);
}
