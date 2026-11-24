"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import { PLATFORM_TEAM_TEXT as TEXT } from "@/constants/platformTeam";
import {
  reactivatePlatformAdmin,
  resendPlatformAdminCode,
  type PlatformAdminRow,
  type PlatformAdminStatus,
  updatingOr,
} from "@/lib/api";

import { AddPlatformAdminDialog } from "./AddPlatformAdminDialog";
import { DeactivateDialog } from "./DeactivateDialog";
import { usePlatformAdmins, type PlatformAdminsState } from "./usePlatformAdmins";

const STATUS_TONES: Record<PlatformAdminStatus, ChipTone> = {
  invited: "warn",
  active: "good",
  deactivated: "muted",
};

/** The Platform Admins tab (issue 65): everyone, add by invite, send the code again, deactivate. */
export function PlatformAdminsPage() {
  const { state, show } = usePlatformAdmins();
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<PlatformAdminRow | null>(null);

  async function reactivate(admin: PlatformAdminRow): Promise<void> {
    try {
      const saved = await reactivatePlatformAdmin(admin.id);
      show(saved);
      showToast(
        saved.status === "invited" ? TEXT.invitedAgain(saved.name) : TEXT.reactivated(saved.name),
      );
    } catch (error) {
      showToast(updatingOr(error, TEXT.changeFailed));
    }
  }

  async function resend(admin: PlatformAdminRow): Promise<void> {
    try {
      await resendPlatformAdminCode(admin.id);
      showToast(TEXT.resent(admin.name));
    } catch (error) {
      showToast(updatingOr(error, TEXT.changeFailed));
    }
  }

  return (
    <>
      <PageHeader
        title={TEXT.title}
        subtitle={TEXT.intro}
        actions={
          <Button
            variant="primary"
            icon="userplus"
            onClick={() => {
              setIsAdding(true);
            }}
          >
            {TEXT.add}
          </Button>
        }
      />
      <AdminsList
        state={state}
        onResend={(admin) => void resend(admin)}
        onDeactivate={setToDeactivate}
        onReactivate={(admin) => void reactivate(admin)}
      />
      {isAdding && (
        <AddPlatformAdminDialog
          onClose={() => {
            setIsAdding(false);
          }}
          onAdded={(admin) => {
            show(admin);
            showToast(TEXT.inviteSent(admin.name));
            setIsAdding(false);
          }}
        />
      )}
      {toDeactivate !== null && (
        <DeactivateDialog
          admin={toDeactivate}
          onClose={() => {
            setToDeactivate(null);
          }}
          onDone={(admin) => {
            show(admin);
            const wasInvite = toDeactivate.status === "invited";
            showToast(wasInvite ? TEXT.inviteCancelled(admin.name) : TEXT.deactivated(admin.name));
            setToDeactivate(null);
          }}
        />
      )}
    </>
  );
}

type AdminsListProps = {
  state: PlatformAdminsState;
  onResend: (admin: PlatformAdminRow) => void;
  onDeactivate: (admin: PlatformAdminRow) => void;
  onReactivate: (admin: PlatformAdminRow) => void;
};

function AdminsList({ state, onResend, onDeactivate, onReactivate }: AdminsListProps) {
  if (state.kind === "loading") return <Loading />;
  if (state.kind === "failed") {
    return (
      <p role="alert" className="text-bad font-semibold">
        {TEXT.loadFailed}
      </p>
    );
  }
  return (
    <Panel>
      <RowList>
        {state.admins.map((admin) => (
          <AdminRow
            key={admin.id}
            admin={admin}
            onResend={() => {
              onResend(admin);
            }}
            onDeactivate={() => {
              onDeactivate(admin);
            }}
            onReactivate={() => {
              onReactivate(admin);
            }}
          />
        ))}
      </RowList>
    </Panel>
  );
}

type AdminRowProps = {
  admin: PlatformAdminRow;
  onResend: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
};

function AdminRow({ admin, onResend, onDeactivate, onReactivate }: AdminRowProps) {
  return (
    <RowItem
      title={
        <span className="flex flex-wrap items-center gap-3">
          <span className="break-all">{admin.name}</span>
          {admin.isMe && <Chip tone="accent">{TEXT.you}</Chip>}
        </span>
      }
      meta={<span className="break-all">{admin.email}</span>}
      right={
        <AdminActions
          admin={admin}
          onResend={onResend}
          onDeactivate={onDeactivate}
          onReactivate={onReactivate}
        />
      }
    >
      <span className="mt-2 flex flex-wrap gap-2">
        <Chip tone={STATUS_TONES[admin.status]}>{TEXT.status[admin.status]}</Chip>
        {admin.status !== "deactivated" && (
          <Chip tone={admin.twoFactorRequired ? "good" : "muted"} icon="lock">
            {admin.twoFactorRequired ? TEXT.twoStepOn : TEXT.twoStepOff}
          </Chip>
        )}
      </span>
    </RowItem>
  );
}

function AdminActions({ admin, onResend, onDeactivate, onReactivate }: AdminRowProps) {
  if (admin.isMe) return null;
  if (admin.status === "deactivated") {
    return (
      <Button icon="check" onClick={onReactivate}>
        {TEXT.reactivate}
      </Button>
    );
  }
  const isInvite = admin.status === "invited";
  return (
    <span className="flex flex-wrap gap-3">
      {isInvite && (
        <Button icon="send" onClick={onResend}>
          {TEXT.resend}
        </Button>
      )}
      <Button variant="ghost" onClick={onDeactivate}>
        {isInvite ? TEXT.cancelInvite : TEXT.deactivate}
      </Button>
    </span>
  );
}
