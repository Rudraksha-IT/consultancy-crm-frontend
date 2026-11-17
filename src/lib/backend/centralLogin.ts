import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import {
  CENTRAL_LOGIN_MAX_ADDRESSES,
  CENTRAL_LOGIN_TRIES_PER_ADDRESS,
  CENTRAL_LOGIN_WINDOW_MS,
  PROXY_MESSAGES,
} from "@/constants/backend";

import { refuseOverAddressLimit } from "./addressLimit";
import { forwardToBackend, type ForwardOptions } from "./forwardToBackend";
import { createRateLimiter, type RateLimiter } from "./rateLimit";
import { refusal } from "./responses";

/** This server's one count of Central login lookups per browser address. */
export const centralLoginLimiter = createRateLimiter({
  limit: CENTRAL_LOGIN_TRIES_PER_ADDRESS,
  windowMs: CENTRAL_LOGIN_WINDOW_MS,
  maxKeys: CENTRAL_LOGIN_MAX_ADDRESSES,
});

export type CentralLoginOptions = ForwardOptions & { limiter?: RateLimiter };

/**
 * `POST /api/central-login/` (issue 44): refused with 429 once this browser address has used up
 * its lookups, otherwise forwarded to Django like any call. Django answers the same for every
 * email and limits each email on its own.
 */
export function answerCentralLogin(
  request: Request,
  options: CentralLoginOptions,
): Promise<Response> {
  const limiter = options.limiter ?? centralLoginLimiter;
  const refused = refuseOverAddressLimit(request, limiter, CENTRAL_LOGIN_WINDOW_MS);
  if (refused !== null) return Promise.resolve(refused);
  // Django has no use for the address here, so it is never sent.
  return forwardToBackend(request, { ...options, sendsClientAddress: false });
}

/** 405 for any method but POST. */
export function onlyPost(): Response {
  return refusal(HTTP_STATUS.methodNotAllowed, PROXY_MESSAGES.methodNotAllowed, {
    allow: "POST",
  });
}
