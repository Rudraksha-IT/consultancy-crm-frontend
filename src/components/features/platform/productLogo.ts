"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { BrandLogo } from "@/components/ui/BrandMark";
import { fetchProductLogo } from "@/lib/api";

/**
 * The product's own logo (issue 65), shared by the Platform's header, the login screens and the
 * Settings page: loaded once per page, and an upload shows everywhere at once.
 */

type Loaded = { isLoaded: boolean; logo: BrandLogo | null };

let current: Loaded = { isLoaded: false, logo: null };
let isLoading = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: Loaded): void {
  current = next;
  for (const listener of listeners) listener();
}

const read = (): Loaded => current;

/** Show this logo everywhere now (null: the initials), e.g. after an upload. */
export function setProductLogo(logo: BrandLogo | null): void {
  publish({ isLoaded: true, logo });
}

/** Forget what was loaded; for tests. */
export function resetProductLogo(): void {
  current = { isLoaded: false, logo: null };
  isLoading = false;
}

/** The product's logo, or null for the initials (also while loading or if it can't load). */
export function useProductLogo(): BrandLogo | null {
  const loaded = useSyncExternalStore(subscribe, read, read);
  useEffect(() => {
    if (current.isLoaded || isLoading) return;
    isLoading = true;
    fetchProductLogo().then(
      (logo) => {
        setProductLogo(logo);
      },
      () => {
        // Without it the initials show; nothing else depends on it.
        setProductLogo(null);
      },
    );
  }, []);
  return loaded.logo;
}
