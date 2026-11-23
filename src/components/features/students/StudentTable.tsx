import Link from "next/link";

import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { StageMeter } from "@/components/ui/StageMeter";
import { LABELS } from "@/constants/messages";
import { Priority } from "@/constants/priority";
import { ROUTES } from "@/constants/routes";
import { COUNTRY_LABELS } from "@/constants/students";
import { SelectAllHeader, SelectRowCell } from "@/components/features/exports/SelectionCells";
import type { RowSelection } from "@/components/features/exports/useRowSelection";
import type { StudentRow } from "@/lib/api";

import { PriorityWord } from "./PriorityWord";

type StudentTableProps = {
  students: readonly StudentRow[];
  /** Ticks rows to copy their emails or phones (spec 31a). */
  selection: RowSelection;
};

const HEAD = "text-small text-ink-2 bg-fill px-6 py-3 text-left font-semibold";
const CELL = "px-6 py-4 align-middle max-tablet:p-0";

/**
 * Students with their phone, Priority, Stage, counsellor and where they want to go. Below tablet width
 * each row stacks into a card, so the page never scrolls sideways. On a phone a row is the name,
 * where they want to go and the Stage, with an arrow to their page.
 */
export function StudentTable({ students, selection }: StudentTableProps) {
  return (
    <DataTable phone="list" stacksBelowTablet>
      <thead className="max-tablet:sr-only">
        <tr>
          <SelectAllHeader selection={selection} />
          <th scope="col" className={HEAD}>
            {LABELS.student}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.priority}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.stage}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.counsellor}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.goingTo}
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {students.map((student) => (
          <StudentTableRow key={student.id} student={student} selection={selection} />
        ))}
      </tbody>
    </DataTable>
  );
}

function StudentTableRow({ student, selection }: { student: StudentRow; selection: RowSelection }) {
  return (
    <DataRow opensPage className="hover:bg-fill max-tablet:grid max-tablet:gap-3 max-tablet:p-5">
      <SelectRowCell selection={selection} id={student.id} name={student.name} />
      <DataCell part="title" shrinks className={CELL}>
        <Link
          href={ROUTES.student(student.id)}
          className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
        >
          <OneLine>{student.name}</OneLine>
        </Link>
        {student.priority === Priority.High && (
          <span className="phone:hidden ml-2 align-middle">
            <Chip tone="bad" icon="arrowUp">
              {LABELS.highPriority}
            </Chip>
          </span>
        )}
        <div className="text-secondary text-ink-2 max-phone:hidden tabular-nums">
          {student.phone}
        </div>
      </DataCell>
      <DataCell label={LABELS.priority} className={CELL}>
        <span data-testid="priority" className="text-ink">
          <PriorityWord priority={student.priority} />
        </span>
      </DataCell>
      <DataCell part="fact" className={CELL}>
        <StageMeter stage={student.stage} />
      </DataCell>
      <DataCell className={CELL}>
        {student.assignedCounsellor === null ? (
          <Chip tone="warn">{LABELS.notAssigned}</Chip>
        ) : (
          student.assignedCounsellor.name
        )}
      </DataCell>
      <DataCell part="line" label={LABELS.goingTo} className={CELL}>
        {COUNTRY_LABELS[student.country]}
      </DataCell>
    </DataRow>
  );
}
