import Link from "next/link";

import { DocumentsButton } from "@/components/features/documents/DocumentsButton";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import { VISA_LIST_TEXT as TEXT, VISA_STATUS_LABELS } from "@/constants/visas";
import type { OfficeVisa } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

import { VISA_STATUS_TONES } from "./statusTones";

type VisaTableProps = {
  visas: readonly OfficeVisa[];
  /** Open the Student's document checklist. */
  onOpenDocuments: (visa: OfficeVisa) => void;
};

// Narrow padding so all six columns fit as a table (asked 2026-11-17).
const HEAD = "text-small text-ink-2 bg-fill px-3 py-3 text-left font-semibold";
const CELL = "px-3 py-4 align-middle max-tablet:p-0";
const COLUMNS = [
  TEXT.student,
  TEXT.goingTo,
  TEXT.intake,
  TEXT.status,
  TEXT.documents,
  TEXT.counsellor,
] as const;

/**
 * Every listed Visa with its Student, where to, Status, documents and counsellor
 * (spec 62b). The Student's name opens their page. All six columns fit as a table: the Student,
 * where to and the counsellor are cut with …, and dates may wrap. Below tablet width each row stacks into a card,
 * so the page never scrolls sideways. On a phone a row is the Student, where they are going and
 * the Visa status, with an arrow.
 */
export function VisaTable({ visas, onOpenDocuments }: VisaTableProps) {
  return (
    <DataTable phone="list" stacksBelowTablet>
      <thead className="max-tablet:sr-only">
        <tr>
          {COLUMNS.map((column) => (
            <th key={column} scope="col" className={HEAD}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {visas.map((visa) => (
          <VisaRow
            key={visa.id}
            visa={visa}
            onOpenDocuments={() => {
              onOpenDocuments(visa);
            }}
          />
        ))}
      </tbody>
    </DataTable>
  );
}

type VisaRowProps = { visa: OfficeVisa; onOpenDocuments: () => void };

function VisaRow({ visa, onOpenDocuments }: VisaRowProps) {
  const { student, university, course, assignedCounsellor } = visa;
  return (
    <DataRow opensPage className="hover:bg-fill max-tablet:grid max-tablet:gap-3 max-tablet:p-5">
      <DataCell part="title" shrinks="large" className={CELL}>
        <Link
          href={ROUTES.student(student.id)}
          className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
        >
          <OneLine>{student.name}</OneLine>
        </Link>
        <div className="text-secondary text-ink-2 max-phone:hidden tabular-nums">
          {student.phone}
        </div>
      </DataCell>
      <DataCell part="line" shrinks="quarter" className={CELL}>
        <OneLine block className="font-semibold">
          {COUNTRY_LABELS[university.country]}
        </OneLine>
        <OneLine block className="text-secondary text-ink-2 max-phone:hidden">
          {TEXT.universityAndCourse(university.name, course.name)}
        </OneLine>
      </DataCell>
      <DataCell label={TEXT.intake} className={`${CELL} tabular-nums`}>
        {formatIntake(visa.intake)}
      </DataCell>
      <DataCell part="fact" className={CELL}>
        <Chip tone={VISA_STATUS_TONES[visa.status]}>{VISA_STATUS_LABELS[visa.status]}</Chip>
      </DataCell>
      <DataCell className={CELL}>
        <DocumentsButton
          studentName={student.name}
          documents={visa.documents}
          onOpen={onOpenDocuments}
        />
      </DataCell>
      <DataCell label={TEXT.counsellor} shrinks="medium" className={CELL}>
        {assignedCounsellor === null ? (
          <Chip tone="warn">{TEXT.notAssigned}</Chip>
        ) : (
          <OneLine>{assignedCounsellor.name}</OneLine>
        )}
      </DataCell>
    </DataRow>
  );
}
