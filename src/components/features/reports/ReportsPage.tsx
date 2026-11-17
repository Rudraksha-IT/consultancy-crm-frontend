"use client";

import { useCallback, useState, type ReactNode } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { REPORTS_TEXT, ReportTab } from "@/constants/reports";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  fetchClassReport,
  fetchSourceReport,
  fetchStaffProgressReport,
  type DateRange,
  type MonthCount,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { rangeEndingOn } from "@/lib/reports";

import { ClassReport } from "./ClassReport";
import { MoneyReport } from "./MoneyReport";
import { RangeForm } from "./RangeForm";
import { SourceReport } from "./SourceReport";
import { StaffProgressReport } from "./StaffProgressReport";
import { StudentReport } from "./StudentReport";
import { useReport, type ReportState } from "./useReport";

const TAB_OPTIONS = Object.values(ReportTab).map((tab) => ({
  value: tab,
  label: REPORTS_TEXT.tabs[tab],
}));
// Money needs the Accounts Module (spec 97); Classes the test-prep Module (spec 98).
const TAB_MODULES: Partial<Record<ReportTab, Module>> = {
  [ReportTab.Money]: Module.Accounts,
  [ReportTab.Classes]: Module.Batches,
};
// The reports charted over the last 6 or 12 months; the others are between two dates.
const MONTHLY_TABS: readonly ReportTab[] = [ReportTab.Students, ReportTab.Money];
const MONTH_OPTIONS = [
  { value: "6", label: REPORTS_TEXT.lastMonths(6) },
  { value: "12", label: REPORTS_TEXT.lastMonths(12) },
] as const;

/**
 * Reports, for Admins when the Reports Module is on (spec 93-95, 98, 99, 127): Students over the
 * last 6 or 12 months, and (with Accounts on) Money; where visitors came from, Staff Progress and
 * (with the test-prep Module on) classes between two dates.
 */
export function ReportsPage() {
  const { staff, modules } = useCurrentStaff();
  if (staff.role !== Role.Admin || !modules.includes(Module.Reports)) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <Reports modules={modules} />;
}

function Reports({ modules }: { modules: readonly Module[] }) {
  const tabs = TAB_OPTIONS.filter((option) => {
    const needs = TAB_MODULES[option.value];
    return needs === undefined || modules.includes(needs);
  });
  const [tab, setTab] = useState<ReportTab>(ReportTab.Students);
  const [months, setMonths] = useState<MonthCount>(6);
  const [range, setRange] = useState<DateRange>(() => rangeEndingOn(todayIso()));

  return (
    <div className="grid gap-8">
      <PageHeader
        title={REPORTS_TEXT.title}
        subtitle={REPORTS_TEXT.intro}
        actions={
          MONTHLY_TABS.includes(tab) ? (
            <MonthsSwitch months={months} onChange={setMonths} />
          ) : undefined
        }
      />
      <SegmentedControl
        label={REPORTS_TEXT.chooseReport}
        options={tabs}
        value={tab}
        onChange={setTab}
      />
      <ChosenReport tab={tab} months={months} range={range} onRange={setRange} />
    </div>
  );
}

/** "Last 6 months / Last 12 months" for the charts. */
function MonthsSwitch({
  months,
  onChange,
}: {
  months: MonthCount;
  onChange: (months: MonthCount) => void;
}) {
  return (
    <SegmentedControl
      label={REPORTS_TEXT.howFarBack}
      options={MONTH_OPTIONS}
      value={months === 12 ? "12" : "6"}
      onChange={(value) => {
        onChange(value === "12" ? 12 : 6);
      }}
    />
  );
}

type ChosenReportProps = RangeReportProps & { tab: ReportTab; months: MonthCount };

function ChosenReport({ tab, months, range, onRange }: ChosenReportProps) {
  if (tab === ReportTab.Sources) return <Sources range={range} onRange={onRange} />;
  if (tab === ReportTab.StaffProgress) return <StaffProgress range={range} onRange={onRange} />;
  if (tab === ReportTab.Classes) return <Classes range={range} onRange={onRange} />;
  if (tab === ReportTab.Money) return <MoneyReport months={months} />;
  return <StudentReport months={months} />;
}

type RangeReportProps = { range: DateRange; onRange: (range: DateRange) => void };

function Sources(props: RangeReportProps) {
  return (
    <RangeReport {...props} fetchReport={fetchSourceReport}>
      {(state) => <SourceReport state={state} />}
    </RangeReport>
  );
}

function StaffProgress(props: RangeReportProps) {
  return (
    <RangeReport {...props} fetchReport={fetchStaffProgressReport}>
      {(state) => <StaffProgressReport state={state} />}
    </RangeReport>
  );
}

function Classes(props: RangeReportProps) {
  return (
    <RangeReport {...props} fetchReport={fetchClassReport}>
      {(state) => <ClassReport state={state} />}
    </RangeReport>
  );
}

type RangeReportOwnProps<T> = RangeReportProps & {
  /** Must keep its identity between renders (a module-level function). */
  fetchReport: (range: DateRange) => Promise<T>;
  children: (state: ReportState<T>) => ReactNode;
};

/** The From/To dates above a report loaded for them; refused dates show on the fields. */
function RangeReport<T>({ range, onRange, fetchReport, children }: RangeReportOwnProps<T>) {
  const load = useCallback(() => fetchReport(range), [fetchReport, range]);
  const state = useReport<T>(load);
  return (
    <div className="grid gap-6">
      <RangeForm
        range={range}
        fieldErrors={state.status === "refused" ? state.fieldErrors : {}}
        onShow={onRange}
      />
      {children(state)}
    </div>
  );
}
