"use client";

import { useEffect, useState } from "react";

import {
  fetchCountryLists,
  fetchPickableDocumentTypes,
  type CountryList,
  type DocumentType,
} from "@/lib/api";

export type CountryListsState =
  | { status: "loading" }
  | { status: "loaded"; lists: CountryList[]; types: DocumentType[] }
  | { status: "failed" };

/**
 * Every Country's document list and the office's Document Types (issues 80, 97). Loads when
 * shown, so a type added or moved under another tab is offered here.
 */
export function useCountryLists(): {
  state: CountryListsState;
  keep: (saved: CountryList) => void;
  keepType: (made: DocumentType) => void;
} {
  const [state, setState] = useState<CountryListsState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const [lists, types] = await Promise.all([
          fetchCountryLists(),
          fetchPickableDocumentTypes(),
        ]);
        if (!isCancelled) setState({ status: "loaded", lists, types });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  function keep(saved: CountryList): void {
    setState((current) =>
      current.status === "loaded"
        ? {
            ...current,
            lists: current.lists.map((one) => (one.country === saved.country ? saved : one)),
          }
        : current,
    );
  }

  /** A type just made from a Country's list, so the office's types include it. */
  function keepType(made: DocumentType): void {
    setState((current) =>
      current.status === "loaded" ? { ...current, types: [...current.types, made] } : current,
    );
  }

  return { state, keep, keepType };
}
