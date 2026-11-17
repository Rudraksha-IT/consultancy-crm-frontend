import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import {
  BACKEND_TIMEOUT_MS,
  BULK_SEND_PATH,
  BULK_SEND_TIMEOUT_MS,
  CHANGING_METHODS,
  FORWARDED_METHODS,
  type ForwardedMethod,
  LOGO_UPLOAD_PATH,
  MAX_LOGO_UPLOAD_BODY_BYTES,
  MAX_REQUEST_BODY_BYTES,
  MAX_UPLOAD_BODY_BYTES,
  PROXY_MESSAGES,
  UPLOAD_PATH,
} from "@/constants/backend";
import { openChallenge, openTokens, readAuthCookie, readChallengeCookie } from "@/lib/auth-cookie";
import type { ServerConfig } from "@/lib/config";
import { serverLogger, type ServerLogger } from "@/lib/logger";

import { loginBrowser } from "./browser";
import type { Call } from "./call";
import { clientAddressFor } from "./clientAddress";
import { readLimitedBody } from "./requestBody";
import { methodNotAllowed, refusal } from "./responses";
import { answerCall } from "./session";

export type ForwardOptions = {
  config: ServerConfig;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  logger?: ServerLogger;
  /** False for calls Django never needs the client's address for (the Central login). */
  sendsClientAddress?: boolean;
};

/** What every call has before it is checked: its correlation ID and where it is logged. */
type Start = { correlationId: string; logger: ServerLogger };

const METHODS: readonly string[] = FORWARDED_METHODS;
const CHANGING: readonly string[] = CHANGING_METHODS;
const SUBDOMAIN = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const PORT = "(?::[0-9]{1,5})?";

function isForwardedMethod(method: string): method is ForwardedMethod {
  return METHODS.includes(method);
}

/** The browser's host, lowercased, if it is one subdomain of the product domain; otherwise null. */
function consultancyHost(host: string | null, productDomain: string): string | null {
  const pattern = new RegExp(`^${SUBDOMAIN}\\.${productDomain.replaceAll(".", "\\.")}${PORT}$`);
  const lowered = host?.toLowerCase() ?? "";
  return pattern.test(lowered) ? lowered : null;
}

/**
 * Whether a change comes from a page on this same host (ADR 0003, instead of Django's CSRF check):
 * browsers send `Origin` with every POST, PUT, PATCH and DELETE, and a page can't forge it.
 */
function isFromOwnPage(request: Request, host: string): boolean {
  if (!CHANGING.includes(request.method)) return true;
  const origin = request.headers.get("origin") ?? "";
  return URL.canParse(origin) && new URL(origin).host === host;
}

/** How large the body may be: a Document or logo upload may be larger than any other call. */
function bodyLimit(request: Request): number {
  if (request.method !== "POST") return MAX_REQUEST_BODY_BYTES;
  const path = new URL(request.url).pathname;
  if (UPLOAD_PATH.test(path)) return MAX_UPLOAD_BODY_BYTES;
  if (LOGO_UPLOAD_PATH.test(path)) return MAX_LOGO_UPLOAD_BODY_BYTES;
  return MAX_REQUEST_BODY_BYTES;
}

/**
 * Forward one browser call to `/api/...` to Django on its internal address (ADR 0002). Django
 * learns the Consultancy from `X-Forwarded-Host`, which this server sets from the browser's own
 * host, trusts the call because of `X-Internal-Token`, and knows who is logged in from the Bearer
 * token this server takes from the sealed cookie (ADR 0003). Failures here answer with a short
 * message that never reveals Django's address.
 */
export async function forwardToBackend(
  request: Request,
  options: ForwardOptions,
): Promise<Response> {
  const started = Date.now();
  const start: Start = {
    correlationId: crypto.randomUUID(),
    logger: options.logger ?? serverLogger,
  };
  const response = await answer(request, options, start);
  // The path only: the query string, cookies, tokens and bodies are never logged.
  start.logger.api("API request", {
    url: new URL(request.url).pathname,
    method: request.method,
    status: response.status,
    timeTaken: `${String(Date.now() - started)}ms`,
    correlationId: start.correlationId,
  });
  return response;
}

async function answer(request: Request, options: ForwardOptions, start: Start): Promise<Response> {
  const host = consultancyHost(request.headers.get("host"), options.config.productDomain);
  if (host === null) return refusal(HTTP_STATUS.notFound, PROXY_MESSAGES.notFound);
  if (!isForwardedMethod(request.method)) return methodNotAllowed();
  if (!isFromOwnPage(request, host)) {
    // The reason only: the other site's address is the browser's to send, not ours to log.
    start.logger.warn("API refused", {
      url: new URL(request.url).pathname,
      method: request.method,
      reason: "origin",
      correlationId: start.correlationId,
    });
    return refusal(HTTP_STATUS.forbidden, PROXY_MESSAGES.forbidden);
  }
  const body = await readLimitedBody(request, bodyLimit(request));
  if (body.kind === "tooLarge") {
    return refusal(HTTP_STATUS.payloadTooLarge, PROXY_MESSAGES.tooLarge);
  }
  return answerCall(buildCall(request, host, body.bytes, options, start));
}

/** How long to wait for Django: longer for a message to many Students. */
function timeoutFor(request: Request): number {
  const isBulkSend =
    request.method === "POST" && BULK_SEND_PATH.test(new URL(request.url).pathname);
  return isBulkSend ? BULK_SEND_TIMEOUT_MS : BACKEND_TIMEOUT_MS;
}

function buildCall(
  request: Request,
  host: string,
  body: Uint8Array<ArrayBuffer> | null,
  options: ForwardOptions,
  start: Start,
): Call {
  const cookie = readAuthCookie(request.headers.get("cookie"));
  const { key } = options.config.authCookie;
  return {
    ...start,
    request,
    url: new URL(request.url),
    host,
    config: options.config,
    fetchFn: options.fetchFn ?? fetch,
    timeoutMs: options.timeoutMs ?? timeoutFor(request),
    body,
    clientAddress:
      options.sendsClientAddress === false
        ? null
        : clientAddressFor(request.headers, options.config.clientAddress),
    cookie: {
      tokens: cookie === null ? null : openTokens(cookie, { key, host }),
      wasSent: cookie !== null,
    },
    challenge: openChallengeCookie(request, key, host),
    browser: loginBrowser(request.headers),
  };
}

/** The two-step challenge in the browser's sealed cookie (issue 61), if it opens here. */
function openChallengeCookie(request: Request, key: Uint8Array, host: string) {
  const challenge = readChallengeCookie(request.headers.get("cookie"));
  return challenge === null ? null : openChallenge(challenge, { key, host });
}
