"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

type ChartViews = {
  /** The charts now shown as their table, by key. */
  tables: ReadonlySet<string>;
  toggle: (key: string) => void;
};

const ChartViewsContext = createContext<ChartViews | null>(null);

/** The same set with `key` put in, or taken out when it was there. */
function toggled(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  const next = new Set(keys);
  if (!next.delete(key)) next.add(key);
  return next;
}

/**
 * Remembers which charts under it are shown as a table, for as long as it is on the page: a
 * chart that goes away and comes back (another report tab, other months) is shown as it was left.
 * Nothing is stored on the device.
 */
export function ChartViewsProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = useCallback((key: string) => {
    setTables((current) => toggled(current, key));
  }, []);
  const views = useMemo(() => ({ tables, toggle }), [tables, toggle]);
  return <ChartViewsContext value={views}>{children}</ChartViewsContext>;
}

/**
 * Whether the chart known by `key` is shown as its table, and the switch between the two. Each
 * chart has its own choice; without a `ChartViewsProvider` above, it lasts as long as the chart.
 */
export function useChartView(key: string): { showsTable: boolean; toggle: () => void } {
  const shared = use(ChartViewsContext);
  const [isOwnTable, setIsOwnTable] = useState(false);
  if (shared === null) {
    return {
      showsTable: isOwnTable,
      toggle: () => {
        setIsOwnTable((current) => !current);
      },
    };
  }
  return {
    showsTable: shared.tables.has(key),
    toggle: () => {
      shared.toggle(key);
    },
  };
}
