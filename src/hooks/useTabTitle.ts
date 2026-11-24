"use client";

import { usePathname } from "next/navigation";

import type { Role } from "@/constants/roles";
import { tabTitle } from "@/lib/tabTitle";

import { useKeptTitle } from "./useKeptTitle";

/**
 * Keep the browser tab's title on an office's address (first live fixes, ticket 08) in step with
 * the page: set once the office's name is known, and again on every page change.
 */
export function useTabTitle(office: string | null, role: Role | null): void {
  const pathname = usePathname();
  useKeptTitle(office === null ? null : tabTitle(pathname, office, role));
}
