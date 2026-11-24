"use client";

import { useLayoutEffect } from "react";

/**
 * Keep the browser tab's title on `title` (null while it isn't known). On every page change
 * Next.js puts the product name back as the title; it is put straight back, before the browser
 * draws, so the tab never flashes the product name (list tidy-ups 30).
 */
export function useKeptTitle(title: string | null): void {
  useLayoutEffect(() => {
    if (title === null) return undefined;
    const keep = () => {
      if (document.title !== title) document.title = title;
    };
    keep();
    const watcher = new MutationObserver(keep);
    watcher.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      watcher.disconnect();
    };
  }, [title]);
}
