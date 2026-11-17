import Link from "next/link";

import { DocumentsButton } from "@/components/features/documents/DocumentsButton";
import { useDates } from "@/components/features/shell/dateDisplay";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import { APPOINTMENT_LABELS, VISA_LIST_TEXT as TEXT, VISA_STATUS_LABELS } from "@/constants/visas";
import { SelectAllHeader, SelectRowCell } from "@/components/features/exports/SelectionCells";
import type { RowSelection } from "@/components/features/exports/useRowSelection";
import type { OfficeVisa } from "@/lib/api";
import { formatClockTime, formatIntake } from "@/lib/dates";

import { VISA_STATUS_TONES } from "./statusTones";

type VisaTableProps = {
  visas: readonly OfficeVisa[];
  /** Open the Student's document checklist. */
  onOpenDocuments: (visa: OfficeVisa) => void;
  /** Ticks rows to copy their Students' emails or phones (spec 31a). */
  selection: RowSelection;
};

// Narrow padding so all seven columns fit as a table (asked 2026-11-17).
const HEAD = "text-small text-ink-2 bg-fill px-3 py-3 text-left font-semibold";
const CELL = "px-3 py-4 align-middle max-tablet:p-0";
const COLUMNS = [
  TEXT.student,
  TEXT.goingTo,
  TEXT.intake,
  TEXT.status,
  TEXT.nextAppointment,
  TEXT.documents,
  TEXT.counsellor,
] as const;

/**
 * Every listed Visa with its Student, where to, Status, next appointment, documents and counsellor
 * (spec 62b). The Student's name opens their page. All seven columns fit as a table: the Student,
 * where to and the counsellor are cut with …, and dates may wrap. Below tablet width each row stacks into a card,
 * so the page never scrolls sideways. On a phone a row is the Student, where they are going and
 * the Visa status, with an arrow.
 */
export function VisaTable({ visas, onOpenDocuments, selection }: VisaTableProps) {
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
        {visas.map((visa) => (
          <VisaRow
            key={visa.id}
            visa={visa}
            selection={selection}
            onOpenDocuments={() => {
              onOpenDocuments(visa);
            }}
          />
        ))}
      </tbody>
    </DataTable>
  );
}

type VisaRowProps = { visa: OfficeVisa; selection: RowSelection; onOpenDocuments: () => void };

function VisaRow({ visa, selection, onOpenDocuments }: VisaRowProps) {
  const { student, university, course, assignedCounsellor } = visa;
  return (
    <DataRow opensPage className="hover:bg-fill max-tablet:grid max-tablet:gap-3 max-tablet:p-5">
      <SelectRowCell selection={selection} id={visa.id} name={student.name} />
      <DataCell part="title" shrinks="medium" className={CELL}>
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
      <DataCell part="line" shrinks="large" className={CELL}>
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
      <DataCell label={TEXT.nextAppointment} className={`${CELL} tabular-nums`}>
        <NextAppointment appointment={visa.nextAppointment} />
      </DataCell>
      <DataCell className={CELL}>
        <DocumentsButton
          studentName={student.name}
          documents={visa.documents}
          onOpen={onOpenDocuments}
        />
      </DataCell>
      <DataCell label={TEXT.counsellor} shrinks="small" className={CELL}>
        {assignedCounsellor === null ? (
          <Chip tone="warn">{TEXT.notAssigned}</Chip>
        ) : (
          <OneLine>{assignedCounsellor.name}</OneLine>
        )}
      </DataCell>
    </DataRow>
  );
}

/**
 * Which appointment is next, its day (office calendar) and its time under it; a dash with none
 * booked.
 */
function NextAppointment({ appointment }: { appointment: OfficeVisa["nextAppointment"] }) {
  const dates = useDates();
  if (appointment === null) {
    return (
      <span className="text-ink-3">
        <span aria-hidden="true">—</span>
        <span className="sr-only">{TEXT.noAppointment}</span>
      </span>
    );
  }
  const [day = "", time = ""] = appointment.at.split("T");
  return (
    <span className="max-tablet:inline tablet:block">
      <span className="text-secondary text-ink-2 tablet:block">
        {APPOINTMENT_LABELS[appointment.kind]}
      </span>{" "}
      <span className="tablet:block">{dates.date(day)}</span>{" "}
      <span className="text-secondary text-ink-2 tablet:block">{formatClockTime(time)}</span>
    </span>
  );
}
