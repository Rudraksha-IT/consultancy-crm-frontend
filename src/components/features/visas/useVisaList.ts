"use client";

import { useEffect, useState } from "react";

import { fetchVisas, type OfficeVisaPage } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import type { VisaFilters } from "@/lib/visas";

export type VisaListState =
  { status: "loading" } | { status: "loaded"; page: OfficeVisaPage } | { status: "failed" };

/**
 * Load the page of Visas matching `filters`, again whenever they, the page or `version` change.
 * An answer that arrives after a newer request is dropped.
 */
export function useVisaList(filters: VisaFilters, page: number, version: number): VisaListState {
  const [list, setList] = useState<VisaListState>({ status: "loading" });
  const { search, status, country, intake, counsellor, appointment, sort } = filters;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchVisas(
          { search, status, country, intake, counsellor, appointment, sort },
          page,
          todayIso(),
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
  }, [search, status, country, intake, counsellor, appointment, sort, page, version]);

  return list;
}
