"use client";

import { TASK_COUNT_REFRESH_MS } from "@/constants/tasks";
import { fetchTaskCount } from "@/lib/api";

import type { TaskCount } from "./taskCount";
import { useCountLoader } from "./useCountLoader";

/** My open Tasks due today or overdue, for the menu (spec 79a). See `useCountLoader`. */
export function useTaskCountLoader(): TaskCount {
  return useCountLoader(askTaskCount, TASK_COUNT_REFRESH_MS);
}

function askTaskCount(): Promise<number> {
  return fetchTaskCount();
}
