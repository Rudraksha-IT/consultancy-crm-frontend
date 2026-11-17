"use client";

import { useEffect, useState } from "react";

import { fetchVisaFilterChoices, type VisaFilterChoices } from "@/lib/api";

const NO_CHOICES: VisaFilterChoices = { intakes: [], countries: [] };

/**
 * The Intakes and countries the office's Visas use. Empty until loaded, and if loading fails:
 * each filter still offers "Any".
 */
export function useVisaFilterChoices(): VisaFilterChoices {
  const [choices, setChoices] = useState<VisaFilterChoices>(NO_CHOICES);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchVisaFilterChoices();
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
