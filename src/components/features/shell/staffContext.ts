"use client";

import { createContext } from "react";

import type { StaffContext } from "@/lib/api";

/** The logged-in Staff member's context, provided by the AppShell to every screen inside it. */
export const StaffContextContext = createContext<StaffContext | null>(null);
