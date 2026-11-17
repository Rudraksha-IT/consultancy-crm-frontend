"use client";

import { createContext, useContext } from "react";

import type { OfficeLogo } from "@/lib/api";

type SetOfficeLogo = (logo: OfficeLogo | null) => void;

/** Shows a new office logo (or the initials again) across the app at once, e.g. after an upload. */
export const SetOfficeLogoContext = createContext<SetOfficeLogo | null>(null);

/** A way to show the office's new logo everywhere; only inside the AppShell. */
export function useSetOfficeLogo(): SetOfficeLogo {
  const setOfficeLogo = useContext(SetOfficeLogoContext);
  if (setOfficeLogo === null) {
    throw new Error("useSetOfficeLogo must be used inside the AppShell");
  }
  return setOfficeLogo;
}
