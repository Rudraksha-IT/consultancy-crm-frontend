import "server-only";

import { HTTP_STATUS } from "@/constants/api";

import {
  authCookieHeader,
  browserCookieHeader,
  challengeCookieHeader,
  clearedAuthCookieHeader,
  clearedChallengeCookieHeader,
  sealChallenge,
  sealTokens,
  type AuthTokens,
  type PendingChallenge,
} from "@/lib/auth-cookie";

import type { Call } from "./call";
import { withSetCookie } from "./responses";

/** `Set-Cookie` that keeps these tokens, sealed for this call's host. */
export function keepTokens(call: Call, tokens: AuthTokens): string {
  const { key, isSecure } = call.config.authCookie;
  return authCookieHeader(sealTokens(tokens, { key, host: call.host }), { secure: isSecure });
}

/** `Set-Cookie` that ends the login in this browser. */
export function forgetTokens(call: Call): string {
  return clearedAuthCookieHeader({ secure: call.config.authCookie.isSecure });
}

/** `Set-Cookie` that keeps a two-step challenge (issue 61), sealed for this call's host. */
export function keepChallenge(call: Call, pending: PendingChallenge): string {
  const { key, isSecure } = call.config.authCookie;
  return challengeCookieHeader(sealChallenge(pending, { key, host: call.host }), {
    secure: isSecure,
  });
}

/** `Set-Cookie` that ends a two-step challenge in this browser. */
export function forgetChallenge(call: Call): string {
  return clearedChallengeCookieHeader({ secure: call.config.authCookie.isSecure });
}

/**
 * The answer, keeping a new browser's value in its own cookie once a login step passed (issue
 * 71), so the next login on this browser reuses its device.
 */
export function rememberBrowser(call: Call, response: Response): Response {
  if (!call.browser.isNew || response.status !== HTTP_STATUS.ok) return response;
  const cookie = browserCookieHeader(call.browser.key, { secure: call.config.authCookie.isSecure });
  return withSetCookie(response, cookie);
}
