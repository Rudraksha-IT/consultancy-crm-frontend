"use client";

import { useEffect, useState } from "react";

import { fetchBulkCount, type BulkCount, type BulkRecipients } from "@/lib/api";
import { NO_STUDENT_FILTERS } from "@/lib/students";

export type BulkCountState =
  { status: "loading" } | { status: "loaded"; count: BulkCount } | { status: "failed" };

/**
 * How many Students `recipients` names, loaded again when it changes. An answer that arrives
 * after a newer request is dropped.
 */
export function useBulkCount(recipients: BulkRecipients): BulkCountState {
  // Compared by value: callers build a fresh object on every render.
  const batchId = recipients.kind === "batch" ? recipients.batchId : null;
  const { search, stage, counsellor, source, country, targetLevel } =
    recipients.kind === "students" ? recipients.filters : NO_STUDENT_FILTERS;
  const key = JSON.stringify([batchId, search, stage, counsellor, source, country, targetLevel]);
  const [answer, setAnswer] = useState<{ key: string; state: BulkCountState } | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const asked: BulkRecipients =
      batchId === null
        ? {
            kind: "students",
            filters: { search, stage, counsellor, source, country, targetLevel },
          }
        : { kind: "batch", batchId };
    fetchBulkCount(asked).then(
      (count) => {
        if (!isCancelled) setAnswer({ key, state: { status: "loaded", count } });
      },
      () => {
        if (!isCancelled) setAnswer({ key, state: { status: "failed" } });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [key, batchId, search, stage, counsellor, source, country, targetLevel]);

  // Until the answer for these recipients arrives, it is still loading.
  return answer?.key === key ? answer.state : { status: "loading" };
}
