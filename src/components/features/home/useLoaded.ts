"use client";

import { useEffect, useState } from "react";

export type Loaded<T> =
  { status: "loading" } | { status: "loaded"; data: T } | { status: "failed" };

/**
 * Load once, and again when `version` or `load` changes (pass a module function or one made with
 * `useCallback`). An answer that arrives after a newer request, or after the section has gone, is
 * dropped.
 */
export function useLoaded<T>(load: () => Promise<T>, version: number): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    load().then(
      (data) => {
        if (!isCancelled) setState({ status: "loaded", data });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [load, version]);

  return state;
}
