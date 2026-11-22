"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/useToast";
import { OFFICE_NETWORK_TEXT as TEXT } from "@/constants/officeNetworks";
import {
  InvalidFieldsError,
  OfficeNetworkRefusedError,
  type CurrentNetwork,
  type OfficeNetwork,
  type OfficeNetworkList,
} from "@/lib/api";

import { AddOfficeNetworkForm } from "./AddOfficeNetworkForm";
import { useOfficeNetworks, type OfficeNetworks } from "./useOfficeNetworks";

/**
 * Configuration → Office network, while the Clock-in Module is on: the internet addresses Staff
 * may clock in from, "Add the network I'm on now", adding one by hand and removing one (spec
 * 104-105, issue 55). No history of adds and removes is shown or kept (first live fixes, ticket
 * 02). The limits shown come from the server.
 */
export function OfficeNetworkSettings() {
  const networks = useOfficeNetworks();
  const { state } = networks;

  return (
    <Section title={TEXT.title}>
      <div className="grid gap-4">
        <p className="text-ink-2">{TEXT.help}</p>
        <div className="grid min-w-0 content-start gap-4">
          {state.status === "loading" && <p className="text-ink-2">{TEXT.loading}</p>}
          {state.status === "failed" && <Banner tone="problem">{TEXT.loadFailed}</Banner>}
          {state.status === "loaded" && <Loaded list={state.list} networks={networks} />}
        </div>
      </div>
    </Section>
  );
}

function Loaded({ list, networks }: { list: OfficeNetworkList; networks: OfficeNetworks }) {
  const { showToast } = useToast();
  const [removing, setRemoving] = useState<OfficeNetwork | null>(null);

  async function remove(network: OfficeNetwork): Promise<void> {
    await networks.remove(network);
    setRemoving(null);
    showToast(TEXT.removed(network.label));
  }

  return (
    <>
      <Panel>
        <NetworkList networks={list.networks} onRemove={setRemoving} />
      </Panel>
      {networks.current !== null && (
        <CurrentNetworkPanel current={networks.current} onAdd={networks.add} />
      )}
      <AddOfficeNetworkForm ipv4WidestPrefix={list.limits.ipv4WidestPrefix} onAdd={networks.add} />
      <p className="text-small text-ink-2">{TEXT.staticHelp(list.limits.maxNetworks)}</p>
      {removing !== null && (
        <ConfirmDialog
          title={TEXT.removeTitle(removing.label)}
          actionLabel={TEXT.remove}
          onClose={() => {
            setRemoving(null);
          }}
          onConfirm={() => remove(removing)}
          failureOf={() => TEXT.removeFailed}
        >
          {TEXT.removeBody(removing.network)}
        </ConfirmDialog>
      )}
    </>
  );
}

function NetworkList({
  networks,
  onRemove,
}: {
  networks: readonly OfficeNetwork[];
  onRemove: (network: OfficeNetwork) => void;
}) {
  if (networks.length === 0) return <EmptyState>{TEXT.none}</EmptyState>;
  return (
    <RowList label={TEXT.listLabel}>
      {networks.map((network) => (
        <RowItem
          key={network.id}
          title={<span className="break-words">{network.label}</span>}
          meta={<span className="break-all tabular-nums">{network.network}</span>}
          right={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRemove(network);
              }}
            >
              <span aria-hidden="true">{TEXT.remove}</span>
              <span className="sr-only">{TEXT.removeFor(network.label)}</span>
            </Button>
          }
        />
      ))}
    </RowList>
  );
}

type CurrentNetworkPanelProps = {
  current: CurrentNetwork;
  onAdd: (label: string, network: string) => Promise<OfficeNetwork>;
};

/**
 * The Admin's own address, what adding it saves (the address on IPv4, its /64 on IPv6), and one
 * click to add that ("Add the network I'm on now").
 */
function CurrentNetworkPanel({ current, onAdd }: CurrentNetworkPanelProps) {
  const { address, suggestedNetwork } = current;
  if (address === null || suggestedNetwork === null) {
    return (
      <Panel isPadded>
        <p className="text-ink-2">{TEXT.addressUnknown}</p>
      </Panel>
    );
  }
  return (
    <Panel isPadded>
      <div className="grid gap-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{TEXT.yourAddress}</span>
          <b className="break-all tabular-nums">{address}</b>
          {current.isCovered && <Chip tone="good">{TEXT.alreadyListed}</Chip>}
        </p>
        {!current.isCovered && <AddHere network={suggestedNetwork} onAdd={onAdd} />}
      </div>
    </Panel>
  );
}

type AddHereProps = {
  /** What the server suggests adding for the Admin's own address. */
  network: string;
  onAdd: CurrentNetworkPanelProps["onAdd"];
};

/** "Adds …" and the button that adds it, with the server's reason if it is refused. */
function AddHere({ network, onAdd }: AddHereProps) {
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function addHere(): Promise<void> {
    setIsAdding(true);
    setFailure(null);
    try {
      await onAdd(TEXT.hereLabel, network);
      showToast(TEXT.addedHere);
    } catch (error: unknown) {
      setFailure(refusalOf(error));
    }
    setIsAdding(false);
  }

  return (
    <>
      <p className="text-secondary text-ink-2 break-all">{TEXT.adds(network)}</p>
      <div>
        <Button icon="wifi" isLoading={isAdding} onClick={() => void addHere()}>
          {TEXT.addHere}
        </Button>
      </div>
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </>
  );
}

function refusalOf(error: unknown): string {
  if (error instanceof OfficeNetworkRefusedError) return error.message;
  return firstFieldError(error) ?? TEXT.saveFailed;
}

/** The first reason the server gave on a field, e.g. "That network is already on the list." */
function firstFieldError(error: unknown): string | undefined {
  if (!(error instanceof InvalidFieldsError)) return undefined;
  const refused: Partial<Record<string, string[]>> = error.fieldErrors;
  return Object.values(refused).flat()[0];
}
