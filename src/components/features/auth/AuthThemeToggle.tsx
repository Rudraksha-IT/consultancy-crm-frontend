"use client";

import { ThemeToggle } from "@/components/features/theme/ThemeToggle";
import { useColourMode } from "@/components/features/theme/useColourMode";

/** Whoever is at a login screen: one choice per browser, as the brand above reads it. */
export const VISITOR_KEY = "visitor";

/** The light/dark button on the login screens; remembered in this browser (issue 65). */
export function AuthThemeToggle() {
  const { mode, toggleMode } = useColourMode(VISITOR_KEY);
  return <ThemeToggle mode={mode} onToggle={toggleMode} />;
}
