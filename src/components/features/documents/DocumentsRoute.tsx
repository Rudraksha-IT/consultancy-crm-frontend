"use client";

import { useSearchParams } from "next/navigation";

import { DocumentsPage } from "./DocumentsPage";

/**
 * The Documents page, showing only Students with documents waiting to be checked when the
 * Home's link asks (`?waiting=true`), or the Bin (`?tab=bin`, Admins). Any other value is ignored.
 */
export function DocumentsRoute() {
  const params = useSearchParams();
  const onlyWaiting = params.get("waiting") === "true";
  const tab = params.get("tab") === "bin" ? "bin" : "students";
  return (
    <DocumentsPage
      key={`${String(onlyWaiting)}-${tab}`}
      initialOnlyWaiting={onlyWaiting}
      initialTab={tab}
    />
  );
}
