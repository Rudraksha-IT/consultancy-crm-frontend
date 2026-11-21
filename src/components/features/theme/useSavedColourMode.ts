"use client";

import { useState } from "react";

import type { ColourModeChoice } from "@/constants/mySettings";
import { ColourMode } from "@/lib/theme";

import type { ColourModeState } from "./useColourMode";

/**
 * A logged-in Staff member's light or dark mode, saved for them (issue 38) so it follows them to
 * every device. Light until they pick dark (2026-11-20). The switch shows at once; `save` stores
 * it, and a failed save leaves this page as switched.
 */
export function useSavedColourMode(
  saved: ColourModeChoice,
  save: (choice: ColourModeChoice) => Promise<unknown>,
): ColourModeState {
  const [mode, setMode] = useState<ColourMode>(saved);

  return {
    mode,
    toggleMode: () => {
      const next = mode === ColourMode.Dark ? ColourMode.Light : ColourMode.Dark;
      setMode(next);
      save(next).catch(() => undefined);
    },
  };
}
