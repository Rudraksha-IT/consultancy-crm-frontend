"use client";

import { useSyncExternalStore } from "react";

/** 640 px and below (design system: Phones); the same as Tailwind's `max-phone` variant. */
export const PHONE_QUERY = "(width < 40.0625rem)";

function isPhoneWidth(): boolean {
  return window.matchMedia(PHONE_QUERY).matches;
}

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

const onServer = (): boolean => false;

/**
 * Whether the screen is phone width, following it as it changes (a phone turned sideways). For
 * the few parts that move between places on phones, such as light/dark going from the top bar to
 * the sidebar; everything else changes with CSS alone.
 */
export function usePhoneWidth(): boolean {
  return useSyncExternalStore(subscribe, isPhoneWidth, onServer);
}
