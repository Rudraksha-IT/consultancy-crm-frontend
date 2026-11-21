"use client";

import type { RecordId } from "@/lib/recordId";
import { useState } from "react";

export type RowSelection = {
  isSelected: (id: RecordId) => boolean;
  toggle: (id: RecordId) => void;
  /** Tick every row on the page, or untick them all when they already are. */
  toggleAll: () => void;
  isAllSelected: boolean;
  /** Some but not every row on the page is ticked. */
  isPartlySelected: boolean;
  /** How many of the rows on the page are ticked. */
  count: number;
  clear: () => void;
};

/**
 * Which rows of the page on screen are ticked (spec 31a). Only rows already loaded count: a row
 * ticked on another page, or gone after a filter change, is never copied.
 */
export function useRowSelection(ids: readonly RecordId[]): RowSelection {
  const [ticked, setTicked] = useState<ReadonlySet<RecordId>>(new Set());
  const count = ids.filter((id) => ticked.has(id)).length;
  const isAllSelected = ids.length > 0 && count === ids.length;

  return {
    isSelected: (id) => ticked.has(id),
    toggle: (id) => {
      setTicked((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    toggleAll: () => {
      setTicked(isAllSelected ? new Set() : new Set(ids));
    },
    isAllSelected,
    isPartlySelected: count > 0 && !isAllSelected,
    count,
    clear: () => {
      setTicked(new Set());
    },
  };
}
