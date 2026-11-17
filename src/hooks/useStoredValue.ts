"use client";

import { useSyncExternalStore } from "react";

/**
 * A per-browser setting in localStorage, shared live by every component that reads it. Storage can
 * be refused (private windows); reads then give null and writes are dropped, so callers always
 * need a sensible default.
 */

const CHANGE_EVENT = "crm:stored-value";

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const onServer = (): null => null;

export function useStoredValue(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => readStored(key), onServer);
  return [
    value,
    (next) => {
      writeStored(key, next);
    },
  ];
}
