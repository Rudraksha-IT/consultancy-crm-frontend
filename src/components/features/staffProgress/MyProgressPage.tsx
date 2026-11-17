"use client";

import Link from "next/link";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { PROGRESS_TEXT } from "@/constants/staffProgress";

import { ProgressBody } from "./ProgressBody";
import { useProgressPeriod } from "./useProgressPeriod";
import { useStaffProgress } from "./useStaffProgress";

const BACK = (
  <Link
    href={ROUTES.mySettings}
    className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
  >
    <Icon name="left" />
    {PROGRESS_TEXT.myAccount}
  </Link>
);

/**
 * My progress (spec 125; issue 84): every Staff member's own Staff Progress, from My account. A
 * Platform Admin inside the office has no account here, so none.
 */
export function MyProgressPage() {
  const { staff, supportAccess } = useCurrentStaff();
  if (supportAccess !== null) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <MyProgress staffId={staff.id} canOpenStudents={staff.role !== Role.Teacher} />;
}

function MyProgress({ staffId, canOpenStudents }: { staffId: number; canOpenStudents: boolean }) {
  const choice = useProgressPeriod();
  const { state } = useStaffProgress(staffId, choice.range);
  return (
    <div className="grid gap-8">
      <PageHeader
        crumbs={BACK}
        title={PROGRESS_TEXT.myProgress}
        subtitle={PROGRESS_TEXT.myProgressIntro}
      />
      <ProgressBody
        state={state}
        {...choice}
        listTitle={PROGRESS_TEXT.whatYouDid}
        canOpenStudents={canOpenStudents}
      />
    </div>
  );
}
