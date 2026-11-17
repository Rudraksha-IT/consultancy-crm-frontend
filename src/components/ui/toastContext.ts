"use client";

import { createContext } from "react";

export type ToastApi = {
  /** Confirm an action, using the same verb as its button ("Save visit" → "Visit saved"). */
  showToast: (message: string) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);
