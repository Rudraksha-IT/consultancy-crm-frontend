"use client";

import type { RecordId } from "@/lib/recordId";
import { useRef, useState, type ReactNode, type RefObject } from "react";

import { WorkingHoursTab } from "@/components/features/clock/WorkingHoursTab";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Loading } from "@/components/ui/Loading";
import { CLOCK_TEXT } from "@/constants/clock";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role, ROLE_LABELS } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { useFocusAfterChange } from "@/hooks/useFocusAfterChange";
import { StaffStatus, type Employee } from "@/lib/api";

import { AddEmployeeDialog } from "./AddEmployeeDialog";
import { inEmployeesOrder } from "./employeeOrder";
import { EMPLOYEE_ACTIONS_ATTRIBUTE, EmployeeTable } from "./EmployeeTable";
import { ManageEmployeeDialog } from "./ManageEmployeeDialog";
import { useEmployees, type EmployeeListState } from "./useEmployees";
import { inviteFailureOf, useInviteActions } from "./useInviteActions";

type OpenDialog =
  | { kind: "add" }
  | { kind: "manage"; employee: Employee }
  | { kind: "cancelInvite"; employee: Employee }
  | { kind: "inviteBack"; employee: Employee }
  | null;

/** Which part of Employees is open: the people, or (with Clock-in) their working hours. */
export type EmployeesTab = "people" | "hours";

/**
 * The office's Employees, for Admins: add, change Role, deactivate, and pending invites. With
 * Clock-in on, a Working hours tab beside them (issue 56); `?tab=hours` opens it.
 */
export function EmployeesPage({ initialTab = "people" }: { initialTab?: EmployeesTab }) {
  const { staff, modules } = useCurrentStaff();
  const [tab, setTab] = useState<EmployeesTab>(initialTab);
  if (staff.role !== Role.Admin) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  if (!modules.includes(Module.ClockIn)) return <AdminEmployeesPage myId={staff.id} />;
  const tabs = (
    <SegmentedControl
      label={CLOCK_TEXT.show}
      options={[
        { value: "people", label: CLOCK_TEXT.people },
        { value: "hours", label: CLOCK_TEXT.workingHours },
      ]}
      value={tab}
      onChange={setTab}
    />
  );
  // One page for both tabs: the strip stays where it is and keeps the cursor, and the people
  // are not read again on the way back (design system rule 8).
  return <AdminEmployeesPage myId={staff.id} tabs={tabs} showsHours={tab === "hours"} />;
}

type PeopleProps = {
  areaRef: RefObject<HTMLDivElement | null>;
  myId: RecordId;
  employees: ReturnType<typeof useEmployees>;
  invites: ReturnType<typeof useInviteActions>;
  onOpen: (dialog: OpenDialog) => void;
};

/** The People tab's body: what went wrong with an invite, then everyone in the Employees order. */
function People({ areaRef, myId, employees, invites, onOpen }: PeopleProps) {
  return (
    <>
      {invites.error !== null && <Banner tone="problem">{invites.error}</Banner>}
      <div ref={areaRef}>
        <ListContent
          list={employees.list}
          render={(list) => (
            <EmployeeTable
              employees={inEmployeesOrder(list)}
              myId={myId}
              busyId={invites.busyId}
              onManage={(employee) => {
                onOpen({ kind: "manage", employee });
              }}
              onResend={(employee) => void invites.resend(employee)}
              onCancelInvite={(employee) => {
                onOpen({ kind: "cancelInvite", employee });
              }}
              onInviteBack={(employee) => {
                onOpen({ kind: "inviteBack", employee });
              }}
            />
          )}
        />
      </div>
    </>
  );
}

type AdminEmployeesPageProps = { myId: RecordId; tabs?: ReactNode; showsHours?: boolean };

function AdminEmployeesPage({ myId, tabs, showsHours = false }: AdminEmployeesPageProps) {
  const employees = useEmployees();
  const invites = useInviteActions(employees);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const focusAfterChange = useFocusAfterChange();
  const close = () => {
    setDialog(null);
  };
  // The button that was pressed is gone once the row changes, so the cursor goes to the first
  // button now on that employee's row (design system rule 8).
  const changeInvite = async (
    employee: Employee,
    change: (employee: Employee) => Promise<void>,
  ) => {
    await change(employee);
    close();
    focusAfterChange(() => rowActions(areaRef.current, employee.id));
  };

  return (
    <>
      <PageHeader
        title={LABELS.employees}
        subtitle={showsHours ? CLOCK_TEXT.workingHoursIntro : subtitleOf(employees.list)}
        actions={
          showsHours ? undefined : (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                setDialog({ kind: "add" });
              }}
            >
              {LABELS.addEmployee}
            </Button>
          )
        }
      />
      {tabs}
      {showsHours ? (
        <WorkingHoursTab />
      ) : (
        <People
          areaRef={areaRef}
          myId={myId}
          employees={employees}
          invites={invites}
          onOpen={setDialog}
        />
      )}
      <EmployeeDialog
        dialog={dialog}
        onClose={close}
        onAdded={employees.add}
        onSaved={employees.replace}
        onCancelInvite={(employee) => changeInvite(employee, invites.cancel)}
        onInviteBack={(employee) => changeInvite(employee, invites.inviteBack)}
      />
    </>
  );
}

type EmployeeDialogProps = {
  dialog: OpenDialog;
  onClose: () => void;
  onAdded: (employee: Employee) => void;
  onSaved: (employee: Employee) => void;
  /** Does it and closes the popup. Rejects when it failed. */
  onCancelInvite: (employee: Employee) => Promise<void>;
  /** Does it and closes the popup. Rejects when it failed. */
  onInviteBack: (employee: Employee) => Promise<void>;
};

/** The first button now on that employee's row. */
function rowActions(area: HTMLElement | null, id: RecordId): HTMLElement | null {
  return area?.querySelector<HTMLElement>(`[${EMPLOYEE_ACTIONS_ATTRIBUTE}="${id}"] button`) ?? null;
}

/** The open dialog, if any; each closes itself once its change is saved. */
function EmployeeDialog(props: EmployeeDialogProps) {
  const { dialog, onClose, onAdded, onSaved, onCancelInvite, onInviteBack } = props;
  if (dialog === null) return null;
  if (dialog.kind === "cancelInvite") {
    const { employee } = dialog;
    return (
      <ConfirmDialog
        title={MESSAGES.cancelInviteTitle(employee.name)}
        actionLabel={LABELS.cancelInvite}
        onClose={onClose}
        onConfirm={() => onCancelInvite(employee)}
        failureOf={() => MESSAGES.employeeChangeFailed}
      >
        {MESSAGES.cancelInviteBody}
      </ConfirmDialog>
    );
  }
  if (dialog.kind === "inviteBack") {
    const { employee } = dialog;
    return (
      <ConfirmDialog
        title={MESSAGES.inviteBackTitle(employee.name)}
        actionLabel={LABELS.sendTheCode}
        actionVariant="primary"
        onClose={onClose}
        onConfirm={() => onInviteBack(employee)}
        failureOf={inviteFailureOf}
      >
        {MESSAGES.inviteBackBody(employee.email, ROLE_LABELS[employee.role])}
      </ConfirmDialog>
    );
  }
  if (dialog.kind === "add") {
    return (
      <AddEmployeeDialog
        onClose={onClose}
        onAdded={(employee) => {
          onAdded(employee);
          onClose();
        }}
      />
    );
  }
  return (
    <ManageEmployeeDialog
      employee={dialog.employee}
      onClose={onClose}
      onSaved={(employee) => {
        onSaved(employee);
        onClose();
      }}
    />
  );
}

function subtitleOf(list: EmployeeListState): string | undefined {
  if (list.status !== "loaded") return undefined;
  const active = list.employees.filter((e) => e.status === StaffStatus.Active).length;
  return MESSAGES.employeesIntro(active);
}

type ListContentProps = {
  list: EmployeeListState;
  render: (employees: Employee[]) => ReactNode;
};

function ListContent({ list, render }: ListContentProps) {
  if (list.status === "loading") return <Loading />;
  if (list.status === "failed") return <Banner tone="problem">{MESSAGES.employeesFailed}</Banner>;
  return (
    <Panel>
      {list.employees.length === 0 ? (
        <EmptyState>{MESSAGES.noEmployees}</EmptyState>
      ) : (
        render(list.employees)
      )}
    </Panel>
  );
}
