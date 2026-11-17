"use client";

import { useEffect, useState } from "react";

import { fetchApplicationFilterChoices, type ApplicationFilterChoices } from "@/lib/api";

const NO_CHOICES: ApplicationFilterChoices = { intakes: [], years: [], countries: [] };

/**
 * The Intakes, years and countries the office's Applications use. Empty until loaded, and if
 * loading fails: each filter still offers "Any".
 */
export function useApplicationFilterChoices(): ApplicationFilterChoices {
  const [choices, setChoices] = useState<ApplicationFilterChoices>(NO_CHOICES);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchApplicationFilterChoices();
        if (!isCancelled) setChoices(found);
      } catch {
        // Keep "Any" only; the list itself still loads.
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  return choices;
}
