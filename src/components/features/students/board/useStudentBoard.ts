"use client";

import { useEffect, useRef, useState } from "react";

import { JOURNEY_STAGES, type Stage } from "@/constants/stages";
import { fetchBoardStudents, type BoardStudent } from "@/lib/api";
import { studentFilterValues, type StudentFilters } from "@/lib/students";

/** One column of the board: the Students at a Stage, as far as they are loaded. */
export type BoardColumn = { stage: Stage } & (
  | { status: "loading" }
  | { status: "failed" }
  | {
      status: "loaded";
      /** How many Students are at this Stage, loaded or not. */
      count: number;
      students: readonly BoardStudent[];
      /** How many pages of them are loaded. */
      pages: number;
      hasMore: boolean;
      isLoadingMore: boolean;
    }
);

type Loaded = Extract<BoardColumn, { status: "loaded" }>;
type Columns = Partial<Record<Stage, BoardColumn>>;

export type StudentBoard = {
  columns: readonly BoardColumn[];
  /** Load the next page of a column. */
  showMore: (stage: Stage) => void;
  /** Load every column again, keeping what is shown until the answers arrive (nothing while off). */
  refresh: () => Promise<void>;
};

/** The board's columns: the five Stages of the journey, or only the one the Stage filter names. */
export function boardStages(filter: Stage | ""): readonly Stage[] {
  return filter === "" ? JOURNEY_STAGES : [filter];
}

/** A column's first `pages` pages, loaded one after another; "failed" if any of them fails. */
async function loadColumn(
  filters: StudentFilters,
  stage: Stage,
  pages: number,
): Promise<BoardColumn> {
  try {
    const students: BoardStudent[] = [];
    let count = 0;
    let hasMore = true;
    for (let page = 1; page <= pages && hasMore; page += 1) {
      const found = await fetchBoardStudents(filters, stage, page);
      students.push(...found.students);
      count = found.count;
      hasMore = students.length < count && found.students.length > 0;
    }
    return { stage, status: "loaded", count, students, pages, hasMore, isLoadingMore: false };
  } catch {
    return { stage, status: "failed" };
  }
}

/**
 * The Students board's columns for `filters`, each loaded on its own so a column shows its true
 * count and its first Students at once. Loads only while `isOn` (the Board is the view shown).
 * An answer for filters that have changed since is dropped.
 */
export function useStudentBoard(filters: StudentFilters, isOn: boolean): StudentBoard {
  const { search, stage, priority, counsellor, source, country, targetLevel } = filters;
  const key = JSON.stringify(studentFilterValues(filters));
  const [board, setBoard] = useState<{ key: string; columns: Columns }>({ key, columns: {} });
  const latestKey = useRef(key);
  const stages = boardStages(stage);
  const shown = board.key === key ? board.columns : {};

  useEffect(() => {
    latestKey.current = key;
    if (!isOn) return;
    const asked = { search, stage, priority, counsellor, source, country, targetLevel };
    for (const one of boardStages(stage)) {
      void loadColumn(asked, one, 1).then((column) => {
        if (latestKey.current !== key) return;
        setBoard((current) => ({
          key,
          columns: { ...(current.key === key ? current.columns : {}), [one]: column },
        }));
      });
    }
  }, [key, isOn, search, stage, priority, counsellor, source, country, targetLevel]);

  function put(column: BoardColumn): void {
    if (latestKey.current !== key) return;
    setBoard((current) => ({
      key,
      columns: { ...(current.key === key ? current.columns : {}), [column.stage]: column },
    }));
  }

  async function loadMore(column: Loaded): Promise<void> {
    put({ ...column, isLoadingMore: true });
    put(await loadColumn(filters, column.stage, column.pages + 1));
  }

  return {
    columns: stages.map((one) => shown[one] ?? { stage: one, status: "loading" }),
    showMore: (one) => {
      const column = shown[one];
      if (column?.status === "loaded" && column.hasMore && !column.isLoadingMore) {
        void loadMore(column);
      }
    },
    refresh: async () => {
      if (!isOn) return;
      await Promise.all(
        stages.map(async (one) => {
          const column = shown[one];
          put(await loadColumn(filters, one, column?.status === "loaded" ? column.pages : 1));
        }),
      );
    },
  };
}
