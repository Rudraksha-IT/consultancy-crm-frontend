"use client";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { OneLine } from "@/components/ui/OneLine";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { formatPlainNumber } from "@/components/ui/chartTypes";
import { REPORTS_TEXT } from "@/constants/reports";
import { ROUTES } from "@/constants/routes";
import { PROGRESS_COUNTS } from "@/constants/staffProgress";
import type { StaffProgressReport as Report, StaffProgressRow } from "@/lib/api";

import { ReportBody } from "./ReportState";
import type { ReportState } from "./useReport";

const TEXT = REPORTS_TEXT.staffProgress;
const HEAD = "text-small text-ink-2 bg-fill px-3 py-3 font-semibold first:pl-5 last:pr-5";
const NUMBER = "px-3 py-4 last:pr-5 tablet:text-right tabular-nums max-tablet:p-0";

type Column<Counts> = keyof Counts & keyof typeof TEXT.columns;

const COUNSELLOR_COLUMNS = [
  "students",
  "moved_forward",
  "applications_made",
  "visas_applied_for",
  "visas_granted",
  "students_lost",
  "tasks_done",
] as const satisfies readonly Column<Report["counsellors"][number]["counts"]>[];
const FRONT_DESK_COLUMNS = [
  "visitors_registered",
  "new_leads",
  "payments_taken",
] as const satisfies readonly Column<Report["frontDesk"][number]["counts"]>[];
const TEACHER_COLUMNS = ["classes_taken", "attendance_marked"] as const satisfies readonly Column<
  Report["teachers"][number]["counts"]
>[];

/**
 * Reports → Staff Progress (spec 127; issue 85): the Counsellors table, then Front Desk and
 * Teachers, counted exactly like each person's Progress tab. A table with nobody in it is left
 * out. Each name opens that person's Progress.
 */
export function StaffProgressReport({ state }: { state: ReportState<Report> }) {
  return <ReportBody state={state}>{(report) => <Tables report={report} />}</ReportBody>;
}

function Tables({ report }: { report: Report }) {
  const dates = useDates();
  const { counsellors, frontDesk, teachers, countedFrom } = report;
  if (counsellors.length + frontDesk.length + teachers.length === 0) {
    return (
      <Panel>
        <EmptyState>{TEXT.nobody}</EmptyState>
      </Panel>
    );
  }
  const notes = PROGRESS_COUNTS.flatMap((count) => {
    const day = countedFrom[count];
    return day === undefined ? [] : [TEXT.countedFrom(TEXT.columns[count], dates.date(day))];
  });
  return (
    <div className="grid min-w-0 gap-8">
      <ProgressTable
        title={TEXT.counsellors}
        rows={counsellors}
        columns={COUNSELLOR_COLUMNS}
        notes={notes}
      />
      <ProgressTable title={TEXT.frontDesk} rows={frontDesk} columns={FRONT_DESK_COLUMNS} />
      <ProgressTable title={TEXT.teachers} rows={teachers} columns={TEACHER_COLUMNS} />
      <p className="text-small text-ink-2">{TEXT.foot}</p>
    </div>
  );
}

type ProgressTableProps<Counts extends Record<string, number>> = {
  title: string;
  rows: readonly StaffProgressRow<Counts>[];
  columns: readonly Column<Counts>[];
  /** Lines under the table, such as when a count began being recorded. */
  notes?: readonly string[];
};

/** One Role's table. Below tablet width each row stacks into a card, so the page never scrolls. */
function ProgressTable<Counts extends Record<string, number>>({
  title,
  rows,
  columns,
  notes = [],
}: ProgressTableProps<Counts>) {
  if (rows.length === 0) return null;
  return (
    <Section title={title}>
      <Panel>
        {/* Fits its panel: a long name is cut with … and headings wrap (asked 2026-11-17). The
            box only scrolls as a last resort, never the page. */}
        <div className="min-w-0 overflow-x-auto">
          <table data-stacks="" data-wraps="" className="text-body w-full border-collapse">
            <thead className="max-tablet:sr-only">
              <tr>
                <th scope="col" className={`${HEAD} text-left`}>
                  {TEXT.name}
                </th>
                {columns.map((column) => (
                  <th key={column} scope="col" className={`${HEAD} text-right`}>
                    {TEXT.columns[column]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-rule divide-y">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="max-tablet:grid max-tablet:grid-cols-2 max-tablet:gap-3 max-tablet:p-5"
                >
                  <th
                    scope="row"
                    data-shrinks="large"
                    className="max-tablet:col-span-2 max-tablet:p-0 py-2 pr-3 pl-5 text-left font-semibold"
                  >
                    <Link
                      href={ROUTES.employee(row.id)}
                      className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center underline-offset-4 hover:underline"
                    >
                      <OneLine>{row.name}</OneLine>
                    </Link>
                    {!row.isActive && (
                      <div className="text-small text-ink-2 font-normal">{TEXT.hasLeft}</div>
                    )}
                  </th>
                  {columns.map((column) => (
                    <td key={column} className={NUMBER}>
                      <span className="text-secondary text-ink-2 tablet:hidden">
                        {TEXT.columns[column]}{" "}
                      </span>
                      <span className="font-semibold">{formatPlainNumber(row.counts[column])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {notes.map((note) => (
          <PanelFoot key={note}>{note}</PanelFoot>
        ))}
      </Panel>
    </Section>
  );
}
