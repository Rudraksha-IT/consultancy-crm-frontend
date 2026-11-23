"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import type { Role } from "@/constants/roles";
import { tabTitle } from "@/lib/tabTitle";

/**
 * Keep the browser tab's title on an office's address (first live fixes, ticket 08) in step with
 * the page: set once the office's name is known, and again on every page change.
 */
export function useTabTitle(office: string | null, role: Role | null): void {
  const pathname = usePathname();
  useEffect(() => {
    if (office !== null) document.title = tabTitle(pathname, office, role);
  }, [pathname, office, role]);
}
