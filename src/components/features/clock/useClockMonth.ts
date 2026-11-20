"use client";

import type { RecordId } from "@/lib/recordId";
import { useCallback, useEffect, useState } from "react";

import { fetchClockMonth, type ClockMonth } from "@/lib/api";

export type ClockMonthState =
  { status: "loading" } | { status: "failed" } | { status: "loaded"; month: ClockMonth };

/** One month of clock-ins, mine (`staffId` null) or (Admins) someone else's, and a reload. */
export function useClockMonth(month: string, staffId: RecordId | null) {
  const [state, setState] = useState<ClockMonthState>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const loaded = await fetchClockMonth(month, staffId);
        if (!isCancelled) setState({ status: "loaded", month: loaded });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [month, staffId, version]);

  const reload = useCallback(() => {
    setVersion((known) => known + 1);
  }, []);

  return { state, reload };
}
