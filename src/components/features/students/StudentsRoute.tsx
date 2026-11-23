"use client";

import { useSearchParams } from "next/navigation";

import { StudentsPage } from "./StudentsPage";

/**
 * The Students page, starting from a search typed in the top bar (`?q=`), a Stage card of the
 * pipeline (`?stage=`), or Home's "See all" (`?priority=`, `?counsellor=`). A new search, Stage
 * or counsellor starts the page afresh.
 */
export function StudentsRoute() {
  const params = useSearchParams();
  const search = params.get("q") ?? "";
  const stage = params.get("stage") ?? "";
  // Not in the key: the page writes it to the address itself as the filter changes (ticket 11).
  const priority = params.get("priority") ?? "";
  const counsellor = params.get("counsellor") ?? "";
  return (
    <StudentsPage
      key={`${search}|${stage}|${counsellor}`}
      initialSearch={search}
      initialStage={stage}
      initialPriority={priority}
      initialCounsellor={counsellor}
    />
  );
}
