"use client";

import { useSyncExternalStore } from "react";

import { isAppUpdating, onUpdatingChange } from "@/lib/api";

/** Whether the latest server answer said the app is being updated (ticket 14). */
export function useAppUpdating(): boolean {
  return useSyncExternalStore(onUpdatingChange, isAppUpdating, () => false);
}
