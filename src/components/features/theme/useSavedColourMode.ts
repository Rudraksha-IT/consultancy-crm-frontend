"use client";

import { useState, useSyncExternalStore } from "react";

import type { ColourModeChoice } from "@/constants/mySettings";
import { ColourMode } from "@/lib/theme";

import { isDeviceDark, subscribeToDevice } from "./deviceColourMode";
import type { ColourModeState } from "./useColourMode";

const onServer = (): boolean => false;

/**
 * A logged-in Staff member's light or dark mode, saved for them (issue 38) so it follows them to
 * every device. Until they choose, it is the device's. The switch shows at once; `save` stores
 * it, and a failed save leaves this page as switched.
 */
export function useSavedColourMode(
  saved: ColourModeChoice,
  save: (choice: ColourModeChoice) => Promise<unknown>,
): ColourModeState {
  const [choice, setChoice] = useState<ColourModeChoice>(saved);
  const isDark = useSyncExternalStore(subscribeToDevice, isDeviceDark, onServer);
  const deviceMode = isDark ? ColourMode.Dark : ColourMode.Light;
  const mode = choice === "device" ? deviceMode : choice;

  return {
    mode,
    toggleMode: () => {
      const next = mode === ColourMode.Dark ? ColourMode.Light : ColourMode.Dark;
      setChoice(next);
      save(next).catch(() => undefined);
    },
  };
}
