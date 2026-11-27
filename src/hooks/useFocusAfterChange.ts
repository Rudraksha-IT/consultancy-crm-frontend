"use client";

import { useCallback, useEffect, useState } from "react";

/** Finds what should hold the cursor on the screen as it is after the change. */
type Finder = () => HTMLElement | null | undefined;

/**
 * Moves the cursor once the screen shows a change (design system rule 8): after a row is removed
 * or replaced, the button that was pressed is gone, so the cursor goes to what the finder names.
 *
 * Call the returned function together with the change (in the same handler, after any `await`).
 * The finder runs after React has drawn the change and after a closing dialog has given focus
 * back to its opener, so it sees the new rows and has the last word. A timer can't promise that:
 * on a slow device it fires before the screen changes and the cursor lands on a row about to go.
 */
export function useFocusAfterChange(): (find: Finder) => void {
  const [wanted, setWanted] = useState<{ find: Finder } | null>(null);

  useEffect(() => {
    wanted?.find()?.focus({ preventScroll: true });
  }, [wanted]);

  return useCallback((find: Finder) => {
    setWanted({ find });
  }, []);
}
