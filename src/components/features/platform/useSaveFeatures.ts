"use client";

import { useState } from "react";

import { MESSAGES } from "@/constants/messages";
import { Module, type SwitchableModule } from "@/constants/modules";

export type FeatureSwitches = Record<SwitchableModule, boolean>;

export type SaveFeaturesState = {
  switches: FeatureSwitches;
  setSwitch: (module: SwitchableModule, isOn: boolean) => void;
  isSaving: boolean;
  error: string | null;
  save: () => Promise<void>;
};

/**
 * Edit an office's feature switches, starting from the Modules it has on; saving stores them all
 * with `saveSwitches` (on the Platform, or from inside the office during Support Access).
 */
export function useSaveFeatures(
  modules: readonly Module[],
  saveSwitches: (switches: FeatureSwitches) => Promise<void>,
): SaveFeaturesState {
  const [switches, setSwitches] = useState(() => switchesOf(modules));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      await saveSwitches(switches);
    } catch {
      setError(MESSAGES.saveFeaturesFailed);
    }
    // Configuration stays open after a save (ticket 16), ready for the next change.
    setIsSaving(false);
  }

  return {
    switches,
    setSwitch: (module, isOn) => {
      setSwitches((current) => ({ ...current, [module]: isOn }));
    },
    isSaving,
    error,
    save,
  };
}

function switchesOf(modules: readonly Module[]): FeatureSwitches {
  return {
    batches: modules.includes(Module.Batches),
    communication: modules.includes(Module.Communication),
    accounts: modules.includes(Module.Accounts),
    reports: modules.includes(Module.Reports),
    clock_in: modules.includes(Module.ClockIn),
  };
}
