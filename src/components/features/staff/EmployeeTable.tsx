import type { RecordId } from "@/lib/recordId";

import Link from "next/link";

import { useDates } from "@/components/features/shell/dateDisplay";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DataCell, DataRow, DataTable } from "@/components/ui/DataTable";
import { OneLine } from "@/components/ui/OneLine";
import { LABELS } from "@/constants/messages";
import { ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { StaffStatus, type Employee } from "@/lib/api";

import { EmployeeTwoFactorChip } from "./EmployeeTwoFactor";

type EmployeeTableProps = {
  employees: readonly Employee[];
  /** The logged-in Admin, who can't manage themselves. */
  myId: RecordId;
  busyId: RecordId | null;
  onManage: (employee: Employee) => void;
  onResend: (employee: Employee) => void;
  onCancelInvite: (employee: Employee) => void;
};

const HEAD = "text-small text-ink-2 bg-fill px-5 py-3 text-left font-semibold";
const CELL = "px-5 py-4 align-middle max-tablet:p-0";

/**
 * The office's staff list: who, how to reach them, their Role and since when. Below tablet width
 * each row stacks into a card, so the page never scrolls sideways. On a phone a row is the name,
 * the job title and Manage; an invited person's two buttons go on their own line.
 */
export function EmployeeTable(props: EmployeeTableProps) {
  return (
    <DataTable phone="list" stacksBelowTablet>
      <thead className="max-tablet:sr-only">
        <tr>
          <th scope="col" className={HEAD}>
            {LABELS.employee}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.contact}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.canUseAppAs}
          </th>
          <th scope="col" className={HEAD}>
            {LABELS.joined}
          </th>
          <th scope="col" className={HEAD}>
            <span className="sr-only">{LABELS.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-rule divide-y">
        {props.employees.map((employee) => (
          <EmployeeRow key={employee.id} employee={employee} {...props} />
        ))}
      </tbody>
    </DataTable>
  );
}

type EmployeeRowProps = Omit<EmployeeTableProps, "employees"> & { employee: Employee };

function EmployeeRow({ employee, ...props }: EmployeeRowProps) {
  const dates = useDates();
  return (
    <DataRow className="max-tablet:grid max-tablet:gap-3 max-tablet:p-5">
      <DataCell part="title" shrinks className={CELL}>
        <div className="flex items-center gap-3.5">
          <Avatar name={employee.name} />
          <div className="min-w-0">
            {employee.status === StaffStatus.Invited ? (
              <OneLine block className="font-semibold">
                {employee.name}
              </OneLine>
            ) : (
              <Link
                href={ROUTES.employee(employee.id)}
                className="text-ink hover:text-accent min-h-control inline-flex max-w-full items-center font-semibold underline-offset-4 hover:underline"
              >
                <OneLine>{employee.name}</OneLine>
              </Link>
            )}
            <OneLine block className="text-secondary text-ink-2">
              {employee.jobTitle}
            </OneLine>
          </div>
        </div>
      </DataCell>
      <DataCell shrinks className={CELL}>
        <div className="tabular-nums">{employee.mobile}</div>
        <OneLine block className="text-secondary text-ink-2">
          {employee.email}
        </OneLine>
      </DataCell>
      <DataCell className={CELL}>
        <div>{ROLE_LABELS[employee.role]}</div>
        <StatusChip status={employee.status} />
        {employee.status !== StaffStatus.Deactivated && (
          <EmployeeTwoFactorChip employee={employee} />
        )}
      </DataCell>
      <DataCell label={LABELS.joined} className={`${CELL} text-ink-2 whitespace-nowrap`}>
        {dates.date(employee.joinedOn)}
      </DataCell>
      <DataCell
        part={employee.status === StaffStatus.Invited ? "actions" : "action"}
        className={`${CELL} tablet:text-right`}
      >
        <RowActions employee={employee} {...props} />
      </DataCell>
    </DataRow>
  );
}

function StatusChip({ status }: { status: StaffStatus }) {
  if (status === StaffStatus.Active) return null;
  return (
    <div className="mt-1.5">
      {status === StaffStatus.Invited ? (
        <Chip tone="warn">{LABELS.invitedNotJoined}</Chip>
      ) : (
        <Chip tone="muted">{LABELS.hasLeft}</Chip>
      )}
    </div>
  );
}

function RowActions({
  employee,
  myId,
  busyId,
  onManage,
  onResend,
  onCancelInvite,
}: EmployeeRowProps) {
  const isBusy = busyId === employee.id;
  if (employee.status === StaffStatus.Invited) {
    return (
      <span
        role="group"
        aria-label={LABELS.employeeActions(employee.name)}
        className="inline-flex flex-wrap gap-2"
      >
        <Button
          isDisabled={isBusy}
          onClick={() => {
            onResend(employee);
          }}
        >
          {LABELS.sendCodeAgain}
        </Button>
        <Button
          variant="danger"
          isDisabled={isBusy}
          onClick={() => {
            onCancelInvite(employee);
          }}
        >
          {LABELS.cancelInvite}
        </Button>
      </span>
    );
  }
  if (employee.status === StaffStatus.Deactivated || employee.id === myId) return null;
  return (
    <Button
      onClick={() => {
        onManage(employee);
      }}
    >
      <span aria-hidden="true">{LABELS.manage}</span>
      <span className="sr-only">{LABELS.manageEmployee(employee.name)}</span>
    </Button>
  );
}
