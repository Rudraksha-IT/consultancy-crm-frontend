import { jsonResponse } from "@/lib/api/core/test-helpers";

/** One canned answer: a Response for the calls it matches, else undefined. */
export type Answer = (path: string, init?: RequestInit) => Response | undefined;

export const methodOf = (init?: RequestInit): string => init?.method ?? "GET";

/** Stub the global fetch with canned answers; anything unmatched gets a 500. */
export function backend(...answers: Answer[]) {
  const fetchFn = vi.fn((path: string, init?: RequestInit) => {
    for (const answer of answers) {
      const response = answer(path, init);
      if (response !== undefined) return Promise.resolve(response);
    }
    return Promise.resolve(jsonResponse({}, 500));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

/** Answer `verb path` with `body` (a fresh Response each time). */
export function on(verb: string, path: string, body: unknown, status = 200): Answer {
  return (calledPath, init) =>
    methodOf(init) === verb && calledPath === path ? jsonResponse(body, status) : undefined;
}

/** The calls made with `verb` to `path`. */
export function callsTo(fetchFn: ReturnType<typeof backend>, verb: string, path: string) {
  return fetchFn.mock.calls.filter(([p, init]) => methodOf(init) === verb && p === path);
}

/** Answer `verb path` with whatever `body()` gives at the time of the call, e.g. after a change. */
export function onEach(verb: string, path: string, body: () => unknown, status = 200): Answer {
  return (calledPath, init) =>
    methodOf(init) === verb && calledPath === path ? jsonResponse(body(), status) : undefined;
}
