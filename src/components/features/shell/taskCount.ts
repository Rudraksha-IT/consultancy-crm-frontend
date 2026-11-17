"use client";

import { createContext, useContext } from "react";

import type { MenuCount } from "./menuCount";

/** The menu's count beside Tasks: my open Tasks due today or overdue (spec 79a). */
export type TaskCount = MenuCount;

function doNothing(): void {
  return undefined;
}

/**
 * Shared by the AppShell. Outside it (e.g. a screen rendered on its own) there is no count to
 * show, and nothing to refresh.
 */
export const TaskCountContext = createContext<TaskCount>({ count: 0, refresh: doNothing });

/** The Tasks count and a way to refresh it after a change. */
export function useTaskCount(): TaskCount {
  return useContext(TaskCountContext);
}
