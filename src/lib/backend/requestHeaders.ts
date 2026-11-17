import "server-only";

import { BACKEND_HEADERS, FORWARDED_REQUEST_HEADERS } from "@/constants/backend";

/** What the Next.js server itself tells Django about a call; never taken from the browser. */
export type ServerSetHeaders = {
  host: string;
  proto: string;
  internalToken: string;
  correlationId: string;
  /** The access token from the sealed cookie, or null for calls made without a login. */
  bearer: string | null;
  /** True when this server wrote the body itself as JSON (refresh, logout). */
  isJson: boolean;
  /** The client's address from Cloudflare (ADR 0004), or null to send none. */
  clientAddress: string | null;
  /** The browser a login comes from (issue 71), or null on every other call. */
  browser: { key: string; agent: string | null } | null;
};

const JSON_TYPE = "application/json";

/**
 * The headers for Django: an allow-list of the browser's (so cookies, forwarding, token, `Host`
 * and hop-by-hop headers it sent are dropped), plus the ones only this server sets.
 */
export function buildBackendHeaders(browser: Headers, own: ServerSetHeaders): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = browser.get(name);
    if (value !== null) headers.set(name, value);
  }
  for (const [name, value] of ownHeaders(own)) headers.set(name, value);
  return headers;
}

/** The headers only this server sets; any of them the browser sent was dropped above. */
function ownHeaders(own: ServerSetHeaders): [string, string][] {
  const headers: [string, string | null][] = [
    [BACKEND_HEADERS.forwardedHost, own.host],
    [BACKEND_HEADERS.forwardedProto, own.proto],
    [BACKEND_HEADERS.internalToken, own.internalToken],
    [BACKEND_HEADERS.correlationId, own.correlationId],
    [BACKEND_HEADERS.authorization, own.bearer === null ? null : `Bearer ${own.bearer}`],
    [BACKEND_HEADERS.contentType, own.isJson ? JSON_TYPE : null],
    [BACKEND_HEADERS.clientAddress, own.clientAddress],
    ...browserHeaders(own.browser),
  ];
  return headers.filter((header): header is [string, string] => header[1] !== null);
}

/** What Django is told about the browser on a login (issue 71); nothing on other calls. */
function browserHeaders(browser: ServerSetHeaders["browser"]): [string, string | null][] {
  if (browser === null) return [];
  return [
    [BACKEND_HEADERS.browserKey, browser.key],
    [BACKEND_HEADERS.browserAgent, browser.agent],
  ];
}
