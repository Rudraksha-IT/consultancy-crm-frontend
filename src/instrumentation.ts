import type { Instrumentation } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

/** Runs once when the Next.js server starts: check the server settings (src/lib/config). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return;
  }
  // Imported only here, so the Edge build never sees its Node.js APIs.
  const { exitUnlessServerConfigured } = await import("@/lib/config/startupCheck");
  exitUnlessServerConfigured();
}

const CORRELATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function digestOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) return undefined;
  return typeof error.digest === "string" ? error.digest : undefined;
}

function correlationIdOf(headers: NodeJS.Dict<string | string[]>): string | undefined {
  const sent = headers["x-correlation-id"];
  return typeof sent === "string" && CORRELATION_ID.test(sent) ? sent.toLowerCase() : undefined;
}

/**
 * A server render, route or action failed (issue 58): one error entry in our format with the
 * route, the method, Next.js's digest (the reference the error page shows) and the stack frames.
 * Never the cookies, headers, query string, body or the error's message.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { serverLogger, stackFrames } = await import("@/lib/logger");
  serverLogger.error("Server error", {
    url: request.path.split("?")[0] ?? "",
    route: context.routePath,
    method: request.method,
    digest: digestOf(error),
    stack: stackFrames(error),
    correlationId: correlationIdOf(request.headers),
  });
};
