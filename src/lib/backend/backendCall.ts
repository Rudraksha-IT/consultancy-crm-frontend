import "server-only";

import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import { PROXY_MESSAGES, UPDATE_RETRY, UPDATING_CODE } from "@/constants/backend";
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

/** One try at Django: its answer, or why it gave none (and where, for the log). */
type Try = BackendOutcome & { stack?: string | undefined };

/**
 * Call Django on its internal address; a failure is logged with a short reason only. While Django
 * can't be reached (a new version being switched in, ticket 14), a read (GET) is tried again after
 * short waits that grow, for up to `UPDATE_RETRY.totalMs`; a change is never tried again.
 */
export async function askBackend(call: Call, backend: BackendRequest): Promise<BackendOutcome> {
  const first = await tryOnce(call, backend);
  const outcome =
    backend.method === "GET" && isUpdating(first)
      ? await tryAgainWhileUpdating(call, backend)
      : first;
  logFailure(call, outcome);
  return outcome.kind === "failed" ? { kind: "failed", failure: outcome.failure } : outcome;
}

/** A read Django didn't answer: try again after growing waits until it does, or time is up. */
async function tryAgainWhileUpdating(call: Call, backend: BackendRequest): Promise<Try> {
  const started = Date.now();
  let wait: number = UPDATE_RETRY.firstWaitMs;
  let outcome: Try = { kind: "failed", failure: "unreachable" };
  while (isUpdating(outcome) && Date.now() - started + wait <= UPDATE_RETRY.totalMs) {
    await sleep(wait);
    wait = Math.min(wait * 2, UPDATE_RETRY.longestWaitMs);
    outcome = await tryOnce(call, backend);
  }
  call.waited.ms += Date.now() - started;
  return outcome;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Django couldn't be reached, or something between answered that it isn't there (502, 504, or a
 * 503 that isn't Django's own JSON refusal: Django says 503 itself when, say, storage is down).
 */
function isUpdating(outcome: Try): boolean {
  if (outcome.kind === "failed") return outcome.failure === "unreachable";
  const { status } = outcome.answer;
  if (status === HTTP_STATUS.badGateway || status === HTTP_STATUS.gatewayTimeout) return true;
  return status === HTTP_STATUS.serviceUnavailable && !isDjangoRefusal(outcome.answer);
}

const DjangoRefusalSchema = z.looseObject({ detail: z.string() });

function isDjangoRefusal(answer: BackendAnswer): boolean {
  return DjangoRefusalSchema.safeParse(jsonBody(answer)).success;
}

async function tryOnce(call: Call, backend: BackendRequest): Promise<Try> {
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
    const outcome: Try = {
      kind: "answer",
      answer: { status: answer.status, headers: answer.headers, body },
    };
    // Something other than Django answering that it isn't there is the same as no answer.
    return isUpdating(outcome) ? { kind: "failed", failure: "unreachable" } : outcome;
  } catch (error) {
    // A short reason and the frames only: the error's message can name Django's address.
    const failure = controller.signal.aborted ? "timed out" : "unreachable";
    return { kind: "failed", failure, stack: stackFrames(error) };
  } finally {
    clearTimeout(timer);
  }
}

function logFailure(call: Call, outcome: Try): void {
  if (outcome.kind === "answer") {
    if (outcome.answer.status >= HTTP_STATUS.serverError) {
      logServerError(call, outcome.answer.status);
    }
    return;
  }
  call.logger.error("API error", {
    url: call.url.pathname,
    method: call.request.method,
    error: outcome.failure,
    stack: outcome.stack,
    correlationId: call.correlationId,
  });
}

/**
 * The short answer for a call Django didn't answer. Unreachable means a new version is being
 * switched in: the app says so (code `updating`) instead of a generic error (ticket 14).
 */
export function failureResponse(failure: Failure): Response {
  if (failure === "timed out") {
    return refusal(HTTP_STATUS.gatewayTimeout, PROXY_MESSAGES.timedOut);
  }
  return Response.json(
    { detail: PROXY_MESSAGES.updating, code: UPDATING_CODE },
    { status: HTTP_STATUS.serviceUnavailable, headers: { "cache-control": "no-store" } },
  );
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
