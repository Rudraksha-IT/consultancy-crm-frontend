"use client";

import { useEffect, useState } from "react";

import { fetchStudents, type StudentPage } from "@/lib/api";
import type { StudentFilters } from "@/lib/students";

export type StudentListState =
  { status: "loading" } | { status: "loaded"; page: StudentPage } | { status: "failed" };

/**
 * Load the page of Students matching `filters`, again whenever they, the page or `version`
 * change. An answer that arrives after a newer request is dropped.
 */
export function useStudentList(
  filters: StudentFilters,
  page: number,
  version: number,
): StudentListState {
  const [list, setList] = useState<StudentListState>({ status: "loading" });
  const { search, stage, priority, counsellor, source, country, targetLevel } = filters;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchStudents(
          { search, stage, priority, counsellor, source, country, targetLevel },
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
  }, [search, stage, priority, counsellor, source, country, targetLevel, page, version]);

  return list;
}
