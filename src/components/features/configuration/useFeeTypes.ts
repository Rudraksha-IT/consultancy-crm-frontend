"use client";

import { useEffect, useState } from "react";

import {
  addFeeType,
  changeFeeType,
  deleteFeeType,
  fetchFeeTypes,
  reorderFeeTypes,
  type FeeType,
  type FeeTypeChange,
} from "@/lib/api";

export type FeeTypesState =
  { status: "loading" } | { status: "failed" } | { status: "loaded"; types: FeeType[] };

export type FeeTypes = {
  state: FeeTypesState;
  /** Add one before Other; rejects as `addFeeType` does. */
  add: (name: string) => Promise<FeeType>;
  /** Rename, hide or show one; rejects as `changeFeeType` does. */
  change: (feeType: FeeType, change: FeeTypeChange) => Promise<FeeType>;
  /** Delete one no Fee or Payment uses; rejects when refused. */
  remove: (feeType: FeeType) => Promise<void>;
  /** Swap one with its neighbour (-1 up, 1 down); rejects when refused. */
  move: (feeType: FeeType, by: -1 | 1) => Promise<void>;
};

/** The office's Fee Types (Configuration, Admins) and every change to them. */
export function useFeeTypes(): FeeTypes {
  const [state, setState] = useState<FeeTypesState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    fetchFeeTypes().then(
      (types) => {
        if (!isCancelled) setState({ status: "loaded", types });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);

  async function reload(): Promise<void> {
    setState({ status: "loaded", types: await fetchFeeTypes() });
  }

  function loaded(): FeeType[] {
    return state.status === "loaded" ? state.types : [];
  }

  async function add(name: string): Promise<FeeType> {
    const added = await addFeeType(name);
    await reload();
    return added;
  }

  async function change(feeType: FeeType, wanted: FeeTypeChange): Promise<FeeType> {
    const changed = await changeFeeType(feeType.id, wanted);
    setState({
      status: "loaded",
      types: loaded().map((known) => (known.id === changed.id ? changed : known)),
    });
    return changed;
  }

  async function remove(feeType: FeeType): Promise<void> {
    await deleteFeeType(feeType.id);
    setState({ status: "loaded", types: loaded().filter((known) => known.id !== feeType.id) });
  }

  async function move(feeType: FeeType, by: -1 | 1): Promise<void> {
    const ids = loaded().map((known) => known.id);
    const from = ids.indexOf(feeType.id);
    const to = from + by;
    const other = ids[to];
    if (from < 0 || other === undefined) return;
    ids[to] = feeType.id;
    ids[from] = other;
    setState({ status: "loaded", types: await reorderFeeTypes(ids) });
  }

  return { state, add, change, remove, move };
}
