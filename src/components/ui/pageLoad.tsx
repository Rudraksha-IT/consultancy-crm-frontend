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

type PageLoad = {
  /** True until everything the page first asked for has loaded. */
  isFirstLoad: boolean;
  /** A loader is shown; call the result when it goes. */
  showing: () => () => void;
};

const PageLoadContext = createContext<PageLoad | null>(null);

type PageLoadProviderProps = {
  /** The page's address: a new page starts a new first load. */
  page: string | null;
  children: ReactNode;
};

/**
 * Tracks a page's first load (list tidy-ups 27). While the page first loads, every box's loader
 * shows as the one loader in the middle of the screen; once nothing is loading, a box's loader
 * shows in its box (switching tabs, say). Loaders that follow straight after (a section loading
 * once its page has) still count as the first load.
 */
export function PageLoadProvider({ page, children }: PageLoadProviderProps) {
  const [loadedPage, setLoadedPage] = useState<string | null | undefined>(undefined);
  const shown = useRef(0);
  const current = useRef(page);
  useLayoutEffect(() => {
    current.current = page;
  }, [page]);

  const settleSoon = useCallback(() => {
    setTimeout(() => {
      if (shown.current === 0) {
        setLoadedPage(current.current);
      }
    }, 0);
  }, []);

  useEffect(() => {
    settleSoon();
  }, [page, settleSoon]);

  const showing = useCallback(() => {
    shown.current += 1;
    return () => {
      shown.current -= 1;
      settleSoon();
    };
  }, [settleSoon]);

  const value = useMemo(
    () => ({ isFirstLoad: loadedPage !== page, showing }),
    [loadedPage, page, showing],
  );
  return <PageLoadContext value={value}>{children}</PageLoadContext>;
}

/** Whether a box's loader should stand in for the page's, and registers it while shown. */
export function useIsFirstLoad(): boolean {
  const load = useContext(PageLoadContext);
  const showing = load?.showing;
  useEffect(() => showing?.(), [showing]);
  return load?.isFirstLoad ?? false;
}
