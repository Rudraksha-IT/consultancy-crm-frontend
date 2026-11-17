"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { DOCUMENT_TEXT } from "@/constants/documents";
import {
  fetchDocumentTypes,
  removeDocumentType,
  requirementRefusal,
  setNeededByEveryone,
  type ConfiguredDocumentType as DocumentType,
} from "@/lib/api";

export type DocumentTypesState =
  { status: "loading" } | { status: "loaded"; types: DocumentType[] } | { status: "failed" };

/**
 * The office's Document Types with where each is used, moving one between the two lists,
 * removing an unused one, and keeping an added one. Loads when shown, so a tab opened after a
 * Country's list changed shows the new counts (issue 97).
 */
export function useDocumentTypes(): {
  state: DocumentTypesState;
  failure: string | null;
  move: (type: DocumentType) => Promise<void>;
  remove: (type: DocumentType) => Promise<void>;
  keep: (added: DocumentType) => void;
} {
  const { showToast } = useToast();
  const [state, setState] = useState<DocumentTypesState>({ status: "loading" });
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const types = await fetchDocumentTypes();
        if (!isCancelled) setState({ status: "loaded", types });
      } catch {
        if (!isCancelled) setState({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, []);

  function update(change: (types: DocumentType[]) => DocumentType[]): void {
    setState((current) =>
      current.status === "loaded" ? { status: "loaded", types: change(current.types) } : current,
    );
  }

  async function move(type: DocumentType): Promise<void> {
    setFailure(null);
    try {
      const moved = await setNeededByEveryone(type.id, !type.neededByEveryone);
      update((types) => types.map((known) => (known.id === moved.id ? moved : known)));
      showToast(
        moved.neededByEveryone ? DOCUMENT_TEXT.movedToEveryone : DOCUMENT_TEXT.movedToOptional,
      );
    } catch {
      setFailure(DOCUMENT_TEXT.saveFailed);
    }
  }

  /** Rejects when refused; `removalFailure` gives the words. */
  async function remove(type: DocumentType): Promise<void> {
    setFailure(null);
    await removeDocumentType(type.id);
    update((types) => types.filter((known) => known.id !== type.id));
    showToast(DOCUMENT_TEXT.removed);
  }

  return {
    state,
    failure,
    move,
    remove,
    keep: (added) => {
      update((types) => [...types, added]);
    },
  };
}

/** Why removing a Document Type failed, in the server's own words when it gave them. */
export function removalFailure(error: unknown): string {
  return requirementRefusal(error) ?? DOCUMENT_TEXT.saveFailed;
}
