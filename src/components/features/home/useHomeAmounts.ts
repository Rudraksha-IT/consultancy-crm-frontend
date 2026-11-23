"use client";

import { useState } from "react";

import { HOME_AMOUNTS_KEY } from "@/constants/home";
import { useStoredValue } from "@/hooks/useStoredValue";

const SHOWN = "shown";
const HIDDEN = "hidden";

export type HomeAmounts = { isShown: boolean; toggle: () => void };

/**
 * Whether Home's money amounts are shown (ticket 13): hidden until the eye shows them, and kept
 * on this device. When the browser refuses storage the eye still works for this visit.
 */
export function useHomeAmounts(): HomeAmounts {
  const [stored, store] = useStoredValue(HOME_AMOUNTS_KEY);
  const [thisVisit, setThisVisit] = useState<boolean | null>(null);
  const isShown = thisVisit ?? stored === SHOWN;
  return {
    isShown,
    toggle: () => {
      setThisVisit(!isShown);
      store(isShown ? HIDDEN : SHOWN);
    },
  };
}
