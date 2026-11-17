import "server-only";

import { BROWSER_COOKIE, MAX_BROWSER_AGENT_LENGTH } from "@/constants/backend";
import { readBrowserCookie } from "@/lib/auth-cookie";

/**
 * The browser a login comes from (issue 71): this server's value for it, whether that value is
 * new (so a cookie must keep it), and the browser's own description. Never used for security.
 */
export type LoginBrowser = { key: string; isNew: boolean; agent: string | null };

// Anything but printable ASCII is dropped, so the description is always a plain header value.
const NOT_PRINTABLE = /[^\x20-\x7e]/g;

/** The browser behind a call: the value in its own cookie, or a new one if it has none of ours. */
export function loginBrowser(headers: Headers): LoginBrowser {
  const saved = readBrowserCookie(headers.get("cookie"));
  const isOurs = saved !== null && BROWSER_COOKIE.pattern.test(saved);
  return {
    key: isOurs ? saved : crypto.randomUUID().replaceAll("-", ""),
    isNew: !isOurs,
    agent: browserAgent(headers),
  };
}

/** The start of the browser's own description, printable characters only, or null if none. */
function browserAgent(headers: Headers): string | null {
  const agent = (headers.get("user-agent") ?? "")
    .replace(NOT_PRINTABLE, "")
    .slice(0, MAX_BROWSER_AGENT_LENGTH)
    .trim();
  return agent === "" ? null : agent;
}
