"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ToastContext } from "./toastContext";

const TOAST_DURATION_MS = 3200;

type ToastProviderProps = {
  children: ReactNode;
};

/** Holds the one toast on screen; screens show one through `useToast`. */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const api = useMemo(
    () => ({
      showToast: (message: string) => {
        setToast((current) => ({ message, id: (current?.id ?? 0) + 1 }));
      },
    }),
    [],
  );

  useEffect(() => {
    if (toast === null) return undefined;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, TOAST_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  return (
    <ToastContext value={api}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-8 z-60 flex justify-center"
      >
        {toast !== null && (
          <p className="rounded-control bg-ink text-body text-paper shadow-lift px-5.5 py-3.5 font-medium">
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext>
  );
}
