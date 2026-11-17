import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import {
  FORWARDED_METHODS,
  PROXY_MESSAGES,
  RELAYED_RESPONSE_HEADERS,
  RETURNED_RESPONSE_HEADERS,
} from "@/constants/backend";

import type { BackendAnswer } from "./backendCall";

const NO_STORE = { "cache-control": "no-store" } as const;

/** A short JSON refusal (`{"detail": ...}`) that is never cached. */
export function refusal(
  status: number,
  detail: string,
  headers: Readonly<Record<string, string>> = {},
): Response {
  return Response.json({ detail }, { status, headers: { ...NO_STORE, ...headers } });
}

/** 405 for a method the API doesn't answer, listing the ones it does. */
export function methodNotAllowed(): Response {
  return refusal(HTTP_STATUS.methodNotAllowed, PROXY_MESSAGES.methodNotAllowed, {
    allow: FORWARDED_METHODS.join(", "),
  });
}

/** A JSON answer this server writes itself, never cached. */
export function jsonAnswer(body: Record<string, unknown>): Response {
  return Response.json(body, { headers: NO_STORE });
}

/** An empty 204 answer, never cached. */
export function noContent(): Response {
  return new Response(null, { status: HTTP_STATUS.noContent, headers: NO_STORE });
}

/** Django's answer for the browser: same status and body, and nothing else of its, no cookies. */
export function relayResponse(answer: BackendAnswer): Response {
  const headers = new Headers({ ...NO_STORE, ...RELAYED_RESPONSE_HEADERS });
  for (const name of RETURNED_RESPONSE_HEADERS) {
    const value = answer.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const body = answer.body.byteLength === 0 ? null : answer.body;
  return new Response(body, { status: answer.status, headers });
}

/** The same response with one more `Set-Cookie`. */
export function withSetCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.append("set-cookie", cookie);
  return new Response(response.body, { status: response.status, headers });
}
