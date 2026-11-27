"use client";

import { useLayoutEffect, type RefObject } from "react";

import { fitHeight } from "@/lib/fitWindow/fitWindow";

/** Marks the box that fills the window; the page drops its own bottom spacing around it. */
export const FILLS_WINDOW_ATTRIBUTE = "data-fills-window";

/** Marks the phone tab bar, so a box that fills the window stops above it. */
export const TAB_BAR_ATTRIBUTE = "data-tabbar";

function tabBarHeight(): number {
  return document.querySelector<HTMLElement>(`[${TAB_BAR_ATTRIBUTE}]`)?.offsetHeight ?? 0;
}

function fit(box: HTMLElement): void {
  const height = fitHeight({
    windowHeight: window.innerHeight,
    top: box.getBoundingClientRect().top + window.scrollY,
    tabBarHeight: tabBarHeight(),
  });
  const wanted = `${String(height)}px`;
  if (box.style.height !== wanted) box.style.height = wanted;
}

/**
 * Makes a box reach the bottom of the window (above the phone tab bar), whatever is above it:
 * it is measured after every drawing, when the window changes size and when the page around it
 * does (a banner arriving). What is inside scrolls on its own. Give the box
 * `data-fills-window` too, so the page leaves no spacing under it.
 */
export function useFillWindow(ref: RefObject<HTMLElement | null>): void {
  // After every drawing: the page's top (its title, a banner) may have changed what is left.
  useLayoutEffect(() => {
    if (ref.current !== null) fit(ref.current);
  });

  useLayoutEffect(() => {
    const refit = (): void => {
      if (ref.current !== null) fit(ref.current);
    };
    window.addEventListener("resize", refit);
    const stopWatching = watchPage(ref.current, refit);
    return () => {
      window.removeEventListener("resize", refit);
      stopWatching();
    };
  }, [ref]);
}

/**
 * Calls `onChange` when the page around the box changes size. Not every browser (or the test
 * one) can; the window's own resize is always watched.
 */
function watchPage(box: HTMLElement | null, onChange: () => void): () => void {
  const page = box?.closest("main") ?? null;
  if (page === null || typeof ResizeObserver === "undefined") return () => undefined;
  const observer = new ResizeObserver(onChange);
  observer.observe(page);
  return () => {
    observer.disconnect();
  };
}
