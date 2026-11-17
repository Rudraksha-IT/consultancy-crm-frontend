"use client";

import { useEffect, useState } from "react";

import { fetchUniversities, type UniversityPage } from "@/lib/api";
import type { CatalogueFilters } from "@/lib/catalogue";

export type UniversityListState =
  { status: "loading" } | { status: "loaded"; page: UniversityPage } | { status: "failed" };

/**
 * Load the page of Universities matching `filters`, again whenever they, the page or `version`
 * change. An answer that arrives after a newer request is dropped.
 */
export function useUniversityList(
  filters: CatalogueFilters,
  page: number,
  version: number,
): UniversityListState {
  const [list, setList] = useState<UniversityListState>({ status: "loading" });
  const { search, includeArchived } = filters;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchUniversities({ search, includeArchived }, page);
        if (!isCancelled) setList({ status: "loaded", page: found });
      } catch {
        if (!isCancelled) setList({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [search, includeArchived, page, version]);

  return list;
}
