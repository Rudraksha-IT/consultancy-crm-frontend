/**
 * A call answered "not logged in" in the middle of work (ticket 14). The logged-in shells listen
 * and send the person to the login page, which brings them back afterwards. `wasLoggedIn` is
 * true when the server says this browser had a login that has now ended, so the login page says
 * "You've been logged out"; false when the person logged out themselves (in another tab).
 */
type LoginEndedListener = (wasLoggedIn: boolean) => void;

const listeners = new Set<LoginEndedListener>();

/** Tell every listener (the logged-in shell) that the login has ended. */
export function reportLoginEnded(wasLoggedIn: boolean): void {
  for (const listener of listeners) listener(wasLoggedIn);
}

/** Listen for the login ending; returns the function that stops listening. */
export function onLoginEnded(listener: LoginEndedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
