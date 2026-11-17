import "server-only";

import pino, { type DestinationStream, type Logger } from "pino";
import { z } from "zod";

import { ServerConfigError } from "@/lib/config";

/**
 * The Next.js server's log, like inteliome-front-client's `logger.server.ts` (issue 43): pino JSON
 * lines on stdout, one `api` entry per call to Django, `warn` entries for security refusals and
 * `error` entries for failures (issue 58). Each entry carries the correlation ID Django logs too.
 */

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export type LoggerSettings = { enabled: boolean; level: LogLevel };

export type ApiLogData = {
  /** Path only: a query string can carry personal data. */
  url: string;
  method: string;
  status: number;
  /** e.g. `12ms`. */
  timeTaken: string;
  correlationId: string;
};

export type ErrorLogData = {
  /** Path only. */
  url?: string;
  /** The route's pattern, e.g. `/students/[id]`. */
  route?: string;
  method?: string;
  /** Django's status, for a 5xx answer. */
  status?: number;
  /** A short description, never a body, cookie or token. */
  error?: string;
  /** Next.js's digest of a server error, the reference shown on the error page. */
  digest?: string | undefined;
  /** The error's name and frames, never its message (see `stackFrames`). */
  stack?: string | undefined;
  correlationId?: string | undefined;
};

export type WarnLogData = {
  url?: string;
  method?: string;
  /** A short reason code, e.g. `origin`. */
  reason: string;
  correlationId?: string;
};

export type ServerLogger = {
  api: (message: string, data: ApiLogData) => void;
  warn: (message: string, data: WarnLogData) => void;
  error: (message: string, data: ErrorLogData) => void;
};

const STACK_FRAME = /^\s+at /;

/**
 * Where an error was thrown: its name and stack frames, without its message, which can name
 * Django's address or a person's details. Undefined for anything that isn't an Error.
 */
export function stackFrames(error: unknown): string | undefined {
  if (!(error instanceof Error) || error.stack === undefined) return undefined;
  const frames = error.stack.split("\n").filter((line) => STACK_FRAME.test(line));
  return [error.name, ...frames].join("\n");
}

const SECRET_KEYS = [
  "password",
  "code",
  "token",
  "secret",
  "cookie",
  "authorization",
  "access",
  "refresh",
];
// Each key at the top level and one level down (e.g. `headers.cookie`).
const REDACT_PATHS = SECRET_KEYS.flatMap((key) => [key, `*.${key}`]);
const REDACTED = "[redacted]";

const LoggerEnvSchema = z.object({
  LOG_LEVEL: z
    .string()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(LOG_LEVELS))
    .default("info"),
  ENABLE_LOGGER: z
    .string()
    .transform((value) => value.toLowerCase())
    .pipe(z.enum(["true", "false"]))
    .default("true"),
});

/** `LOG_LEVEL` (debug, info, warn or error; default info) and `ENABLE_LOGGER` (default true). */
export function readLoggerSettings(env: Record<string, string | undefined>): LoggerSettings {
  const parsed = LoggerEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ServerConfigError([
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ]);
  }
  return { enabled: parsed.data.ENABLE_LOGGER === "true", level: parsed.data.LOG_LEVEL };
}

/** A logger writing to `destination` (stdout unless a test passes its own). */
export function createServerLogger(
  settings: LoggerSettings,
  destination: DestinationStream = process.stdout,
): ServerLogger {
  const logger: Logger = pino(
    {
      level: settings.level,
      enabled: settings.enabled,
      redact: { paths: REDACT_PATHS, censor: REDACTED },
    },
    destination,
  );
  return {
    api: (message, data) => {
      logger.info({ type: "api", ...data }, message);
    },
    warn: (message, data) => {
      logger.warn({ type: "warn", ...data }, message);
    },
    error: (message, data) => {
      logger.error({ type: "error", ...data }, message);
    },
  };
}

let shared: ServerLogger | null = null;

function getServerLogger(): ServerLogger {
  shared ??= createServerLogger(readLoggerSettings(process.env));
  return shared;
}

/** The server's logger, set up from the environment on first use. */
export const serverLogger: ServerLogger = {
  api: (message, data) => {
    getServerLogger().api(message, data);
  },
  warn: (message, data) => {
    getServerLogger().warn(message, data);
  },
  error: (message, data) => {
    getServerLogger().error(message, data);
  },
};
