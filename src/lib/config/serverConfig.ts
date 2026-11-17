import "server-only";

import { z } from "zod";

import { isIpAddress } from "@/lib/ip-address";

const MIN_TOKEN_LENGTH = 32;
// Exactly 32 bytes in standard base64 (43 characters and one "="): an AES-256 key.
const BASE64_32_BYTES = /^[A-Za-z0-9+/]{43}=$/;
// One lowercase DNS label, e.g. "login".
const SUBDOMAIN = /^[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
// Lowercase DNS labels separated by dots, e.g. "crm.example.com", or plain "localhost" for the
// local stack (offices at acme.localhost); no other single word is a real domain.
const HOST_NAME =
  /^(?:localhost|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$/;

/** What a local server (no Cloudflare) sends as the client's address unless told otherwise. */
const DEFAULT_DEV_CLIENT_IP = "127.0.0.1";

/** An http(s) address with nothing after the host and port, e.g. `http://backend:8000`. */
function isPlainOrigin(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    `${url.origin}/` === url.href &&
    !value.includes("@")
  );
}

const ServerEnvSchema = z.object({
  BACKEND_BASE_URL: z.string().refine(isPlainOrigin),
  INTERNAL_API_TOKEN: z.string().min(MIN_TOKEN_LENGTH),
  PRODUCT_DOMAIN: z.string().regex(HOST_NAME),
  AUTH_COOKIE_KEY: z.string().regex(BASE64_32_BYTES),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).default("true"),
  CENTRAL_LOGIN_SUBDOMAIN: z.string().regex(SUBDOMAIN).default("login"),
  // Must equal the backend's PLATFORM_SUBDOMAIN (default "admin").
  PLATFORM_SUBDOMAIN: z.string().regex(SUBDOMAIN).default("admin"),
  // Where the client's address comes from (ADR 0004): Cloudflare, or locally a fixed address.
  CLIENT_IP_SOURCE: z.enum(["cloudflare", "local"]).default("cloudflare"),
  DEV_CLIENT_IP: z.string().refine(isIpAddress).default(DEFAULT_DEV_CLIENT_IP),
  NODE_ENV: z.string().optional(),
});

/**
 * Where the client's address sent to Django as `X-Client-IP` comes from (ADR 0004): Cloudflare's
 * `CF-Connecting-IP`, or (local only, never in production) one fixed address.
 */
export type ClientAddressSource = { source: "cloudflare" } | { source: "local"; address: string };

/** What the Next.js server needs to call Django (ADR 0002). Never sent to the browser. */
export type ServerConfig = {
  /** Django's internal address, e.g. `http://backend:8000`. */
  backendOrigin: string;
  /** Sent to Django as `X-Internal-Token` on every call. */
  internalApiToken: string;
  /** Consultancy and Platform hosts are `<subdomain>.<productDomain>`. */
  productDomain: string;
  /** The Central login is at `<centralLoginSubdomain>.<productDomain>` (issue 44). */
  centralLoginSubdomain: string;
  /** The Platform is at `<platformSubdomain>.<productDomain>`. */
  platformSubdomain: string;
  /** How the login tokens' cookie is sealed and sent (ADR 0003). */
  authCookie: {
    /** The AES-256-GCM key the cookie is sealed with. */
    key: Uint8Array;
    /** Secure cookie; false only for local plain HTTP. */
    isSecure: boolean;
  };
  clientAddress: ClientAddressSource;
};

/** The server's environment is missing a setting or has a bad one. Names them, never their values. */
export class ServerConfigError extends Error {
  constructor(names: readonly string[]) {
    super(`Missing or invalid server settings: ${names.join(", ")}`);
    this.name = "ServerConfigError";
  }
}

/** Validate the server's environment (`process.env` in production). */
export function parseServerConfig(env: Record<string, string | undefined>): ServerConfig {
  const parsed = ServerEnvSchema.refine(
    (settings) => settings.CLIENT_IP_SOURCE !== "local" || settings.NODE_ENV !== "production",
    { path: ["CLIENT_IP_SOURCE"] },
  ).safeParse(env);
  if (!parsed.success) {
    throw new ServerConfigError([
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ]);
  }
  return {
    backendOrigin: new URL(parsed.data.BACKEND_BASE_URL).origin,
    internalApiToken: parsed.data.INTERNAL_API_TOKEN,
    productDomain: parsed.data.PRODUCT_DOMAIN,
    centralLoginSubdomain: parsed.data.CENTRAL_LOGIN_SUBDOMAIN,
    platformSubdomain: parsed.data.PLATFORM_SUBDOMAIN,
    authCookie: {
      key: new Uint8Array(Buffer.from(parsed.data.AUTH_COOKIE_KEY, "base64")),
      isSecure: parsed.data.AUTH_COOKIE_SECURE === "true",
    },
    clientAddress:
      parsed.data.CLIENT_IP_SOURCE === "local"
        ? { source: "local", address: parsed.data.DEV_CLIENT_IP }
        : { source: "cloudflare" },
  };
}

/**
 * The server settings from the environment. Only server code can read them: none of them is a
 * `NEXT_PUBLIC_*` variable, so they never reach the browser bundle.
 */
export function getServerConfig(): ServerConfig {
  return parseServerConfig(process.env);
}
