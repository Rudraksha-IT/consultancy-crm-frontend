"use client";

import { useSearchParams } from "next/navigation";

import { StudentsPage } from "./StudentsPage";

/**
 * The Students page, starting from a search typed in the top bar (`?q=`) or a Stage card of the
 * pipeline (`?stage=`). A new search or Stage starts the page afresh.
 */
export function StudentsRoute() {
  const params = useSearchParams();
  const search = params.get("q") ?? "";
  const stage = params.get("stage") ?? "";
  return <StudentsPage key={`${search}|${stage}`} initialSearch={search} initialStage={stage} />;
}
