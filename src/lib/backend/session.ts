import "server-only";

import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import {
  AUTH_ROUTES,
  MAX_CHALLENGE_LENGTH,
  MAX_TOKEN_LENGTH,
  METHOD_AUTH_ROUTES,
  PROXY_MESSAGES,
  SESSION_ENDED_HEADER,
  START_AGAIN_MESSAGE,
} from "@/constants/backend";
import type { AuthScope, AuthTokens } from "@/lib/auth-cookie";

import {
  askBackend,
  browserRequest,
  failureResponse,
  jsonBody,
  jsonRequest,
  type BackendAnswer,
} from "./backendCall";
import type { Call } from "./call";
import { renewTokens } from "./refresh";
import { jsonAnswer, noContent, refusal, relayResponse, withSetCookie } from "./responses";
import {
  forgetChallenge,
  forgetTokens,
  keepChallenge,
  keepTokens,
  rememberBrowser,
} from "./tokenCookie";

type AuthAction = (typeof AUTH_ROUTES)[keyof typeof AUTH_ROUTES]["action"];

const TokenSchema = z.string().min(1).max(MAX_TOKEN_LENGTH);
// Django's login answer: both tokens plus what the browser gets (the context, or who logged in).
const LoginAnswerSchema = z.looseObject({ access: TokenSchema, refresh: TokenSchema });
// Django's login answer when two-step login is on (issue 61): what comes next, and the challenge.
const ChallengeAnswerSchema = z.object({
  two_factor: z.enum(["setup", "verify"]),
  challenge: z.string().min(1).max(MAX_CHALLENGE_LENGTH),
});
// Keys that only a login answer has; a renewal answer without any of them is relayed as it is.
const LOGIN_ANSWER_KEYS = ["access", "refresh", "challenge", "two_factor"] as const;
const StartAgainSchema = z.looseObject({ start_again: z.literal(true) });
const BrowserObjectSchema = z.record(z.string(), z.unknown());

type AuthRoute = { action: AuthAction; scope: AuthScope };

const AUTH_PATHS: ReadonlyMap<string, AuthRoute> = new Map(Object.entries(AUTH_ROUTES));
const METHOD_AUTH_PATHS: ReadonlyMap<string, AuthRoute> = new Map(
  Object.entries(METHOD_AUTH_ROUTES),
);

const HANDLERS: Record<AuthAction, (call: Call, scope: AuthScope) => Promise<Response>> = {
  login: logIn,
  logout: logOut,
  renew: renewLogin,
  challenge: (call, scope) => withChallenge(call, scope, relayTidyingChallenge),
  secondStep: (call, scope) => withChallenge(call, scope, finishSecondStep),
  // Only this server refreshes, with the refresh token only it can read.
  refresh: () => Promise.resolve(refusal(HTTP_STATUS.notFound, PROXY_MESSAGES.notFound)),
};

/**
 * Answer a checked browser call (ADR 0003): logins and logouts are handled around Django's own
 * endpoints, and every other call is made with the cookie's access token, renewed when expired.
 */
export function answerCall(call: Call): Promise<Response> {
  const path = call.url.pathname;
  const route = METHOD_AUTH_PATHS.get(`${call.request.method} ${path}`) ?? AUTH_PATHS.get(path);
  return route === undefined ? callLoggedIn(call) : HANDLERS[route.action](call, route.scope);
}

/** Keep the new tokens in the sealed cookie; the browser gets the rest of Django's answer. */
async function logIn(call: Call, scope: AuthScope): Promise<Response> {
  const outcome = await askBackend(call, {
    ...browserRequest(call, null),
    identifiesBrowser: true,
  });
  if (outcome.kind === "failed") return failureResponse(outcome.failure);
  if (outcome.answer.status !== HTTP_STATUS.ok) return relayResponse(outcome.answer);
  return rememberBrowser(call, keepLoginAnswer(call, outcome.answer, scope));
}

/** Revoke the cookie's refresh token at Django and clear the cookie, whatever Django says. */
async function logOut(call: Call): Promise<Response> {
  const tokens = call.cookie.tokens;
  if (tokens === null) return withSetCookie(noContent(), forgetTokens(call));
  const outcome = await askBackend(
    call,
    jsonRequest(call.url.pathname, { refresh: tokens.refresh }),
  );
  const response = outcome.kind === "failed" ? failureResponse(outcome.failure) : noContent();
  return withSetCookie(response, forgetTokens(call));
}

/** How a logged-in call's answer reaches the browser; `renewed` are tokens from a refresh. */
type Finish = (call: Call, answer: BackendAnswer, renewed: AuthTokens | null) => Response;

async function callLoggedIn(call: Call): Promise<Response> {
  return markEndedLogin(call, await callWithAccessToken(call, relayAnswer));
}

/** A 401 to a browser that sent a login cookie: its login has ended (ticket 14). */
function markEndedLogin(call: Call, response: Response): Response {
  if (response.status !== HTTP_STATUS.unauthorized || !call.cookie.wasSent) return response;
  const headers = new Headers(response.headers);
  headers.set(SESSION_ENDED_HEADER, "1");
  return new Response(response.body, { status: response.status, headers });
}

/**
 * A change made while logged in that ends the person's other logins and gives this device new
 * tokens (issue 38): keep them in the cookie, as at login; the browser gets the rest.
 */
function renewLogin(call: Call, scope: AuthScope): Promise<Response> {
  return callWithAccessToken(call, (finished, answer, renewed) =>
    answer.status === HTTP_STATUS.ok
      ? keepLoginAnswer(finished, answer, scope, true)
      : relayAnswer(finished, answer, renewed),
  );
}

async function callWithAccessToken(call: Call, finish: Finish): Promise<Response> {
  const tokens = call.cookie.tokens;
  const first = await askBackend(call, browserRequest(call, accessTokenOf(tokens)));
  if (first.kind === "failed") return failureResponse(first.failure);
  if (first.answer.status !== HTTP_STATUS.unauthorized || tokens === null) {
    return finish(call, first.answer, null);
  }
  return retryWithNewTokens(call, tokens, first.answer, finish);
}

/** Relay the answer, keeping tokens a refresh renewed. */
function relayAnswer(call: Call, answer: BackendAnswer, renewed: AuthTokens | null): Response {
  return renewed === null
    ? relayTidyingCookie(call, answer)
    : withSetCookie(relayResponse(answer), keepTokens(call, renewed));
}

/**
 * Keep what a login answer gives in sealed cookies; the browser gets the rest. That is the tokens,
 * or with two-step login on (issue 61) the challenge, which also ends any older login here.
 * Any other answer is a failure, unless `relaysOtherAnswers` (a change made while logged in that
 * gives no new login, such as new recovery codes).
 */
function keepLoginAnswer(
  call: Call,
  answer: BackendAnswer,
  scope: AuthScope,
  relaysOtherAnswers = false,
): Response {
  const body = jsonBody(answer);
  const challenge = ChallengeAnswerSchema.safeParse(body);
  if (challenge.success) return keepChallengeAnswer(call, challenge.data, scope);
  const parsed = LoginAnswerSchema.safeParse(body);
  if (!parsed.success) return notALogin(answer, relaysOtherAnswers);
  const { access, refresh, ...rest } = parsed.data;
  return withSetCookie(jsonAnswer(rest), keepTokens(call, { access, refresh, scope }));
}

/** Two-step login comes next: keep its challenge, end any older login in this browser. */
function keepChallengeAnswer(
  call: Call,
  answer: z.infer<typeof ChallengeAnswerSchema>,
  scope: AuthScope,
): Response {
  const response = jsonAnswer({ two_factor: answer.two_factor });
  const kept = withSetCookie(response, keepChallenge(call, { challenge: answer.challenge, scope }));
  return withSetCookie(kept, forgetTokens(call));
}

/** An answer with no login in it: relayed when that is allowed, a failure otherwise. */
function notALogin(answer: BackendAnswer, relaysOtherAnswers: boolean): Response {
  return relaysOtherAnswers && !isLoginShaped(jsonBody(answer))
    ? relayResponse(answer)
    : refusal(HTTP_STATUS.badGateway, PROXY_MESSAGES.unexpectedAnswer);
}

function isLoginShaped(body: unknown): boolean {
  const parsed = BrowserObjectSchema.safeParse(body);
  return !parsed.success || LOGIN_ANSWER_KEYS.some((key) => key in parsed.data);
}

/** How a two-step call's answer reaches the browser. */
type FinishChallenge = (call: Call, answer: BackendAnswer, scope: AuthScope) => Response;

/**
 * A two-step call (issue 61): send the browser's fields plus the challenge from the sealed
 * cookie to Django, without any login token. With no usable challenge, the person starts again.
 */
async function withChallenge(
  call: Call,
  scope: AuthScope,
  finish: FinishChallenge,
): Promise<Response> {
  const pending = call.challenge;
  if (pending?.scope !== scope) return startAgain(call);
  const fields = browserFields(call.body);
  if (fields === null) return refusal(HTTP_STATUS.badRequest, PROXY_MESSAGES.badRequest);
  const outcome = await askBackend(call, {
    ...jsonRequest(call.url.pathname, { ...fields, challenge: pending.challenge }),
    identifiesBrowser: true,
  });
  if (outcome.kind === "failed") return failureResponse(outcome.failure);
  return finish(call, outcome.answer, scope);
}

/** The browser's JSON object, or null when it isn't one or names the challenge itself. */
function browserFields(body: Uint8Array | null): Record<string, unknown> | null {
  const value = parsedJson(body);
  const parsed = BrowserObjectSchema.safeParse(value);
  const isOwnFields = parsed.success && !Array.isArray(value) && !("challenge" in parsed.data);
  return isOwnFields ? parsed.data : null;
}

function parsedJson(body: Uint8Array | null): unknown {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(body ?? new Uint8Array()));
    return value;
  } catch {
    return undefined;
  }
}

/** The second step passed: keep the tokens, end the challenge. Otherwise relay the refusal. */
function finishSecondStep(call: Call, answer: BackendAnswer, scope: AuthScope): Response {
  if (answer.status !== HTTP_STATUS.ok) return relayTidyingChallenge(call, answer);
  const loggedIn = withSetCookie(keepLoginAnswer(call, answer, scope), forgetChallenge(call));
  return rememberBrowser(call, loggedIn);
}

/** Relay the answer; a challenge Django says is used up is cleared from the browser. */
function relayTidyingChallenge(call: Call, answer: BackendAnswer): Response {
  const response = relayResponse(answer);
  const isUsedUp = StartAgainSchema.safeParse(jsonBody(answer)).success;
  return isUsedUp ? withSetCookie(response, forgetChallenge(call)) : response;
}

function startAgain(call: Call): Response {
  const response = Response.json(
    { detail: START_AGAIN_MESSAGE, start_again: true },
    { status: HTTP_STATUS.badRequest, headers: { "cache-control": "no-store" } },
  );
  return withSetCookie(response, forgetChallenge(call));
}

function accessTokenOf(tokens: AuthTokens | null): string | null {
  return tokens === null ? null : tokens.access;
}

/** Relay the answer; a cookie that didn't open is cleared so the browser stops sending it. */
function relayTidyingCookie(call: Call, answer: BackendAnswer): Response {
  const response = relayResponse(answer);
  const isUnusable = call.cookie.wasSent && call.cookie.tokens === null;
  return isUnusable ? withSetCookie(response, forgetTokens(call)) : response;
}

/** Refresh once and repeat the call; a refused refresh ends the login. */
async function retryWithNewTokens(
  call: Call,
  tokens: AuthTokens,
  refused: BackendAnswer,
  finish: Finish,
): Promise<Response> {
  const renewal = await renewTokens(call, tokens);
  if (renewal.kind === "failed") return failureResponse(renewal.failure);
  if (renewal.kind === "refused") return withSetCookie(relayResponse(refused), forgetTokens(call));
  const retried = await askBackend(call, browserRequest(call, renewal.tokens.access));
  if (retried.kind === "failed") {
    return withSetCookie(failureResponse(retried.failure), keepTokens(call, renewal.tokens));
  }
  return finish(call, retried.answer, renewal.tokens);
}
