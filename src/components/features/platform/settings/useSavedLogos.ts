"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { LOGO_TEXT } from "@/constants/logo";
import { SAVED_LOGOS_TEXT as TEXT } from "@/constants/platformTeam";
import { fetchSavedLogos, pickSavedLogo, removeSavedLogo, type SavedLogos } from "@/lib/api";
import type { RecordId } from "@/lib/recordId";

import { setProductLogo } from "../productLogo";

/**
 * Saved product logos (first live fixes, ticket 07): loaded once, then changed in place after
 * every pick or removal, so the page never moves (design-system rule 8). Each change also shows
 * the logo now in use everywhere on this page at once.
 */
export function useSavedLogos() {
  const { showToast } = useToast();
  const [saved, setSaved] = useState<SavedLogos | null>(null);
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(
    (): Promise<void> =>
      fetchSavedLogos().then(
        (found) => {
          setSaved(found);
          setIsLoadFailed(false);
        },
        () => {
          // The upload still works; the list says it couldn't load.
          setIsLoadFailed(true);
        },
      ),
    [],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Use a saved logo, or the app's own (null). Resolves true when it changed. */
  async function pick(id: RecordId | null): Promise<boolean> {
    setProblem(null);
    setIsBusy(true);
    try {
      setProductLogo(await pickSavedLogo(id));
      setSaved((now) => now && { ...now, logos: markInUse(now, id) });
      showToast(TEXT.changed);
      return true;
    } catch {
      setProblem(TEXT.pickFailed);
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  /** Remove a saved logo; rejects when it failed, so the confirm dialog says so. */
  async function remove(id: RecordId): Promise<void> {
    setProblem(null);
    setIsBusy(true);
    try {
      await removeSavedLogo(id);
      const wasInUse = saved?.logos.some((logo) => logo.id === id && logo.inUse) ?? false;
      if (wasInUse) setProductLogo(null);
      setSaved((now) => now && { ...now, logos: now.logos.filter((logo) => logo.id !== id) });
      showToast(LOGO_TEXT.removed);
    } finally {
      setIsBusy(false);
    }
  }

  return { saved, isLoadFailed, isBusy, problem, reload, pick, remove };
}

function markInUse(saved: SavedLogos, id: RecordId | null) {
  return saved.logos.map((logo) => ({ ...logo, inUse: logo.id === id }));
}
