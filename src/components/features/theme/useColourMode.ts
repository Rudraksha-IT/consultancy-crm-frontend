"use client";

import { useSyncExternalStore } from "react";

import { useStoredValue } from "@/hooks/useStoredValue";
import { ColourMode } from "@/lib/theme";

import { isDeviceDark, subscribeToDevice } from "./deviceColourMode";

const STORAGE_PREFIX = "crm.colour-mode.";

export type ColourModeState = {
  mode: ColourMode;
  /** Switch to the other mode and remember it for this person. */
  toggleMode: () => void;
};

const onServer = (): boolean => false;

function asColourMode(value: string | null): ColourMode | null {
  return value === ColourMode.Light || value === ColourMode.Dark ? value : null;
}

/**
 * One person's light or dark mode: their own choice if they made one in this browser, otherwise
 * the device's. `personKey` keeps each person's choice apart on a shared office computer.
 */
export function useColourMode(personKey: string): ColourModeState {
  const [stored, store] = useStoredValue(`${STORAGE_PREFIX}${personKey}`);
  const isDark = useSyncExternalStore(subscribeToDevice, isDeviceDark, onServer);
  const mode = asColourMode(stored) ?? (isDark ? ColourMode.Dark : ColourMode.Light);

  return {
    mode,
    toggleMode: () => {
      store(mode === ColourMode.Dark ? ColourMode.Light : ColourMode.Dark);
    },
  };
}
