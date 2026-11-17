"use client";

import { useEffect, useState } from "react";

import { fetchTaskAssignees, type TaskAssignee } from "@/lib/api";

export type AssigneesState =
  { status: "loading" } | { status: "loaded"; people: TaskAssignee[] } | { status: "failed" };

/** Who a Task can be given to: every active Staff member. */
export function useTaskAssignees(): AssigneesState {
  const [state, setState] = useState<AssigneesState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const people = await fetchTaskAssignees();
        if (!isCancelled) setState({ status: "loaded", people });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}
