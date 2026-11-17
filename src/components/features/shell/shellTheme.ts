"use client";

import { createContext, useContext } from "react";

import type { ThemeConfig } from "@/lib/theme";

export type ShellTheme = {
  /** The Theme the app is shown in now. */
  theme: ThemeConfig;
  /** Re-colour the app at once, e.g. after an Admin saves new colours. */
  setTheme: (theme: ThemeConfig) => void;
};

export const ShellThemeContext = createContext<ShellTheme | null>(null);

/** The app's current Theme and a way to change it; only inside the AppShell. */
export function useShellTheme(): ShellTheme {
  const shellTheme = useContext(ShellThemeContext);
  if (shellTheme === null) throw new Error("useShellTheme must be used inside the AppShell");
  return shellTheme;
}
