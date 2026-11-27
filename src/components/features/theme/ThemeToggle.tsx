"use client";

import { flushSync } from "react-dom";

import { IconButton, type IconButtonTone } from "@/components/ui/IconButton";
import { LABELS } from "@/constants/messages";
import { crossFade } from "@/lib/motion";
import { ColourMode } from "@/lib/theme";

type ThemeToggleProps = {
  mode: ColourMode;
  onToggle: () => void;
  tone?: IconButtonTone;
};

/**
 * The light/dark icon: a moon in light mode, a sun in dark mode. Every screen's switch swaps the
 * colours in one cross-fade of the whole screen, where the browser can (design system: Movement).
 */
export function ThemeToggle({ mode, onToggle, tone }: ThemeToggleProps) {
  const isDark = mode === ColourMode.Dark;
  return (
    <IconButton
      icon={isDark ? "sun" : "moon"}
      label={isDark ? LABELS.switchToLight : LABELS.switchToDark}
      onClick={() => {
        crossFade(() => {
          flushSync(onToggle);
        });
      }}
      tone={tone}
    />
  );
}
