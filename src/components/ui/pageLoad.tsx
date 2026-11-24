"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MESSAGES } from "@/constants/messages";

import { LogoLoader } from "./LogoLoader";

/** How long after a reload the cover stays at least: one turn of the loader (list tidy-ups 27). */
const COVER_MS = 2000;

/** Called when a box's loader shows; the result is called when it goes. */
type Showing = () => () => void;

const PageLoadContext = createContext<Showing | null>(null);

/**
 * After a full reload the app is covered by the one loader for at least 2 s from the reload, and
 * until the first box has its data (or nothing is loading), while the page loads behind it. Then
 * any box still loading shows its own. It lives in the shell, so moving between pages never covers
 * again (list tidy-ups 27).
 */
export function PageLoadProvider({ children }: { children: ReactNode }) {
  const [hasWaited, setHasWaited] = useState(false);
  const [hasData, setHasData] = useState(false);
  const shown = useRef(0);

  useEffect(() => {
    if (shown.current === 0) setHasData(true);
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

  const showing = useCallback<Showing>(() => {
    shown.current += 1;
    return () => {
      shown.current -= 1;
      setHasData(true);
    };
  }, []);

  return (
    <PageLoadContext value={showing}>
      {children}
      {!(hasWaited && hasData) && <ReloadCover />}
    </PageLoadContext>
  );
}

/** The whole screen, the page's colour, with the loader in the middle. */
function ReloadCover() {
  return (
    <div
      role="status"
      data-reload-cover=""
      className="bg-canvas fixed inset-0 z-50 grid place-items-center"
    >
      <LogoLoader size="page" />
      <span className="sr-only">{MESSAGES.loading}</span>
    </div>
  );
}

/** Registers a box's loader while it is shown, so the cover knows when the page has data. */
export function useShowsLoading(): void {
  const showing = useContext(PageLoadContext);
  useEffect(() => showing?.(), [showing]);
}
