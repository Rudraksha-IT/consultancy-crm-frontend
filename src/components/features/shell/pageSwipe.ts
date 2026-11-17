"use client";

import { createContext, useContext } from "react";

/**
 * Switches Swipe between pages on or off for the open app at once, e.g. after the person changes
 * it in Settings → Preferences (asked 2026-11-17).
 */
export const SetPageSwipeContext = createContext<((isOn: boolean) => void) | null>(null);

/** A way to switch Swipe between pages for the open app; only inside the AppShell. */
export function useSetPageSwipe(): (isOn: boolean) => void {
  const setPageSwipe = useContext(SetPageSwipeContext);
  if (setPageSwipe === null) {
    throw new Error("useSetPageSwipe must be used inside the AppShell");
  }
  return setPageSwipe;
}
