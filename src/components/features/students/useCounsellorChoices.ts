"use client";

import { useEffect, useState } from "react";

import { fetchCounsellorChoices, type CounsellorChoice } from "@/lib/api";

/**
 * Who can be picked as an Assigned Counsellor. Empty until loaded, and if loading fails: a
 * visitor can still be saved with "Decide later".
 */
export function useCounsellorChoices(): CounsellorChoice[] {
  const [choices, setChoices] = useState<CounsellorChoice[]>([]);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchCounsellorChoices();
        if (!isCancelled) setChoices(found);
      } catch {
        // Keep the list empty; "Decide later" still works.
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  return choices;
}
