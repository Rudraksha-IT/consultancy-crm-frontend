"use client";

import { useState } from "react";

import { refusalOf } from "./secondStep";

/** What a two-step form shows after a refusal: on its number field, or across the form. */
export type RefusalState = {
  fieldError: string | null;
  problem: string | null;
  /** Show what the field needs before asking the server. */
  setFieldError: (message: string | null) => void;
  setProblem: (message: string | null) => void;
  /** Explain a refused call in words, on the field it belongs to. */
  show: (error: unknown, isRecoveryCode: boolean) => void;
  clear: () => void;
};

export function useRefusal(): RefusalState {
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  return {
    fieldError,
    problem,
    setFieldError,
    setProblem,
    show(error, isRecoveryCode) {
      const refusal = refusalOf(error, isRecoveryCode);
      if (refusal.field === null) setProblem(refusal.message);
      else setFieldError(refusal.message);
    },
    clear() {
      setFieldError(null);
      setProblem(null);
    },
  };
}

/** The `errors` a Field takes for one message. */
export function errorsOf(message: string | null | undefined): string[] | undefined {
  return message === null || message === undefined ? undefined : [message];
}
