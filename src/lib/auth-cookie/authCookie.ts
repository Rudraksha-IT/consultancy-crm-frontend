import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { z } from "zod";

import {
  AUTH_COOKIE,
  BROWSER_COOKIE,
  CHALLENGE_COOKIE,
  MAX_CHALLENGE_LENGTH,
  MAX_TOKEN_LENGTH,
} from "@/constants/backend";

import { AUTH_SCOPES, type AuthTokens, type PendingChallenge, type SealOptions } from "./types";

const CIPHER = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

const TokenSchema = z.string().min(1).max(MAX_TOKEN_LENGTH);
const AuthTokensSchema = z.object({
  access: TokenSchema,
  refresh: TokenSchema,
  scope: z.enum(AUTH_SCOPES),
});
const PendingChallengeSchema = z.object({
  challenge: z.string().min(1).max(MAX_CHALLENGE_LENGTH),
  scope: z.enum(AUTH_SCOPES),
});

/**
 * Encrypt the tokens for the cookie (AES-256-GCM, a new IV each time). The host is
 * authenticated with them, so the cookie only opens on the subdomain it was set on.
 */
export function sealTokens(tokens: AuthTokens, { key, host }: SealOptions): string {
  return seal(tokens, key, host, AUTH_COOKIE.version);
}

/** The tokens in a sealed cookie, or null when it was changed, forged, or is for another host. */
export function openTokens(value: string, { key, host }: SealOptions): AuthTokens | null {
  return open(value, key, host, AUTH_COOKIE, AuthTokensSchema);
}

/**
 * Encrypt a two-step challenge for its own cookie (issue 61), like the tokens. Sealed for this
 * host and for challenges only, so it never opens as tokens or on another subdomain.
 */
export function sealChallenge(pending: PendingChallenge, { key, host }: SealOptions): string {
  return seal(pending, key, challengeAad(host), CHALLENGE_COOKIE.version);
}

/** The challenge in a sealed two-step cookie, or null when it doesn't open here. */
export function openChallenge(value: string, { key, host }: SealOptions): PendingChallenge | null {
  return open(value, key, challengeAad(host), CHALLENGE_COOKIE, PendingChallengeSchema);
}

function challengeAad(host: string): string {
  return `${CHALLENGE_COOKIE.name}:${host}`;
}

function seal(value: unknown, key: Uint8Array, aad: string, version: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, key, iv).setAAD(Buffer.from(aad));
  const sealed = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  const packed = Buffer.concat([iv, cipher.getAuthTag(), sealed]);
  return `${version}${packed.toString("base64url")}`;
}

function open<T>(
  value: string,
  key: Uint8Array,
  aad: string,
  cookie: { version: string; maxLength: number },
  schema: z.ZodType<T>,
): T | null {
  if (!value.startsWith(cookie.version) || value.length > cookie.maxLength) return null;
  const packed = Buffer.from(value.slice(cookie.version.length), "base64url");
  if (packed.length <= IV_BYTES + TAG_BYTES) return null;
  const parsed = schema.safeParse(decrypt(packed, key, aad));
  return parsed.success ? parsed.data : null;
}

function decrypt(packed: Buffer, key: Uint8Array, aad: string): unknown {
  try {
    const decipher = createDecipheriv(CIPHER, key, packed.subarray(0, IV_BYTES));
    decipher.setAAD(Buffer.from(aad)).setAuthTag(packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const text = Buffer.concat([
      decipher.update(packed.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString();
    const body: unknown = JSON.parse(text);
    return body;
  } catch {
    return null;
  }
}

/** The sealed cookie's value from a browser `Cookie` header, or null when it isn't there. */
export function readAuthCookie(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, AUTH_COOKIE.name);
}

/** The sealed two-step cookie's value from a browser `Cookie` header, or null (issue 61). */
export function readChallengeCookie(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, CHALLENGE_COOKIE.name);
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  const prefix = `${name}=`;
  const cookie = (cookieHeader ?? "")
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(prefix));
  return cookie === undefined ? null : cookie.slice(prefix.length);
}

/** The browser's own cookie value from a browser `Cookie` header (issue 71), or null. */
export function readBrowserCookie(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, BROWSER_COOKIE.name);
}

/** `Set-Cookie` for this browser's value (issue 71): host-only, HTTP-only, for 400 days. */
export function browserCookieHeader(value: string, { secure }: { secure: boolean }): string {
  return cookieHeader(BROWSER_COOKIE, value, BROWSER_COOKIE.maxAgeSeconds, secure);
}

/** `Set-Cookie` for the sealed tokens: host-only (no Domain), HTTP-only, `SameSite=Lax`. */
export function authCookieHeader(value: string, { secure }: { secure: boolean }): string {
  return cookieHeader(AUTH_COOKIE, value, AUTH_COOKIE.maxAgeSeconds, secure);
}

/** `Set-Cookie` that removes the token cookie at once. */
export function clearedAuthCookieHeader({ secure }: { secure: boolean }): string {
  return cookieHeader(AUTH_COOKIE, "", 0, secure);
}

/** `Set-Cookie` for a sealed two-step challenge: like the tokens', but for 5 minutes only. */
export function challengeCookieHeader(value: string, { secure }: { secure: boolean }): string {
  return cookieHeader(CHALLENGE_COOKIE, value, CHALLENGE_COOKIE.maxAgeSeconds, secure);
}

/** `Set-Cookie` that removes the two-step cookie at once. */
export function clearedChallengeCookieHeader({ secure }: { secure: boolean }): string {
  return cookieHeader(CHALLENGE_COOKIE, "", 0, secure);
}

function cookieHeader(
  cookie: { name: string; path: string },
  value: string,
  maxAge: number,
  secure: boolean,
): string {
  const attributes = [
    `${cookie.name}=${value}`,
    `Path=${cookie.path}`,
    `Max-Age=${String(maxAge)}`,
    "HttpOnly",
    ...(secure ? ["Secure"] : []),
    "SameSite=Lax",
  ];
  return attributes.join("; ");
}
