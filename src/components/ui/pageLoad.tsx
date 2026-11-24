"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PageLoad = {
  /** True after a reload until the first box has its data. */
  isFirstLoad: boolean;
  /** A loader is shown; call the result when it goes. */
  showing: () => () => void;
};

const PageLoadContext = createContext<PageLoad | null>(null);

/**
 * After a full reload, every box's loader shows as the one loader in the middle of the screen,
 * until the first box has its data or nothing is loading; from then on (moving between pages,
 * say) each box shows its own (list tidy-ups 27). It lives in the shell, so moving between pages
 * keeps it.
 */
export function PageLoadProvider({ children }: { children: ReactNode }) {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const shown = useRef(0);

  useEffect(() => {
    if (shown.current === 0) setIsFirstLoad(false);
  }, []);

  const showing = useCallback(() => {
    shown.current += 1;
    return () => {
      shown.current -= 1;
      setIsFirstLoad(false);
    };
  }, []);

  const value = useMemo(() => ({ isFirstLoad, showing }), [isFirstLoad, showing]);
  return <PageLoadContext value={value}>{children}</PageLoadContext>;
}

/** Whether a box's loader should stand in for the page's, and registers it while shown. */
export function useIsFirstLoad(): boolean {
  const load = useContext(PageLoadContext);
  const showing = load?.showing;
  useEffect(() => showing?.(), [showing]);
  return load?.isFirstLoad ?? false;
}
