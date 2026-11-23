"use client";

import { useSyncExternalStore } from "react";

import { officeNetworkRefusalOf } from "@/components/features/configuration/officeNetworkRefusal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { Module } from "@/constants/modules";
import { OFFICE_NETWORK_TEXT as TEXT } from "@/constants/officeNetworks";
import { Role } from "@/constants/roles";
import { addOfficeNetwork, type StaffContext } from "@/lib/api";
import { announceOfficeNetworksChanged } from "@/lib/officeNetworksChanged";
import { hasUnsavedChanges, subscribeUnsavedChanges } from "@/lib/unsavedChanges";

import { useOfficeNetworkCheck } from "./useOfficeNetworkCheck";

const noUnsavedOnServer = (): boolean => false;

/** Only an Admin of the office itself, with Clock-in on, is asked (spec 21-23). */
function isAskable(context: StaffContext): boolean {
  return (
    context.staff.role === Role.Admin &&
    context.supportAccess === null &&
    context.modules.includes(Module.ClockIn)
  );
}

/**
 * "This network isn't on your office list", over whichever page the Admin is on, when the
 * network they're using isn't saved (first live fixes, ticket 03). Add this network saves the
 * server's suggestion (the address on IPv4, its /64 on IPv6); Not now (or Escape) hides it for
 * that network on this device. It waits while a form has unsaved changes.
 */
export function OfficeNetworkCheck({ context }: { context: StaffContext }) {
  const { asking, notNow, added } = useOfficeNetworkCheck(isAskable(context));
  const isTyping = useSyncExternalStore(
    subscribeUnsavedChanges,
    hasUnsavedChanges,
    noUnsavedOnServer,
  );
  const { showToast } = useToast();

  if (asking === null || isTyping) return null;

  async function add(network: string): Promise<void> {
    await addOfficeNetwork(TEXT.hereLabel, network);
    announceOfficeNetworksChanged();
    added();
    showToast(TEXT.addedHere);
  }

  return (
    <ConfirmDialog
      title={TEXT.askTitle}
      actionLabel={TEXT.askAdd}
      actionVariant="primary"
      cancelLabel={TEXT.askNotNow}
      onConfirm={() => add(asking)}
      onClose={notNow}
      failureOf={officeNetworkRefusalOf}
    >
      <div className="grid gap-3">
        <p>{TEXT.askOnlySaved}</p>
        <p>
          {TEXT.askAnyoneBefore}
          <strong className="text-ink">{TEXT.askAnyone}</strong>
          {TEXT.askAnyoneAfter}
        </p>
        <p>{TEXT.askOnlyIf}</p>
      </div>
    </ConfirmDialog>
  );
}
