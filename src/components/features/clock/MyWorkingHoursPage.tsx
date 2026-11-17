"use client";

import Link from "next/link";
import { useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { CLOCK_TEXT as TEXT } from "@/constants/clock";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { formatMonth, todayIso } from "@/lib/dates";

import { MonthCalendar } from "./MonthCalendar";
import { MonthPicker } from "./MonthPicker";
import { MyWorkFromHome } from "./MyWorkFromHome";
import { useClockMonth } from "./useClockMonth";

const MONTH_LENGTH = 7;

/**
 * My working hours (spec 106): my own month as a calendar, for every Role while Clock-in is on,
 * and (everyone but Admins) my Work From Home dates (spec 132).
 * A Platform Admin is not Staff, so has no month of their own: they see everyone's in Employees.
 */
export function MyWorkingHoursPage() {
  const { modules, supportAccess } = useCurrentStaff();
  if (!modules.includes(Module.ClockIn)) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  if (supportAccess !== null) {
    return (
      <Panel>
        <EmptyState
          action={<ButtonLink href={ROUTES.workingHours}>{TEXT.everyonesHours}</ButtonLink>}
        >
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <MyMonth />;
}

function MyMonth() {
  const { staff } = useCurrentStaff();
  const [month, setMonth] = useState(() => todayIso().slice(0, MONTH_LENGTH));
  const { state } = useClockMonth(month, null);
  return (
    <div className="grid gap-8">
      <PageHeader
        title={TEXT.myHoursTitle}
        subtitle={TEXT.myHoursIntro(formatMonth(month))}
        crumbs={<CrumbHome />}
        actions={
          <>
            <MonthPicker value={month} onChange={setMonth} />
            {staff.role === Role.Admin && (
              <ButtonLink href={ROUTES.workingHours} icon="badge">
                {TEXT.everyonesHours}
              </ButtonLink>
            )}
          </>
        }
      />
      <MonthBody state={state} />
      {staff.role !== Role.Admin && <MyWorkFromHome />}
    </div>
  );
}

function MonthBody({ state }: { state: ReturnType<typeof useClockMonth>["state"] }) {
  if (state.status === "loading") return <p className="text-ink-2">{TEXT.monthLoading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.monthFailed}</Banner>;
  return <MonthCalendar month={state.month} />;
}

function CrumbHome() {
  return (
    <Link
      href={ROUTES.home}
      className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
    >
      <Icon name="left" />
      {TEXT.home}
    </Link>
  );
}
