"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addOfficeNetwork,
  fetchCurrentNetwork,
  fetchOfficeNetworks,
  removeOfficeNetwork,
  type CurrentNetwork,
  type OfficeNetwork,
  type OfficeNetworkList,
} from "@/lib/api";
import { onOfficeNetworksChanged } from "@/lib/officeNetworksChanged";

export type OfficeNetworksState =
  { status: "loading" } | { status: "failed" } | { status: "loaded"; list: OfficeNetworkList };

export type OfficeNetworks = {
  state: OfficeNetworksState;
  /** The Admin's own address, or null until it is known (or when it can't be read). */
  current: CurrentNetwork | null;
  /** Add one; rejects as `addOfficeNetwork` does. The list and the address are read again. */
  add: (label: string, network: string) => Promise<OfficeNetwork>;
  /** Remove one; rejects when it fails. The list and the address are read again. */
  remove: (network: OfficeNetwork) => Promise<void>;
};

/** The office's Office Networks, the Admin's own address, and adding or removing one. */
export function useOfficeNetworks(): OfficeNetworks {
  const [state, setState] = useState<OfficeNetworksState>({ status: "loading" });
  const [current, setCurrent] = useState<CurrentNetwork | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      const [list, here] = await Promise.allSettled([fetchOfficeNetworks(), fetchCurrentNetwork()]);
      if (isCancelled) return;
      setState(
        list.status === "fulfilled" ? { status: "loaded", list: list.value } : { status: "failed" },
      );
      setCurrent(
        here.status === "fulfilled"
          ? here.value
          : { address: null, suggestedNetwork: null, isCovered: false },
      );
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => {
    setVersion((known) => known + 1);
  }, []);

  // Added from the Admin's dialog over this page: read the list and the address again.
  useEffect(() => onOfficeNetworksChanged(reload), [reload]);

  async function add(label: string, network: string): Promise<OfficeNetwork> {
    const added = await addOfficeNetwork(label, network);
    reload();
    return added;
  }

  async function remove(network: OfficeNetwork): Promise<void> {
    await removeOfficeNetwork(network.id);
    reload();
  }

  return { state, current, add, remove };
}
