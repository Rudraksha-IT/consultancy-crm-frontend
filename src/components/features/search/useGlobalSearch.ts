"use client";

import { useEffect, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import { SEARCH_DELAY_MS } from "@/constants/search";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  ApiRequestError,
  searchEverything,
  SEARCH_MIN_LENGTH,
  type SearchResults,
} from "@/lib/api";

export type GlobalSearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; text: string; results: SearchResults }
  | { status: "too-many" }
  | { status: "failed" };

type Answer = { for: string; state: GlobalSearchState };

/**
 * Search for `text` once typing has paused for 250 ms. A newer search cancels the call still on
 * its way, so an old answer never replaces a newer one. Under 2 characters, nothing is asked.
 */
export function useGlobalSearch(text: string): GlobalSearchState {
  const wanted = text.trim();
  const settled = useDebouncedValue(wanted, SEARCH_DELAY_MS);
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (settled.length < SEARCH_MIN_LENGTH) return undefined;
    const controller = new AbortController();
    const fetchFn: typeof fetch = (input, init) =>
      fetch(input, { ...init, signal: controller.signal });
    searchEverything(settled, fetchFn).then(
      (results) => {
        if (!controller.signal.aborted) {
          setAnswer({ for: settled, state: { status: "loaded", text: settled, results } });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setAnswer({ for: settled, state: failureOf(error) });
      },
    );
    return () => {
      controller.abort();
    };
  }, [settled]);

  return shownState(wanted, answer);
}

function failureOf(error: unknown): GlobalSearchState {
  const isTooMany =
    error instanceof ApiRequestError && error.status === HTTP_STATUS.tooManyRequests;
  return { status: isTooMany ? "too-many" : "failed" };
}

/** What to show for `wanted`: its answer, or while waiting the last results found. */
function shownState(wanted: string, answer: Answer | null): GlobalSearchState {
  if (wanted.length < SEARCH_MIN_LENGTH) return { status: "idle" };
  if (answer === null) return { status: "loading" };
  if (answer.for === wanted || answer.state.status === "loaded") return answer.state;
  return { status: "loading" };
}
