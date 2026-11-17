"use client";

import { IconButton, type IconButtonTone } from "@/components/ui/IconButton";
import { LABELS } from "@/constants/messages";
import { ColourMode } from "@/lib/theme";

type ThemeToggleProps = {
  mode: ColourMode;
  onToggle: () => void;
  tone?: IconButtonTone;
};

/** The light/dark icon: a moon in light mode, a sun in dark mode. */
export function ThemeToggle({ mode, onToggle, tone }: ThemeToggleProps) {
  const isDark = mode === ColourMode.Dark;
  return (
    <IconButton
      icon={isDark ? "sun" : "moon"}
      label={isDark ? LABELS.switchToLight : LABELS.switchToDark}
      onClick={onToggle}
      tone={tone}
    />
  );
}
