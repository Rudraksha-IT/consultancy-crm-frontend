"use client";

import { useEffect, useState } from "react";

import { fetchApplications, type OfficeApplicationPage } from "@/lib/api";
import type { ApplicationFilters } from "@/lib/applications";

export type ApplicationListState =
  { status: "loading" } | { status: "loaded"; page: OfficeApplicationPage } | { status: "failed" };

/**
 * Load the page of Applications matching `filters`, again whenever they or the page change. An
 * answer that arrives after a newer request is dropped.
 */
export function useApplicationList(
  filters: ApplicationFilters,
  page: number,
): ApplicationListState {
  const [list, setList] = useState<ApplicationListState>({ status: "loading" });
  const { search, status, intake, year, country, counsellor, sort } = filters;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchApplications(
          { search, status, intake, year, country, counsellor, sort },
          page,
        );
        if (!isCancelled) setList({ status: "loaded", page: found });
      } catch {
        if (!isCancelled) setList({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [search, status, intake, year, country, counsellor, sort, page]);

  return list;
}
