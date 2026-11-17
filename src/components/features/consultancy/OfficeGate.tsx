"use client";

import type { ReactNode } from "react";

import { AuthThemeToggle } from "@/components/features/auth/AuthThemeToggle";
import { MESSAGES } from "@/constants/messages";

import { useCurrentConsultancy } from "./useCurrentConsultancy";

/**
 * An office's login screens appear only on an office's own address (issue 66). Anywhere else
 * (no such office, or one that was Terminated) shows one plain message and no form; so does a
 * server that can't be reached, in its own words.
 */
export function OfficeGate({ children }: { children: ReactNode }) {
  const state = useCurrentConsultancy();
  if (state.status === "loaded") return children;
  if (state.status === "loading") {
    return (
      <main className="bg-canvas grid min-h-full place-items-center px-4 py-16">
        <p className="text-ink-2">{MESSAGES.loading}</p>
      </main>
    );
  }
  const isMissing = state.status === "missing";
  return (
    <main className="bg-canvas relative grid min-h-full place-items-center px-4 py-16">
      <div className="absolute top-3 right-3">
        <AuthThemeToggle />
      </div>
      <div className="grid max-w-prose gap-2 text-center">
        <h1 className="text-page-title-sm wide:text-page-title">
          {isMissing ? MESSAGES.officeMissingTitle : MESSAGES.serverUnreachableTitle}
        </h1>
        <p className="text-ink-2">
          {isMissing ? MESSAGES.officeMissingHelp : MESSAGES.serverUnreachableHelp}
        </p>
      </div>
    </main>
  );
}
