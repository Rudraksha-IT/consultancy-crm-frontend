"use client";

import { useLayoutEffect } from "react";

/** The mark on `<html>` that lets the page's content grow wider (`globals.css`, Wide screens). */
export const WIDE_PAGE_ATTRIBUTE = "data-wide-page";

/**
 * Marks the document as holding a wide page while this page is the one shown. The mark is set in
 * an effect, not written into the page's own markup: Next.js keeps the page just left hidden in
 * the background, and markup there would go on widening the page opened after it (Applications
 * and Visas stayed stretched after Students). An effect is taken back when the page is hidden.
 */
export function useWidePage(isWide: boolean): void {
  useLayoutEffect(() => {
    if (!isWide) return undefined;
    document.documentElement.setAttribute(WIDE_PAGE_ATTRIBUTE, "");
    return () => {
      document.documentElement.removeAttribute(WIDE_PAGE_ATTRIBUTE);
    };
  }, [isWide]);
}
