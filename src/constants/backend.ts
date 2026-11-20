/** How the Next.js server forwards the browser's `/api/...` calls to Django (ADR 0002). */

export { SESSION_ENDED_HEADER } from "./session";

/** The only methods the API answers; anything else is 405. */
export const FORWARDED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type ForwardedMethod = (typeof FORWARDED_METHODS)[number];

/**
 * Browser headers Django needs. Every other browser header is dropped (cookies, forwarding,
 * hop-by-hop, `Authorization`…): the login travels as the Bearer token this server adds.
 */
export const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"] as const;

/** Django answer headers passed back to the browser. Django's cookies never are. */
export const RETURNED_RESPONSE_HEADERS = ["content-type"] as const;

/**
 * Sent with every answer this server relays. The office logo (an SVG perhaps) can be opened on
 * its own: it is never sniffed as another type, and nothing in it may run, load or be framed.
 * JSON answers are read by `fetch`, which ignores both.
 */
export const RELAYED_RESPONSE_HEADERS = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
} as const;

/** Methods that change something: refused unless the browser's `Origin` is the page's own host. */
export const CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

export const BACKEND_HEADERS = {
  forwardedHost: "x-forwarded-host",
  forwardedProto: "x-forwarded-proto",
  internalToken: "x-internal-token",
  correlationId: "x-correlation-id",
  authorization: "authorization",
  contentType: "content-type",
  /** The client's address (ADR 0004), set only by this server, never taken from the browser. */
  clientAddress: "x-client-ip",
  /** This server's value for the browser a login comes from (issue 71), from its own cookie. */
  browserKey: "x-browser-key",
  /** The browser's own description at login (issue 71), to name the device. */
  browserAgent: "x-browser-agent",
} as const;

/**
 * The cookie that tells this browser apart from others (issue 71), so logging in again on it
 * reuses its row in Signed-in devices. A random value this server makes; host-only, HTTP-only
 * and sent only to `/api`, so browser JavaScript never reads it. Never used for security.
 */
export const BROWSER_COOKIE = {
  name: "crm_browser",
  path: "/api",
  // 400 days, the longest a browser keeps a cookie.
  maxAgeSeconds: 400 * 24 * 60 * 60,
  pattern: /^[0-9a-f]{32}$/,
} as const;

/** Only the start of the browser's description is sent to Django; real ones are far shorter. */
export const MAX_BROWSER_AGENT_LENGTH = 512;

/**
 * Endpoints this server handles itself around Django's login (ADR 0003): it keeps the tokens
 * from a login, sends the cookie's refresh token at logout, and never lets the browser refresh.
 * Choosing a new password with a reset Code, or joining with an Invite Code, logs the person in,
 * so both are logins too. Changing my password and signing out my other devices are made while
 * logged in and give this device new tokens (issue 38): "renew".
 */
export const AUTH_ROUTES = {
  "/api/auth/login/": { action: "login", scope: "staff" },
  "/api/auth/password-reset/complete/": { action: "login", scope: "staff" },
  "/api/auth/join/complete/": { action: "login", scope: "staff" },
  // A Platform Admin entering an office on its own address (issue 27); leaving is the logout.
  "/api/support-access/enter/": { action: "login", scope: "staff" },
  "/api/auth/logout/": { action: "logout", scope: "staff" },
  "/api/me/password/": { action: "renew", scope: "staff" },
  "/api/me/devices/sign-out-others/": { action: "renew", scope: "staff" },
  "/api/auth/refresh/": { action: "refresh", scope: "staff" },
  // Staff two-step login (issue 62), on the office's own address, as on the Platform below.
  "/api/auth/two-factor/setup/": { action: "challenge", scope: "staff" },
  "/api/auth/two-factor/confirm/": { action: "secondStep", scope: "staff" },
  "/api/auth/two-factor/verify/": { action: "secondStep", scope: "staff" },
  "/api/platform/auth/login/": { action: "login", scope: "platform" },
  "/api/platform/auth/logout/": { action: "logout", scope: "platform" },
  "/api/platform/auth/refresh/": { action: "refresh", scope: "platform" },
  // The Platform Admin's Account page (issue 59): a new password gives this session new tokens.
  "/api/platform/me/password/": { action: "renew", scope: "platform" },
  // Two-step login (issue 61): this server sends the challenge from its own cookie. Setup shows
  // the app's secret; confirming it, or a number or recovery code, logs the person in.
  "/api/platform/auth/two-factor/setup/": { action: "challenge", scope: "platform" },
  "/api/platform/auth/two-factor/confirm/": { action: "secondStep", scope: "platform" },
  "/api/platform/auth/two-factor/verify/": { action: "secondStep", scope: "platform" },
} as const;

/**
 * Endpoints handled like those above for one method only: the Platform Admin's Account change
 * (PATCH) gives this session new tokens (issue 59), while reading the Account (GET) is an
 * ordinary call. Keyed "METHOD path".
 */
export const METHOD_AUTH_ROUTES = {
  "PATCH /api/platform/me/": { action: "renew", scope: "platform" },
  // The Security page (issue 61): switching off gives new tokens, switching on a setup challenge.
  "POST /api/platform/me/two-factor/": { action: "renew", scope: "platform" },
  // My settings (issue 62): the same for Staff.
  "POST /api/me/two-factor/": { action: "renew", scope: "staff" },
} as const;

/** Where this server renews an expired access token, per kind of login. */
export const REFRESH_PATHS = {
  staff: "/api/auth/refresh/",
  platform: "/api/platform/auth/refresh/",
} as const;

/**
 * How long a renewed pair is shared with calls still carrying the old cookie (sent before the
 * browser had the new one), since the old refresh token is refused once it has been used.
 */
export const REFRESH_SHARE_MS = 10_000;

/** Largest request body passed on (1 MiB). */
export const MAX_REQUEST_BODY_BYTES = 1024 * 1024;
/** Largest office logo upload passed on: the 1 MB file plus room for the form around it. */
export const MAX_LOGO_UPLOAD_BODY_BYTES = 1024 * 1024 + 64 * 1024;
/** The only calls that may carry a logo upload: the office logo (39) and the product's (65). */
export const LOGO_UPLOAD_PATH = /^\/api\/(?:configuration\/logo|platform\/brand\/logo)\/$/;
/**
 * Largest Document upload passed on: the files of one upload together (20 MB, issue 78) plus
 * room for the form around them. It is held in memory, so it stays small for the 1 GiB server.
 */
export const MAX_UPLOAD_BODY_BYTES = 20 * 1024 * 1024 + 64 * 1024;

/** A Course File (ticket 10): one PDF of at most 5 MB, plus room for the form around it. */
export const MAX_COURSE_FILE_BODY_BYTES = 5 * 1024 * 1024 + 64 * 1024;

/** Where a Course File is uploaded: one Course's files. */
export const COURSE_FILE_UPLOAD_PATH = /^\/api\/catalogue\/courses\/[0-9]{1,18}\/files\/$/;
/**
 * Where a Document Example (ticket 11) is uploaded: added to a Document Type, or in place of one.
 * One file of at most 5 MB, like a Course File.
 */
export const DOCUMENT_EXAMPLE_UPLOAD_PATH =
  /^\/api\/configuration\/(?:document-types\/[0-9]{1,18}\/examples|document-examples\/[0-9]{1,18}\/replace)\/$/;
/**
 * The only calls that may carry an upload: a Student's Document (issue 16), files added to one
 * (issue 78), an Offer Letter (issue 76) and a visa letter (issue 77).
 */
export const UPLOAD_PATH =
  /^\/api\/students\/[0-9]{1,10}\/(?:documents\/(?:[0-9]{1,18}\/files\/)?|offer-letters\/|visas\/[0-9]{1,18}\/letter\/)$/;
/** How long to wait for Django before answering 504. */
export const BACKEND_TIMEOUT_MS = 15_000;

/**
 * While a new version is switched in (ticket 14), Django can't be reached for a few seconds. A
 * read (GET) is tried again after short waits that grow, for up to 20 seconds in all; a change is
 * never tried again, so nothing is saved twice.
 */
export const UPDATE_RETRY = { totalMs: 20_000, firstWaitMs: 250, longestWaitMs: 2_000 } as const;

/**
 * Health checks (ticket 14): Django's, called only by this server's `/healthz` and Docker, and
 * never forwarded from a browser.
 */
export const HEALTH = {
  backendPath: "/api/health/",
  /** Browser paths refused before forwarding: Django's health check, with or without the slash. */
  refusedPath: /^\/api\/health\/?$/,
  timeoutMs: 3_000,
} as const;

/** The answer's `code` when Django can't be reached because the app is being updated. */
export const UPDATING_CODE = "updating";
/**
 * A message to many Students (issue 26) is sent one by one while the call waits: Django stops
 * after 60 seconds (BULK_SEND_SECONDS), so it gets longer, still under Cloudflare's 100 seconds.
 */
export const BULK_SEND_PATH = /^\/api\/messages\/bulk\/$/;
export const BULK_SEND_TIMEOUT_MS = 75_000;

/**
 * The Central login (issue 44): at most this many lookups per browser address in each window.
 * An office's whole staff share one address, so it is generous; Django also limits each email.
 */
export const CENTRAL_LOGIN_TRIES_PER_ADDRESS = 10;
export const CENTRAL_LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** How many addresses are remembered at once, so the counts can never fill the memory. */
export const CENTRAL_LOGIN_MAX_ADDRESSES = 10_000;
/**
 * The Platform's forgot password (issue 63) and Join page (issue 65): their calls share at most
 * this many tries per browser address in each window. Django also limits each person's Codes.
 */
export const PLATFORM_RESET_PATH =
  /^\/api\/platform\/auth\/(?:password-reset\/(?:verify\/|confirm\/)?|join\/(?:verify\/|complete\/)?)$/;
export const PLATFORM_RESET_TRIES_PER_ADDRESS = 10;
/**
 * Email-first login's first step (issue 66), on an office and the Platform: generous, as a whole
 * office logs in from one address; Django also limits each person's Codes.
 */
export const LOGIN_STEP_PATH = /^\/api\/(?:platform\/)?auth\/login\/next\/$/;
export const LOGIN_STEP_TRIES_PER_ADDRESS = 60;
export const LOGIN_STEP_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_STEP_MAX_ADDRESSES = 10_000;
export const PLATFORM_RESET_WINDOW_MS = 15 * 60 * 1000;
export const PLATFORM_RESET_MAX_ADDRESSES = 10_000;
/** Cloudflare's header with the address the browser called from (ADR 0004). */
export const CLIENT_ADDRESS_HEADER = "cf-connecting-ip";

/** Short answers that never mention Django, its address or the error behind them. */
export const PROXY_MESSAGES = {
  notFound: "Not found.",
  badRequest: "Bad request.",
  methodNotAllowed: "Method not allowed.",
  tooLarge: "The request is too large.",
  updating: "The app is being updated. Please try again in a moment.",
  timedOut: "The server took too long to answer.",
  misconfigured: "Something went wrong.",
  unexpectedAnswer: "Something went wrong.",
  forbidden: "Forbidden.",
  tooManyTries: "Too many tries. Wait a few minutes and try again.",
} as const;

/**
 * The one cookie that holds a person's login tokens, sealed (ADR 0003). Host-only, HTTP-only and
 * sent only to `/api`, where the Next.js server opens it; browser JavaScript can never read it.
 */
export const AUTH_COOKIE = {
  name: "crm_auth",
  path: "/api",
  // As long as the refresh token lasts.
  maxAgeSeconds: 7 * 24 * 60 * 60,
  // Version prefix of the sealed value, so the format can change later.
  version: "v1.",
  // Far more than two tokens need; anything longer is refused before it is decrypted.
  maxLength: 8192,
} as const;

/**
 * The cookie that holds a two-step challenge between the password and the number (issue 61),
 * sealed like the tokens. It lives as long as the challenge: 5 minutes.
 */
export const CHALLENGE_COOKIE = {
  name: "crm_2fa",
  path: "/api",
  maxAgeSeconds: 5 * 60,
  version: "v1.",
  maxLength: 2048,
} as const;

/** The longest two-step challenge accepted from Django (its own limit is the same). */
export const MAX_CHALLENGE_LENGTH = 500;

/** Said when the second step has no usable challenge: the person logs in again. */
export const START_AGAIN_MESSAGE = "This sign-in has timed out or was already used. Log in again.";

/** The longest login token accepted from Django (its own limit is the same). */
export const MAX_TOKEN_LENGTH = 2048;
