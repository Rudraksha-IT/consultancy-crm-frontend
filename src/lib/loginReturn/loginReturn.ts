import { z } from "zod";

import { ROUTES } from "@/constants/routes";
import { LOGIN_RETURN_PARAMS, MAX_NEXT_PATH_LENGTH } from "@/constants/session";

/** Whitespace, control characters and `\` (a line break or another host smuggled in). */
const UNSAFE_CHARACTERS = /[\s\u0000-\u001f\u007f\\]/u;
/** Once decoded, spaces are fine (`%20`), but never control characters. */
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
/** A start browsers read as another host: `//`, or `/\`, which they treat the same. */
const OTHER_HOST_START = /^\/[/\\]/u;
const LOGIN_PATHS: readonly string[] = [ROUTES.login, ROUTES.platformLogin];
const ANY_ORIGIN = "https://next-path.invalid";

/** One path on this same site: one `/`, then no second `/` or `\`, and nothing unsafe in it. */
function isOwnPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !UNSAFE_CHARACTERS.test(value) &&
    new URL(value, ANY_ORIGIN).origin === ANY_ORIGIN
  );
}

function decoded(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Safe both as typed and once decoded (`/%2F%2Fevil.example` is `//evil.example`). */
const NextPathSchema = z
  .string()
  .min(1)
  .max(MAX_NEXT_PATH_LENGTH)
  .refine(isOwnPath)
  .refine((value) => {
    const plain = decoded(value);
    return (
      plain !== null &&
      plain.startsWith("/") &&
      !OTHER_HOST_START.test(plain) &&
      !CONTROL_CHARACTERS.test(plain)
    );
  })
  .refine((value) => !LOGIN_PATHS.includes(new URL(value, ANY_ORIGIN).pathname))
  .refine((value) => value !== ROUTES.home);

/**
 * The page to open once logged in (ticket 14), from the login page's `next`: only ever a path on
 * this same site, never a login page or Home (where the person lands anyway); otherwise null.
 */
export function safeNextPath(value: string | null): string | null {
  const parsed = NextPathSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

type LoginReturn = {
  /** The page the person was on (path and query). */
  next: string;
  /** The login ended (rather than the person logging out themselves): say so on the login page. */
  hasLoginEnded: boolean;
};

/** The login page's address that says the login ended and brings the person back to `next`. */
export function loginAddress(loginPath: string, { next, hasLoginEnded }: LoginReturn): string {
  const params = new URLSearchParams();
  if (hasLoginEnded) params.set(LOGIN_RETURN_PARAMS.session, LOGIN_RETURN_PARAMS.ended);
  const safe = safeNextPath(next);
  if (safe !== null) params.set(LOGIN_RETURN_PARAMS.next, safe);
  const query = params.toString();
  return query === "" ? loginPath : `${loginPath}?${query}`;
}

/** Whether the login page's address says the login ended (`?session=ended`). */
export function isLoginEndedAddress(params: Pick<URLSearchParams, "get">): boolean {
  return params.get(LOGIN_RETURN_PARAMS.session) === LOGIN_RETURN_PARAMS.ended;
}
