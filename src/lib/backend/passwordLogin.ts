import "server-only";

import {
  PASSWORD_LOGIN_MAX_ADDRESSES,
  PASSWORD_LOGIN_PATH,
  PASSWORD_LOGIN_TRIES_PER_ADDRESS,
  PASSWORD_LOGIN_WINDOW_MS,
} from "@/constants/backend";

import { refuseOverAddressLimit } from "./addressLimit";
import { createRateLimiter, type RateLimiter } from "./rateLimit";

/** This server's count of password logins per browser address (security 01). */
export const passwordLoginLimiter = createRateLimiter({
  limit: PASSWORD_LOGIN_TRIES_PER_ADDRESS,
  windowMs: PASSWORD_LOGIN_WINDOW_MS,
  maxKeys: PASSWORD_LOGIN_MAX_ADDRESSES,
});

/** 429 once a browser address has used up its password tries; null for any other call. */
export function limitPasswordLogin(
  request: Request,
  limiter: RateLimiter = passwordLoginLimiter,
): Response | null {
  if (request.method !== "POST") return null;
  if (!PASSWORD_LOGIN_PATH.test(new URL(request.url).pathname)) return null;
  return refuseOverAddressLimit(request, limiter, PASSWORD_LOGIN_WINDOW_MS);
}
