"use client";

import { useEffect, useState } from "react";

import { fetchBin, type BinPage } from "@/lib/api";

export type BinState =
  { status: "loading" } | { status: "loaded"; page: BinPage } | { status: "failed" };

/**
 * Load one page of the Bin tab, again when the page or `version` changes. An answer that arrives
 * after a newer request is dropped.
 */
export function useBin(page: number, version: number, isWanted = true): BinState {
  const [state, setState] = useState<BinState>({ status: "loading" });

  useEffect(() => {
    if (!isWanted) return undefined;
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchBin(page);
        if (!isCancelled) setState({ status: "loaded", page: found });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [page, version, isWanted]);

  return state;
}
