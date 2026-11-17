import "server-only";

import { readLoggerSettings } from "@/lib/logger/server";

import { getServerConfig, ServerConfigError } from "./serverConfig";

const EXIT_FAILURE = 1;

/**
 * Stop the server when its settings are missing or invalid, so a missing internal token fails the
 * deploy instead of every request. Next.js would only log a thrown error and keep answering 500.
 */
export function exitUnlessServerConfigured(): void {
  try {
    getServerConfig();
    readLoggerSettings(process.env);
  } catch (error) {
    if (!(error instanceof ServerConfigError)) throw error;
    // The message names the settings, never their values.
    process.stderr.write(`${error.message}\n`);
    process.exit(EXIT_FAILURE);
  }
}
