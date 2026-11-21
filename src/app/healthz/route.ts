import "server-only";

import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import { BACKEND_HEADERS, HEALTH } from "@/constants/backend";
import { getServerConfig } from "@/lib/config";

const NO_STORE = { "cache-control": "no-store" } as const;
const HealthyAnswerSchema = z.object({ status: z.literal("ok") });

/**
 * `GET /healthz` (ticket 14): ok when this server can reach Django's health check. A deploy
 * switches to a new frontend only once this answers ok. It is not under `/api`, so it is never
 * forwarded; it answers no data and never says why it failed.
 */
export async function GET(): Promise<Response> {
  const isHealthy = await isBackendHealthy();
  return Response.json(
    { status: isHealthy ? "ok" : "unavailable" },
    { status: isHealthy ? HTTP_STATUS.ok : HTTP_STATUS.serviceUnavailable, headers: NO_STORE },
  );
}

async function isBackendHealthy(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, HEALTH.timeoutMs);
  try {
    const config = getServerConfig();
    const answer = await fetch(`${config.backendOrigin}${HEALTH.backendPath}`, {
      headers: { [BACKEND_HEADERS.internalToken]: config.internalApiToken },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    const body: unknown = await answer.json();
    return answer.ok && HealthyAnswerSchema.safeParse(body).success;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function onlyGet(): Response {
  return Response.json(
    { detail: "Method not allowed." },
    { status: HTTP_STATUS.methodNotAllowed, headers: { ...NO_STORE, allow: "GET" } },
  );
}

export const POST = onlyGet;
export const PUT = onlyGet;
export const PATCH = onlyGet;
export const DELETE = onlyGet;
export const HEAD = onlyGet;
export const OPTIONS = onlyGet;
