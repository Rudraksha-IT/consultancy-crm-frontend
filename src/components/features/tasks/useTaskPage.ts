"use client";

import { useEffect, useState } from "react";

import type { TaskPriority, TaskView } from "@/constants/tasks";
import { fetchMyTasks, fetchStudentTasks, type TaskPage } from "@/lib/api";

/** Which Tasks to load: a view of my Tasks (maybe of one priority), or one Student's open Tasks. */
export type TaskSource =
  | { view: TaskView; priority?: TaskPriority | undefined; studentId?: never }
  | { studentId: number; view?: never; priority?: never };

export type TaskPageState =
  { status: "loading" } | { status: "loaded"; page: TaskPage } | { status: "failed" };

/**
 * Load one page of Tasks, again when the source, the page or `version` change (bump it after a
 * change). An answer that arrives after a newer request is dropped.
 */
export function useTaskPage(source: TaskSource, page: number, version: number): TaskPageState {
  const [state, setState] = useState<TaskPageState>({ status: "loading" });
  const { view, studentId, priority } = source;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await loadTasks(
          studentId === undefined ? { view, priority } : { studentId },
          page,
        );
        if (!isCancelled) setState({ status: "loaded", page: found });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [view, studentId, priority, page, version]);

  return state;
}

function loadTasks(source: TaskSource, page: number): Promise<TaskPage> {
  if (source.studentId !== undefined) return fetchStudentTasks(source.studentId, page);
  const filters = source.priority === undefined ? {} : { priority: source.priority };
  return fetchMyTasks(source.view, page, filters);
}
