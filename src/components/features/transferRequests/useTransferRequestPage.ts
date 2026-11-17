"use client";

import { useEffect, useState } from "react";

import type { TransferBox } from "@/constants/transferRequests";
import { fetchTransferRequests, type TransferRequestPage } from "@/lib/api";

export type TransferRequestPageState =
  { status: "loading" } | { status: "loaded"; page: TransferRequestPage } | { status: "failed" };

/**
 * Load one page of a box, again when the box, the page or `version` change (bump it after a
 * change). An answer that arrives after a newer request is dropped.
 */
export function useTransferRequestPage(
  box: TransferBox,
  page: number,
  version: number,
): TransferRequestPageState {
  const [state, setState] = useState<TransferRequestPageState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchTransferRequests(box, page);
        if (!isCancelled) setState({ status: "loaded", page: found });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [box, page, version]);

  return state;
}
