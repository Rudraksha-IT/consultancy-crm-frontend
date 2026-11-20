/** When a login ends, and coming back to the page afterwards (ticket 14). */

/**
 * Set on a 401 when the browser did send a login cookie (ticket 14): the person was logged in and
 * the login has ended, so the login page says so. A visitor who never logged in (or pressed Log
 * out, which clears the cookie) gets no such header and sees no such message.
 */
export const SESSION_ENDED_HEADER = "x-session-ended";

/**
 * The login page's address values: `session=ended` shows "You've been logged out", and `next` is
 * the page to open once logged in (only ever a path on this same site; see `safeNextPath`).
 */
export const LOGIN_RETURN_PARAMS = { session: "session", ended: "ended", next: "next" } as const;

/** The longest `next` path kept; anything longer is dropped and the person lands on Home. */
export const MAX_NEXT_PATH_LENGTH = 2000;

export const SESSION_TEXT = {
  loggedOut: "You've been logged out. Please log in again.",
  updating: "The app is being updated. Please try again in a moment.",
} as const;
