"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MenuCount } from "./menuCount";

/**
 * A count for the menu, asked for when the shell opens, on every page change, every `refreshMs`,
 * and whenever `refresh` is called. A failed ask keeps the last count; an answer that arrives
 * after a newer ask was made is dropped. When not `isWanted` (e.g. a Role that can't open the
 * screen), nothing is asked and the count stays 0.
 */
export function useCountLoader(
  fetchCount: () => Promise<number>,
  refreshMs: number,
  isWanted = true,
): MenuCount {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const latestAsk = useRef(0);

  const refresh = useCallback(() => {
    if (!isWanted) return;
    latestAsk.current += 1;
    const ask = latestAsk.current;
    void (async () => {
      try {
        const found = await fetchCount();
        if (ask === latestAsk.current) setCount(found);
      } catch {
        // The last count stays until the next ask.
      }
    })();
  }, [fetchCount, isWanted]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const timer = setInterval(refresh, refreshMs);
    return () => {
      clearInterval(timer);
      // Answers still on their way after the shell closes are dropped.
      latestAsk.current += 1;
    };
  }, [refresh, refreshMs]);

  return useMemo(() => ({ count, refresh }), [count, refresh]);
}
