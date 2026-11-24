"use client";

import { useLayoutEffect } from "react";

import { savedTitleKey } from "@/lib/keptTitle";

/**
 * Keep the browser tab's title on `title` (null while it isn't known). On every page change
 * Next.js puts the product name back as the title; it is put straight back, before the browser
 * draws, so the tab never flashes the product name (list tidy-ups 30).
 */
export function useKeptTitle(title: string | null): void {
  useLayoutEffect(() => {
    if (title === null) return undefined;
    remember(title);
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

/** Remember the title for the next reload of this page (the early script puts it back). */
function remember(title: string): void {
  try {
    localStorage.setItem(savedTitleKey(location.pathname), title);
  } catch {
    // No storage (a private window): a reload shows the product name for a moment.
  }
}
