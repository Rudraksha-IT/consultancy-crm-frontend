"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { MESSAGES } from "@/constants/messages";

import { LogoLoader } from "./LogoLoader";

/** How long after a reload the cover stays at least: one turn of the loader. */
const COVER_MS = 2000;
/** Moving to another page: no loader unless the page takes longer than this. */
const SLOW_MS = 1000;
/** The most the middle loader waits for a page's boxes, so one that never ends can't hold it. */
const MOST_MS = 8000;

type PageLoad = {
  /** The page is still loading what it first asked for: boxes leave the loader to the middle. */
  isPageLoading: boolean;
  /** A box's loader is shown; call the result when it goes. */
  showing: () => () => void;
};

const PageLoadContext = createContext<PageLoad | null>(null);

type PageLoadProviderProps = {
  /** The page's address: moving to another page starts its load again. */
  page: string | null;
  children: ReactNode;
};

/**
 * One loader while a page loads (list tidy-ups 27). After a full reload it covers the app for at
 * least 2 s, one turn, while the page loads behind it. Moving to another page shows nothing for
 * the first second, then the one loader if it is still loading. On any page, while the boxes it first
 * shows are loading, one loader stays in the middle and the boxes show none; once they all have
 * their data (or after 8 s), a box that loads again (a tab inside the page) shows its own.
 */
export function PageLoadProvider({ page, children }: PageLoadProviderProps) {
  const [hasWaited, setHasWaited] = useState(false);
  const [loadedPage, setLoadedPage] = useState<string | null | undefined>(undefined);
  const [count, setCount] = useState(0);
  const [slowPage, setSlowPage] = useState<string | null | undefined>(undefined);
  const shown = useRef(0);
  const current = useRef(page);
  useLayoutEffect(() => {
    current.current = page;
  }, [page]);

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

  const endIfDone = useCallback(() => {
    setTimeout(() => {
      if (shown.current === 0) setLoadedPage(current.current);
    }, 0);
  }, []);

  useEffect(() => {
    endIfDone();
    const slow = setTimeout(() => {
      setSlowPage(page);
    }, SLOW_MS);
    const most = setTimeout(() => {
      setLoadedPage(page);
    }, MOST_MS);
    return () => {
      clearTimeout(slow);
      clearTimeout(most);
    };
  }, [page, endIfDone]);

  const showing = useCallback(() => {
    shown.current += 1;
    setCount(shown.current);
    return () => {
      shown.current -= 1;
      setCount(shown.current);
      endIfDone();
    };
  }, [endIfDone]);

  const isPageLoading = loadedPage !== page;
  const value = useMemo(() => ({ isPageLoading, showing }), [isPageLoading, showing]);
  return (
    <PageLoadContext value={value}>
      {children}
      <PageLoaders hasWaited={hasWaited} isSlow={isPageLoading && slowPage === page && count > 0} />
    </PageLoadContext>
  );
}

/** The reload's cover for its first 2 s, then the one loader while a page is slow. */
function PageLoaders({ hasWaited, isSlow }: { hasWaited: boolean; isSlow: boolean }) {
  if (!hasWaited) return <PageLoader isCover />;
  return isSlow ? <PageLoader isCover={false} /> : null;
}

/** The loader in the middle of the screen; after a reload, on the page's colour over all of it. */
function PageLoader({ isCover }: { isCover: boolean }) {
  return (
    <div
      role="status"
      data-reload-cover={isCover ? "" : undefined}
      data-page-loader={isCover ? undefined : ""}
      className={
        isCover
          ? "bg-canvas fixed inset-0 z-50 grid place-items-center"
          : "pointer-events-none fixed inset-0 z-40 grid place-items-center"
      }
    >
      <LogoLoader size="page" />
      <span className="sr-only">{MESSAGES.loading}</span>
    </div>
  );
}

/**
 * Registers a box's loader while it is shown, and says whether its page is still loading, when
 * the box leaves the loader to the middle.
 */
export function usePageLoading(): boolean {
  const load = useContext(PageLoadContext);
  const showing = load?.showing;
  useEffect(() => showing?.(), [showing]);
  return load?.isPageLoading ?? false;
}
