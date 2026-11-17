"use client";

import { useState, type ReactNode } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { ACCOUNTS_TEXT } from "@/constants/payments";
import { COMMISSION_TEXT } from "@/constants/commission";
import { EXPENSE_TEXT } from "@/constants/expenses";
import { FEE_TEXT } from "@/constants/fees";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

import { CommissionSection } from "./CommissionSection";
import { MoneyIn } from "./MoneyIn";
import { MoneyOut } from "./MoneyOut";
import { StudentFeesSection } from "./StudentFeesSection";

const SECTION = {
  fees: "fees",
  moneyIn: "income",
  moneyOut: "expenses",
  commission: "commission",
} as const;

type Section = (typeof SECTION)[keyof typeof SECTION];

const SECTIONS = [
  { value: SECTION.fees, label: FEE_TEXT.studentFees },
  { value: SECTION.moneyIn, label: ACCOUNTS_TEXT.moneyIn },
  { value: SECTION.moneyOut, label: EXPENSE_TEXT.moneyOut },
  { value: SECTION.commission, label: COMMISSION_TEXT.commission },
] as const;

const SECTION_BODIES: Record<Section, () => ReactNode> = {
  [SECTION.fees]: () => <StudentFeesSection />,
  [SECTION.moneyIn]: () => <MoneyIn />,
  [SECTION.moneyOut]: () => <MoneyOut />,
  [SECTION.commission]: () => <CommissionSection />,
};

/**
 * Accounts, for Admins when the Accounts Module is on (spec 74-76e): Student fees, Money in,
 * Money out and Commission.
 */
export function AccountsPage() {
  const { staff, modules } = useCurrentStaff();
  if (staff.role !== Role.Admin || !modules.includes(Module.Accounts)) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <Accounts />;
}

function Accounts() {
  const [section, setSection] = useState<Section>(SECTION.fees);
  return (
    <div className="grid gap-8">
      <PageHeader title={ACCOUNTS_TEXT.title} subtitle={ACCOUNTS_TEXT.intro} />
      <SegmentedControl
        label={ACCOUNTS_TEXT.sections}
        options={SECTIONS}
        value={section}
        onChange={setSection}
        size="lg"
      />
      {SECTION_BODIES[section]()}
    </div>
  );
}
