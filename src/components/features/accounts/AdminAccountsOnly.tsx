"use client";

import type { ReactNode } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

/** Its children only for an Admin while the Accounts Module is on; otherwise "isn't available". */
export function AdminAccountsOnly({ children }: { children: ReactNode }) {
  const { staff, modules } = useCurrentStaff();
  if (staff.role === Role.Admin && modules.includes(Module.Accounts)) return children;
  return (
    <Panel>
      <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
        {MESSAGES.notAvailable}
      </EmptyState>
    </Panel>
  );
}
