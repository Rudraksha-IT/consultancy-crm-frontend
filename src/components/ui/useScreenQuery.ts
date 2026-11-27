"use client";

import { useCallback, useSyncExternalStore } from "react";

const onServer = (): boolean => false;

/**
 * Whether the screen matches a media query, following it as the window changes size. For the few
 * parts that are not drawn at all at some widths (the Students board where its columns don't
 * fit); everything else changes with CSS alone.
 */
export function useScreenQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, onServer);
}
