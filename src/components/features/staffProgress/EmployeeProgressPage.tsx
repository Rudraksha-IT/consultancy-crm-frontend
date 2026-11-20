"use client";

import Link from "next/link";
import { useState } from "react";

import { PersonWorkFromHome } from "@/components/features/clock/PersonWorkFromHome";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role, ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { PROGRESS_TEXT } from "@/constants/staffProgress";
import { WORK_FROM_HOME_TAB, WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import type { StaffProgress } from "@/lib/api";
import { parseRecordNumber } from "@/lib/recordId";

import { ProgressBody } from "./ProgressBody";
import { useProgressPeriod } from "./useProgressPeriod";
import { useStaffProgress } from "./useStaffProgress";

const PROGRESS_TAB = { id: "progress", label: PROGRESS_TEXT.tab };
// Work From Home is part of the Clock-in Module (issue 87).
const TABS_WITH_CLOCK = [PROGRESS_TAB, { id: WORK_FROM_HOME_TAB, label: WORK_FROM_HOME_TEXT.tab }];

const BACK = (
  <Link
    href={ROUTES.staff}
    className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
  >
    <Icon name="left" />
    {PROGRESS_TEXT.allEmployees}
  </Link>
);

type EmployeeProgressPageProps = {
  idText: string;
  /** The tab asked for in the address (`?tab=wfh`); Progress otherwise. */
  initialTab?: string | undefined;
};

/**
 * One employee's page under Employees, `/staff/<id>`, for Admins (spec 125, 133; issues 84, 87):
 * who they are, their Progress tab and, while Clock-in is on, their Work from home tab.
 */
export function EmployeeProgressPage({ idText, initialTab }: EmployeeProgressPageProps) {
  const { staff } = useCurrentStaff();
  // Ids are whole numbers from 1, like a Student's.
  const staffId = parseRecordNumber(idText);
  if (staff.role !== Role.Admin) return <NotAvailable />;
  if (staffId === null) return <NotFound />;
  return <EmployeePage key={staffId} staffId={staffId} initialTab={initialTab} />;
}

function EmployeePage({
  staffId,
  initialTab,
}: {
  staffId: number;
  initialTab: string | undefined;
}) {
  const { tabs, tab, setTab } = useEmployeeTabs(initialTab);
  const choice = useProgressPeriod();
  const { state, staff } = useStaffProgress(staffId, choice.range);
  if (state.status === "missing") return <NotFound />;
  if (state.status === "forbidden") return <NotAvailable />;
  return (
    <div className="grid gap-8">
      <div className="grid min-w-0 gap-2">
        {BACK}
        {staff !== null && <Person staff={staff} />}
      </div>
      <Tabs label={PROGRESS_TEXT.tabs} tabs={tabs} selected={tab} onSelect={setTab}>
        {tab === WORK_FROM_HOME_TAB ? (
          <PersonWorkFromHome staffId={staffId} />
        ) : (
          <ProgressBody
            state={state}
            {...choice}
            listTitle={PROGRESS_TEXT.whatTheyDid}
            canOpenStudents
          />
        )}
      </Tabs>
    </div>
  );
}

/** Progress, and Work from home while Clock-in is on; the address may open the second. */
function useEmployeeTabs(initialTab: string | undefined) {
  const { modules } = useCurrentStaff();
  const tabs = modules.includes(Module.ClockIn) ? TABS_WITH_CLOCK : [PROGRESS_TAB];
  const opened = tabs.find((one) => one.id === initialTab) ?? PROGRESS_TAB;
  const [tab, setTab] = useState<string>(opened.id);
  return { tabs, tab, setTab };
}

function Person({ staff }: { staff: StaffProgress["staff"] }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <Avatar name={staff.name} size="lg" />
      <div className="grid min-w-0 gap-1">
        <h1 className="text-page-title-sm wide:text-page-title break-words">{staff.name}</h1>
        <p className="text-secondary text-ink-2 flex flex-wrap gap-x-4 gap-y-1">
          {staff.jobTitle !== "" && <span className="break-words">{staff.jobTitle}</span>}
          <span>{ROLE_LABELS[staff.role]}</span>
          {staff.mobile !== "" && <span className="tabular-nums">{staff.mobile}</span>}
          {staff.status === "deactivated" && <span>{LABELS.hasLeft}</span>}
        </p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <Panel>
      <EmptyState
        action={<ButtonLink href={ROUTES.staff}>{PROGRESS_TEXT.allEmployees}</ButtonLink>}
      >
        {PROGRESS_TEXT.notFound}
      </EmptyState>
    </Panel>
  );
}

function NotAvailable() {
  return (
    <Panel>
      <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
        {MESSAGES.notAvailable}
      </EmptyState>
    </Panel>
  );
}
