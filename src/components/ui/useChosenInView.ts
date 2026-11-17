"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Allowance (px) for rounding before a strip counts as wider than its box. */
const ROUNDING = 1;

/**
 * Keeps the chosen tab of a sideways-scrolling strip in view (design system: Segmented control).
 * When the strip is drawn, and again whenever a different tab is chosen, it scrolls so the chosen
 * one (the first match for `chosen` inside it) is centred where possible; it never jumps back to
 * the first tab. Any other update leaves the strip where the person swiped it, so the clock timer
 * or typing never moves it. A strip that fits is left alone.
 */
export function useChosenInView(
  stripRef: RefObject<HTMLElement | null>,
  chosen: string,
  chosenSelector: string,
): void {
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (strip === null) return;
    const room = strip.scrollWidth - strip.clientWidth;
    if (room <= ROUNDING) return;
    const pick = strip.querySelector(chosenSelector);
    if (pick === null) return;
    const box = strip.getBoundingClientRect();
    const tab = pick.getBoundingClientRect();
    const shift = tab.left + tab.width / 2 - (box.left + box.width / 2);
    strip.scrollLeft = Math.min(room, Math.max(0, strip.scrollLeft + shift));
    // `chosen` is what changes when a different tab is picked; the selector finds it in the strip.
  }, [stripRef, chosen, chosenSelector]);
}
