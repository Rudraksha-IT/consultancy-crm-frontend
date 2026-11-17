import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { APPLICATION_LIST_TEXT as TEXT, applicationStatusText } from "@/constants/applications";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import { SelectAllHeader, SelectRowCell } from "@/components/features/exports/SelectionCells";
import type { RowSelection } from "@/components/features/exports/useRowSelection";
import type { OfficeApplication } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

import { APPLICATION_STATUS_TONES } from "./statusTones";

type ApplicationTableProps = {
  applications: readonly OfficeApplication[];
  /** Ticks rows to copy their Students' emails or phones (spec 31a). */
  selection: RowSelection;
};

// Narrow padding so all seven columns fit as a table (asked 2026-11-17).
const HEAD = "text-small text-ink-2 bg-fill px-3 py-3 text-left font-semibold";
const CELL = "px-3 py-4 align-middle max-tablet:p-0";
const COLUMNS = [
  TEXT.student,
  TEXT.universityAndCourse,
  TEXT.intake,
  TEXT.status,
  TEXT.counsellor,
  TEXT.applied,
  TEXT.added,
] as const;

/**
 * Every listed Application with its Student, where to, Status, counsellor and days. Each row
 * opens the Student's page, which starts on their Applications. All seven columns fit as a table:
 * the Student, university and counsellor are cut with …, and dates may wrap. Below tablet width each row
 * stacks into a card, so the page never scrolls sideways. On a phone a row is the Student, the
 * university and the Status, with an arrow.
 */
export function ApplicationTable({ applications, selection }: ApplicationTableProps) {
  return (
    <DataTable phone="list" stacksBelowTablet wraps>
      <thead className="max-tablet:sr-only">
        <tr>
          <SelectAllHeader selection={selection} />
          {COLUMNS.map((column) => (
            <th key={column} scope="col" className={HEAD}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {applications.map((application) => (
          <ApplicationRow key={application.id} application={application} selection={selection} />
        ))}
      </tbody>
    </DataTable>
  );
}

type ApplicationRowProps = { application: OfficeApplication; selection: RowSelection };

function ApplicationRow({ application, selection }: ApplicationRowProps) {
  const dates = useDates();
  const { student, university, course, assignedCounsellor, appliedOn } = application;
  return (
    <DataRow opensPage className="hover:bg-fill max-tablet:grid max-tablet:gap-3 max-tablet:p-5">
      <SelectRowCell
        selection={selection}
        id={application.id}
        name={TEXT.rowName(student.name, university.name)}
      />
      <DataCell part="title" shrinks="medium" className={CELL}>
        <Link
          href={ROUTES.student(student.id)}
          className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
        >
          <OneLine>{student.name}</OneLine>
        </Link>
        <OneLine block className="text-secondary text-ink-2 max-phone:hidden tabular-nums">
          {student.email === "" ? student.phone : student.email}
        </OneLine>
      </DataCell>
      <DataCell part="line" shrinks="large" className={CELL}>
        <OneLine block className="font-semibold">
          {university.name}
        </OneLine>
        <OneLine block className="text-secondary text-ink-2 max-phone:hidden">
          {TEXT.courseIn(course.name, COUNTRY_LABELS[university.country])}
        </OneLine>
      </DataCell>
      <DataCell label={TEXT.intake} className={`${CELL} tabular-nums`}>
        {formatIntake(application.intake)}
      </DataCell>
      <DataCell part="fact" className={CELL}>
        <Chip tone={APPLICATION_STATUS_TONES[application.status]}>
          {applicationStatusText(application.status, application.offerKind)}
        </Chip>
      </DataCell>
      <DataCell label={TEXT.counsellor} shrinks="small" className={CELL}>
        {assignedCounsellor === null ? (
          <Chip tone="warn">{TEXT.notAssigned}</Chip>
        ) : (
          <OneLine>{assignedCounsellor.name}</OneLine>
        )}
      </DataCell>
      <DataCell label={TEXT.applied} className={`${CELL} tabular-nums`}>
        {appliedOn === null ? (
          <span className="text-ink-3">
            <span aria-hidden="true">—</span>
            <span className="sr-only">{TEXT.notApplied}</span>
          </span>
        ) : (
          dates.date(appliedOn)
        )}
      </DataCell>
      <DataCell label={TEXT.added} className={`${CELL} tabular-nums`}>
        {dates.date(application.addedOn)}
      </DataCell>
    </DataRow>
  );
}
