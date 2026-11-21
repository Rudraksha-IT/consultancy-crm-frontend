"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useState } from "react";

import { fetchChecklist, type Checklist } from "@/lib/api";

export type ChecklistState =
  { status: "loading" } | { status: "loaded"; checklist: Checklist } | { status: "failed" };

/** Load a Student's checklist; `replace` keeps the one an upload answered with. */
export function useChecklist(studentId: RecordId): {
  state: ChecklistState;
  replace: (checklist: Checklist) => void;
} {
  const [state, setState] = useState<ChecklistState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const checklist = await fetchChecklist(studentId);
        if (!isCancelled) setState({ status: "loaded", checklist });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [studentId]);

  return {
    state,
    replace: (checklist) => {
      setState({ status: "loaded", checklist });
    },
  };
}
