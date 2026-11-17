"use client";

import { useContext } from "react";

import { ToastContext, type ToastApi } from "./toastContext";

/** Show a short confirmation at the bottom of the screen. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (api === null) throw new Error("useToast must be used inside a ToastProvider");
  return api;
}
