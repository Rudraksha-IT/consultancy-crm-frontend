import type { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import { SESSION_ENDED_HEADER } from "@/constants/session";

import { ApiRequestError } from "./errors";
import { reportLoginEnded } from "./loginEnded";
import { reportRestriction, restrictionOf } from "./restriction";
import { reportUnexpectedError, unexpectedErrorOf } from "./unexpected";
import { isUpdatingAnswer, reportServerAnswer } from "./updating";

const JSON_HEADERS = { Accept: "application/json" } as const;
const SENT_JSON_HEADERS = { ...JSON_HEADERS, "Content-Type": "application/json" } as const;

/**
 * GET a JSON endpoint on the same origin and validate its body. The Next.js server forwards
 * `/api/...` to Django (src/app/api/[...path]/route.ts) with the browser's host and the access
 * token from its sealed login cookie, so Django resolves both the Consultancy and the person.
 * Nothing here ever sees a token. Changes need no CSRF token: the server checks the browser's
 * `Origin` instead (ADR 0003).
 */
export async function getJson<T>(
  path: string,
  schema: z.ZodType<T>,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const response = await send(path, { credentials: "same-origin", headers: JSON_HEADERS }, fetchFn);
  return parseBody(path, response, schema);
}

/** POST a JSON body and validate the JSON answer. */
export async function postJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const response = await sendJson("POST", path, JSON.stringify(body), fetchFn);
  return parseBody(path, response, schema);
}

/** PUT a JSON body, replacing a resource, and validate the answer. */
export async function putJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const response = await sendJson("PUT", path, JSON.stringify(body), fetchFn);
  return parseBody(path, response, schema);
}

/** PATCH a JSON body, changing part of a resource, and validate the answer. */
export async function patchJson<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const response = await sendJson("PATCH", path, JSON.stringify(body), fetchFn);
  return parseBody(path, response, schema);
}

/**
 * POST a form with a file (multipart) and validate the JSON answer. The browser sets the
 * content type with its boundary, so none is given here.
 */
export async function postForm<T>(
  path: string,
  form: FormData,
  schema: z.ZodType<T>,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const response = await send(
    path,
    { method: "POST", credentials: "same-origin", headers: JSON_HEADERS, body: form },
    fetchFn,
  );
  return parseBody(path, response, schema);
}

/** DELETE with no body, from an endpoint that answers with JSON, and validate the answer. */
export async function deleteJson<T>(
  path: string,
  schema: z.ZodType<T>,
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const response = await sendJson("DELETE", path, null, fetchFn);
  return parseBody(path, response, schema);
}

/** POST nothing to an endpoint that answers with no content. */
export function postWithoutBody(path: string, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("POST", path, fetchFn);
}

/** POST or DELETE with no body, to an endpoint that answers with no content. */
export async function sendWithoutBody(
  method: "POST" | "DELETE",
  path: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const response = await sendJson(method, path, null, fetchFn);
  if (!response.ok) {
    throw await failure(path, response);
  }
}

/** DELETE with a JSON body (several records at once), to an endpoint that answers with no content. */
export async function deleteWithJson(
  path: string,
  body: unknown,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const response = await sendJson("DELETE", path, JSON.stringify(body), fetchFn);
  if (!response.ok) {
    throw await failure(path, response);
  }
}

/** POST nothing and take the answer as a file (e.g. a ZIP download). */
export async function postForBlob(path: string, fetchFn: typeof fetch = fetch): Promise<Blob> {
  const response = await sendJson("POST", path, null, fetchFn);
  if (!response.ok) {
    throw await failure(path, response);
  }
  return response.blob();
}

/** POST a JSON body and take the answer as a file (e.g. a CSV export). */
export async function postJsonForBlob(
  path: string,
  body: unknown,
  fetchFn: typeof fetch = fetch,
): Promise<Blob> {
  const response = await sendJson("POST", path, JSON.stringify(body), fetchFn);
  if (!response.ok) {
    throw await failure(path, response);
  }
  return response.blob();
}

function sendJson(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body: string | null,
  fetchFn: typeof fetch,
): Promise<Response> {
  return send(
    path,
    { method, credentials: "same-origin", headers: SENT_JSON_HEADERS, body },
    fetchFn,
  );
}

async function send(path: string, init: RequestInit, fetchFn: typeof fetch): Promise<Response> {
  let response: Response;
  try {
    response = await fetchFn(path, init);
  } catch {
    throw new ApiRequestError(path, null);
  }
  if (response.ok) reportServerAnswer(false);
  return response;
}

async function parseBody<T>(path: string, response: Response, schema: z.ZodType<T>): Promise<T> {
  if (!response.ok) {
    throw await failure(path, response);
  }
  const parsed = schema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new ApiRequestError(path, response.status);
  }
  return parsed.data;
}

/**
 * The error for a refused answer. A refusal because of the office's Status (issue 42) is also
 * reported to the app shell, which shows the server's reason instead of a generic error; so is an
 * unexpected server error's reference (issue 58), which staff can quote to us. "The app is being
 * updated" and "not logged in" (ticket 14) are reported too: the app says the first where it would
 * show a generic error, and the logged-in shell sends the person to log in again on the second.
 */
async function failure(path: string, response: Response): Promise<ApiRequestError> {
  const body = await readJson(response);
  const restriction = restrictionOf(response.status, body);
  if (restriction !== null) reportRestriction(restriction);
  const reference = unexpectedErrorOf(response.status, body);
  if (reference !== null) reportUnexpectedError(reference);
  reportServerAnswer(isUpdatingAnswer(response.status, body));
  const hasLoginEnded = response.headers.get(SESSION_ENDED_HEADER) !== null;
  if (response.status === HTTP_STATUS.unauthorized) reportLoginEnded(hasLoginEnded);
  return new ApiRequestError(path, response.status, body, hasLoginEnded);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    return body;
  } catch {
    return undefined;
  }
}
