"use client";

import { createContext, useContext } from "react";

import type { SavedOfficeDetails } from "@/lib/api";

type SetOfficeDetails = (saved: SavedOfficeDetails) => void;

/** Shows the office's new details across the app at once, e.g. after Configuration saves them. */
export const SetOfficeDetailsContext = createContext<SetOfficeDetails | null>(null);

/** A way to show the office's new details everywhere; only inside the AppShell. */
export function useSetOfficeDetails(): SetOfficeDetails {
  const setOfficeDetails = useContext(SetOfficeDetailsContext);
  if (setOfficeDetails === null) {
    throw new Error("useSetOfficeDetails must be used inside the AppShell");
  }
  return setOfficeDetails;
}
