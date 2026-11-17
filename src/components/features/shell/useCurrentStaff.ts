"use client";

import { useContext } from "react";

import type { StaffContext } from "@/lib/api";

import { StaffContextContext } from "./staffContext";

/** The logged-in Staff member's context. Only usable inside the AppShell. */
export function useCurrentStaff(): StaffContext {
  const context = useContext(StaffContextContext);
  if (context === null) {
    throw new Error("useCurrentStaff must be used inside the AppShell");
  }
  return context;
}
