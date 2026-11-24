"use client";

import { useEffect, useState, type ReactNode } from "react";

import { MESSAGES } from "@/constants/messages";

import { LogoLoader } from "./LogoLoader";

/** How long after a reload the cover stays: one turn of the loader. */
const COVER_MS = 2000;

/**
 * After a full reload the app is covered by the one loader for 2 s from the reload, one turn,
 * while the page loads behind it (list tidy-ups 27). It lives in the shell, so moving between
 * pages never covers; there each box shows its own loader, and only when slow (Loading).
 */
export function PageLoadProvider({ children }: { children: ReactNode }) {
  const [hasWaited, setHasWaited] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setHasWaited(true);
      },
      Math.max(0, COVER_MS - performance.now()),
    );
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {children}
      {!hasWaited && (
        <div
          role="status"
          data-reload-cover=""
          className="bg-canvas fixed inset-0 z-50 grid place-items-center"
        >
          <LogoLoader size="page" />
          <span className="sr-only">{MESSAGES.loading}</span>
        </div>
      )}
    </>
  );
}
