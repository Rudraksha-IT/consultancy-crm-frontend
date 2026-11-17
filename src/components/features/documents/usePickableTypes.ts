"use client";

import { useEffect, useState } from "react";

import { fetchPickableDocumentTypes, type DocumentType } from "@/lib/api";

export type PickableTypesState =
  { status: "loading" } | { status: "loaded"; types: DocumentType[] } | { status: "failed" };

type PickableTypes = {
  state: PickableTypesState;
  /** The ticked types' ids. */
  ticked: ReadonlySet<number>;
  /** Tick one more type. */
  tick: (id: number) => void;
  /** Make these the only ticked types. */
  tickOnly: (ids: readonly number[]) => void;
  /** Keep a type just added, ticked. */
  keepTicked: (added: DocumentType) => void;
  /** The ticked ids among the types offered (those not every Student needs), in their order. */
  tickedIds: () => number[];
};

/** The office's Document Types for a picker, and which are ticked (starting with `initialIds`). */
export function usePickableTypes(initialIds: readonly number[]): PickableTypes {
  const [state, setState] = useState<PickableTypesState>({ status: "loading" });
  const [ticked, setTickedIds] = useState<ReadonlySet<number>>(() => new Set(initialIds));

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const types = await fetchPickableDocumentTypes();
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

  function tick(id: number): void {
    setTickedIds((current) => new Set([...current, id]));
  }

  return {
    state,
    ticked,
    tick,
    tickOnly: (ids) => {
      setTickedIds(new Set(ids));
    },
    keepTicked: (added) => {
      setState((current) =>
        current.status === "loaded"
          ? { status: "loaded", types: [...current.types, added] }
          : current,
      );
      tick(added.id);
    },
    tickedIds: () =>
      state.status === "loaded"
        ? state.types
            .filter((type) => !type.neededByEveryone && ticked.has(type.id))
            .map((type) => type.id)
        : [],
  };
}
