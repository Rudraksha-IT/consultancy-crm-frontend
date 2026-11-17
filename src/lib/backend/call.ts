import "server-only";

import type { AuthTokens, PendingChallenge } from "@/lib/auth-cookie";
import type { ServerConfig } from "@/lib/config";
import type { ServerLogger } from "@/lib/logger";

import type { LoginBrowser } from "./browser";

/** One browser call to `/api/...`, checked and read, as the rest of this module handles it. */
export type Call = {
  request: Request;
  url: URL;
  /** The browser's host, checked to be a subdomain of the product domain, lowercased. */
  host: string;
  config: ServerConfig;
  fetchFn: typeof fetch;
  timeoutMs: number;
  correlationId: string;
  logger: ServerLogger;
  body: Uint8Array<ArrayBuffer> | null;
  /** Sent to Django as `X-Client-IP` (ADR 0004); null sends none. Never logged. */
  clientAddress: string | null;
  /** The login cookie: its tokens if it opened, and whether the browser sent one at all. */
  cookie: { tokens: AuthTokens | null; wasSent: boolean };
  /** The two-step challenge from its own sealed cookie (issue 61), if it opened here. */
  challenge: PendingChallenge | null;
  /** The browser, told to Django only on logins (issue 71). Never logged. */
  browser: LoginBrowser;
};
