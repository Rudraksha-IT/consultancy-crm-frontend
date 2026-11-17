"use client";

import { useEffect, useState } from "react";

import { fetchPickableDocumentTypes, type DocumentType } from "@/lib/api";

export type OptionalTypesState =
  { status: "loading" } | { status: "loaded"; types: DocumentType[] } | { status: "failed" };

/** The office's Document Types a Course can require: those not every Student needs (issue 92). */
export function useOptionalDocumentTypes(): OptionalTypesState {
  const [state, setState] = useState<OptionalTypesState>({ status: "loading" });
  useEffect(() => {
    let isCancelled = false;
    fetchPickableDocumentTypes().then(
      (types) => {
        if (!isCancelled) {
          setState({ status: "loaded", types: types.filter((type) => !type.neededByEveryone) });
        }
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);
  return state;
}
