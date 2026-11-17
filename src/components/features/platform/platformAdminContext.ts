"use client";

import { createContext, useContext } from "react";

import type { PlatformAdmin } from "@/lib/api";

type CurrentPlatformAdmin = {
  admin: PlatformAdmin;
  /** Show a saved change (e.g. a new name) everywhere at once, the header included. */
  setAdmin: (admin: PlatformAdmin) => void;
};

export const PlatformAdminContext = createContext<CurrentPlatformAdmin | null>(null);

/** The logged-in Platform Admin, inside the Platform's frame. */
export function useCurrentPlatformAdmin(): CurrentPlatformAdmin {
  const current = useContext(PlatformAdminContext);
  if (current === null) throw new Error("useCurrentPlatformAdmin needs the PlatformShell");
  return current;
}
