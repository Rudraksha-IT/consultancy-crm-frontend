import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import { MAX_TOKEN_LENGTH, REFRESH_PATHS, REFRESH_SHARE_MS } from "@/constants/backend";
import type { AuthTokens } from "@/lib/auth-cookie";

import { askBackend, jsonBody, jsonRequest, type Failure } from "./backendCall";
import type { Call } from "./call";

export type Renewal =
  | { kind: "renewed"; tokens: AuthTokens }
  | { kind: "refused" }
  | { kind: "failed"; failure: Failure };

const TokenSchema = z.string().min(1).max(MAX_TOKEN_LENGTH);
const TokenPairSchema = z.object({ access: TokenSchema, refresh: TokenSchema });

/**
 * Refreshes in progress or just done, by a hash of the refresh token used. A refresh token works
 * once (rotation), so calls made at the same time with the same cookie share one refresh.
 */
const shared = new Map<string, Promise<Renewal>>();

/** Swap the cookie's refresh token for a new pair, once for all the calls that carry it. */
export function renewTokens(call: Call, tokens: AuthTokens): Promise<Renewal> {
  const key = createHash("sha256").update(tokens.refresh).digest("base64url");
  const pending = shared.get(key);
  if (pending !== undefined) return pending;
  const renewal = askForNewTokens(call, tokens);
  shared.set(key, renewal);
  void renewal.then((result) => {
    // Keep a new pair for late calls; forget a failure at once so the next call tries again.
    const keepFor = result.kind === "renewed" ? REFRESH_SHARE_MS : 0;
    setTimeout(() => shared.delete(key), keepFor).unref();
  });
  return renewal;
}

async function askForNewTokens(call: Call, tokens: AuthTokens): Promise<Renewal> {
  const request = jsonRequest(REFRESH_PATHS[tokens.scope], { refresh: tokens.refresh });
  const outcome = await askBackend(call, request);
  if (outcome.kind === "failed") return outcome;
  const pair = TokenPairSchema.safeParse(jsonBody(outcome.answer));
  if (outcome.answer.status !== HTTP_STATUS.ok || !pair.success) return { kind: "refused" };
  return { kind: "renewed", tokens: { ...pair.data, scope: tokens.scope } };
}
