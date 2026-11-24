"use client";

import { usePathname } from "next/navigation";

import { useProductName } from "@/components/features/brand/ProductName";
import { platformTabTitle } from "@/lib/tabTitle";

import { useKeptTitle } from "./useKeptTitle";

/** Keep the Platform's tab title, "<page> | <product name>", in step with the page (list tidy-ups 08). */
export function usePlatformTabTitle(): void {
  const pathname = usePathname();
  const product = useProductName();
  useKeptTitle(platformTabTitle(pathname, product));
}
