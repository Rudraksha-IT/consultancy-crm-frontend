"use client";

import { useEffect, useState } from "react";

import type { PaperworkScope } from "@/constants/documents";
import { fetchPaperwork, type PaperworkPage } from "@/lib/api";

export type PaperworkState =
  { status: "loading" } | { status: "loaded"; page: PaperworkPage } | { status: "failed" };

/**
 * Load one page of the Documents page, again when the scope, the page, the waiting filter or
 * `version` change. An answer that arrives after a newer request is dropped.
 */
export function usePaperwork(
  { scope, page, onlyWaiting }: { scope: PaperworkScope; page: number; onlyWaiting: boolean },
  version: number,
): PaperworkState {
  const [state, setState] = useState<PaperworkState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchPaperwork({ scope, page, onlyWaiting });
        if (!isCancelled) setState({ status: "loaded", page: found });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [scope, page, onlyWaiting, version]);

  return state;
}
