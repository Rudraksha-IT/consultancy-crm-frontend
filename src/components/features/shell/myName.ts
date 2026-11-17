"use client";

import { createContext, useContext } from "react";

/** Shows a person's new name across the app at once, e.g. after they save My Details. */
export const SetMyNameContext = createContext<((name: string) => void) | null>(null);

/** A way to show the logged-in person's new name; only inside the AppShell. */
export function useSetMyName(): (name: string) => void {
  const setMyName = useContext(SetMyNameContext);
  if (setMyName === null) {
    throw new Error("useSetMyName must be used inside the AppShell");
  }
  return setMyName;
}
