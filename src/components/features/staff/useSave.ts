"use client";

import { useState } from "react";

import { MESSAGES } from "@/constants/messages";

export type SaveState = {
  isSaving: boolean;
  error: string | null;
  run: (task: () => Promise<void>) => Promise<void>;
};

/** One change to an employee: busy while it runs, and a short message when it fails. */
export function useSave(): SaveState {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    isSaving,
    error,
    run: async (task) => {
      setIsSaving(true);
      setError(null);
      try {
        await task();
      } catch {
        setError(MESSAGES.employeeChangeFailed);
        setIsSaving(false);
      }
    },
  };
}
