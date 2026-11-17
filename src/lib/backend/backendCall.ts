import "server-only";

import { HTTP_STATUS } from "@/constants/api";
import { PROXY_MESSAGES } from "@/constants/backend";
import { stackFrames } from "@/lib/logger";

import type { Call } from "./call";
import { buildBackendHeaders } from "./requestHeaders";
import { refusal } from "./responses";

/** One request to Django, made on behalf of a browser call. */
export type BackendRequest = {
  method: string;
  path: string;
  body: Uint8Array<ArrayBuffer> | null;
  bearer: string | null;
  isJson: boolean;
  /** True on a login, so Django can name and reuse this browser's device (issue 71). */
  identifiesBrowser?: boolean;
};

/** Django's answer, read in full so it can be inspected and relayed. */
export type BackendAnswer = { status: number; headers: Headers; body: ArrayBuffer };

export type Failure = "timed out" | "unreachable";

export type BackendOutcome =
  { kind: "answer"; answer: BackendAnswer } | { kind: "failed"; failure: Failure };

/** The browser's own call (method, path, query and body), with this access token if any. */
export function browserRequest(call: Call, bearer: string | null): BackendRequest {
  const body = call.request.method === "GET" ? null : call.body;
  return {
    method: call.request.method,
    path: `${call.url.pathname}${call.url.search}`,
    body,
    bearer,
    isJson: false,
  };
}

/** A POST of a JSON body this server writes itself, without a Bearer token. */
export function jsonRequest(path: string, value: Record<string, unknown>): BackendRequest {
  const body = new TextEncoder().encode(JSON.stringify(value));
  return { method: "POST", path, body: new Uint8Array(body), bearer: null, isJson: true };
}

/** Django failed (5xx): its own ERROR line has the traceback under the same correlation ID. */
function logServerError(call: Call, status: number): void {
  call.logger.error("API error", {
    url: call.url.pathname,
    method: call.request.method,
    status,
    correlationId: call.correlationId,
  });
}

/** Call Django on its internal address; a failure is logged with a short reason only. */
export async function askBackend(call: Call, backend: BackendRequest): Promise<BackendOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, call.timeoutMs);
  try {
    const answer = await call.fetchFn(`${call.config.backendOrigin}${backend.path}`, {
      ...requestInit(call, backend),
      signal: controller.signal,
    });
    const body = await answer.arrayBuffer();
    if (answer.status >= HTTP_STATUS.serverError) logServerError(call, answer.status);
    return { kind: "answer", answer: { status: answer.status, headers: answer.headers, body } };
  } catch (error) {
    // A short reason and the frames only: the error's message can name Django's address.
    const failure = controller.signal.aborted ? "timed out" : "unreachable";
    call.logger.error("API error", {
      url: call.url.pathname,
      method: call.request.method,
      error: failure,
      stack: stackFrames(error),
      correlationId: call.correlationId,
    });
    return { kind: "failed", failure };
  } finally {
    clearTimeout(timer);
  }
}

/** The short answer for a call Django didn't answer. */
export function failureResponse(failure: Failure): Response {
  return failure === "timed out"
    ? refusal(HTTP_STATUS.gatewayTimeout, PROXY_MESSAGES.timedOut)
    : refusal(HTTP_STATUS.badGateway, PROXY_MESSAGES.unreachable);
}

/** The JSON in an answer's body, or undefined when it isn't JSON. */
export function jsonBody(answer: BackendAnswer): unknown {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(answer.body));
    return value;
  } catch {
    return undefined;
  }
}

function requestInit(call: Call, backend: BackendRequest): RequestInit {
  const headers = buildBackendHeaders(call.request.headers, {
    host: call.host,
    proto: call.url.protocol.replace(":", ""),
    internalToken: call.config.internalApiToken,
    correlationId: call.correlationId,
    bearer: backend.bearer,
    isJson: backend.isJson,
    clientAddress: call.clientAddress,
    browser: backend.identifiesBrowser === true ? call.browser : null,
  });
  const init: RequestInit = {
    method: backend.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (backend.body !== null) init.body = backend.body;
  return init;
}
