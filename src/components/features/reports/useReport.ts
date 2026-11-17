"use client";

import { useEffect, useState } from "react";

import { InvalidFieldsError } from "@/lib/api";

export type ReportState<T> =
  | { status: "loading" }
  | { status: "loaded"; data: T }
  | { status: "refused"; fieldErrors: Partial<Record<string, string[]>> }
  | { status: "failed" };

const LOADING = { status: "loading" } as const;

/**
 * Load a report, again whenever `load` changes (make it with `useCallback`). Dates the server
 * refuses come back as field errors. Until the answer for the current `load` arrives, the report
 * is loading; an answer that arrives after a newer request is dropped.
 */
export function useReport<T>(load: () => Promise<T>): ReportState<T> {
  const [answer, setAnswer] = useState<{ load: () => Promise<T>; state: ReportState<T> }>();

  useEffect(() => {
    let isCancelled = false;
    load().then(
      (data) => {
        if (!isCancelled) setAnswer({ load, state: { status: "loaded", data } });
      },
      (error: unknown) => {
        if (isCancelled) return;
        const state: ReportState<T> =
          error instanceof InvalidFieldsError
            ? { status: "refused", fieldErrors: error.fieldErrors }
            : { status: "failed" };
        setAnswer({ load, state });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [load]);

  return answer?.load === load ? answer.state : LOADING;
}
