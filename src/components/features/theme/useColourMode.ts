"use client";

import { useStoredValue } from "@/hooks/useStoredValue";
import { ColourMode } from "@/lib/theme";

const STORAGE_PREFIX = "crm.colour-mode.";

export type ColourModeState = {
  mode: ColourMode;
  /** Switch to the other mode and remember it for this person. */
  toggleMode: () => void;
};

function asColourMode(value: string | null): ColourMode | null {
  return value === ColourMode.Light || value === ColourMode.Dark ? value : null;
}

/**
 * One person's light or dark mode: their own choice if they made one in this browser, otherwise
 * light, whatever the device prefers (2026-11-20). `personKey` keeps each person's choice apart on a shared office computer.
 */
export function useColourMode(personKey: string): ColourModeState {
  const [stored, store] = useStoredValue(`${STORAGE_PREFIX}${personKey}`);
  const mode = asColourMode(stored) ?? ColourMode.Light;

  return {
    mode,
    toggleMode: () => {
      store(mode === ColourMode.Dark ? ColourMode.Light : ColourMode.Dark);
    },
  };
}
