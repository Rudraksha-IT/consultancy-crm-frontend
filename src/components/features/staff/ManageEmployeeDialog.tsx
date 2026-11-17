"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { PlatformAdminActions } from "@/components/features/supportAccess/PlatformAdminActions";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROLE_LABELS, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { STAGE_LABELS } from "@/constants/stages";
import {
  changeEmployeeRole,
  deactivateEmployee,
  fetchAssignedStudents,
  setEmployeeTwoFactor,
  StaffStatus,
  type AssignedStudent,
  type Employee,
} from "@/lib/api";

import { ResetTwoFactorDialog } from "./EmployeeTwoFactor";
import { isRole, roleOptions } from "./roles";
import { useSave } from "./useSave";

type ManageEmployeeDialogProps = {
  employee: Employee;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
};

/**
 * Change someone's Role and two-step login, reset their two-step login, or deactivate them once
 * they've left (spec 19, 20; issue 62). A Platform Admin inside the office can also send them a
 * reset Code or sign them out (issue 27).
 */
export function ManageEmployeeDialog({ employee, onClose, onSaved }: ManageEmployeeDialogProps) {
  const [confirming, setConfirming] = useState<"deactivate" | "resetTwoFactor" | null>(null);
  if (confirming === "deactivate") {
    return <DeactivateDialog employee={employee} onClose={onClose} onSaved={onSaved} />;
  }
  if (confirming === "resetTwoFactor") {
    return <ResetTwoFactorDialog employee={employee} onClose={onClose} onSaved={onSaved} />;
  }
  return (
    <RoleDialog employee={employee} onClose={onClose} onSaved={onSaved} onConfirm={setConfirming} />
  );
}

type RoleDialogProps = ManageEmployeeDialogProps & {
  onConfirm: (which: "deactivate" | "resetTwoFactor") => void;
};

/**
 * Role and two-step login, applied together with Save; deactivating and resetting two-step login
 * are confirmed in their own dialog.
 */
function RoleDialog({ employee, onClose, onSaved, onConfirm }: RoleDialogProps) {
  const { modules, supportAccess } = useCurrentStaff();
  const { showToast } = useToast();
  const [role, setRole] = useState<Role>(employee.role);
  const [isTwoFactorOn, setIsTwoFactorOn] = useState(employee.twoFactorRequired);
  const save = useSave();
  const firstName = employee.name.split(/\s+/)[0] ?? employee.name;

  function submit(): Promise<void> {
    const changes = { role, isTwoFactorOn };
    if (!hasChanges(employee, changes)) {
      onClose();
      return Promise.resolve();
    }
    return save.run(async () => {
      onSaved(await saveChanges(employee, changes, showToast));
    });
  }

  return (
    <Dialog
      isOpen
      title={LABELS.manageEmployee(employee.name)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            variant="primary"
            isLoading={save.isSaving}
            loadingLabel={LABELS.saving}
            onClick={() => void submit()}
          >
            {LABELS.save}
          </Button>
        </>
      }
    >
      {supportAccess !== null && employee.status === StaffStatus.Active && (
        <PlatformAdminActions employee={employee} />
      )}
      <SelectField
        label={LABELS.role}
        name="role"
        hint={MESSAGES.roleHint}
        options={roleOptions(modules, employee.role)}
        value={role}
        onChange={(value) => {
          if (isRole(value)) setRole(value);
        }}
      />
      <TwoFactorFields
        employee={employee}
        firstName={firstName}
        isOn={isTwoFactorOn}
        onChange={setIsTwoFactorOn}
        onReset={() => {
          onConfirm("resetTwoFactor");
        }}
      />
      <Banner
        tone="neutral"
        action={
          <Button
            variant="danger"
            onClick={() => {
              onConfirm("deactivate");
            }}
          >
            {LABELS.deactivate}
          </Button>
        }
      >
        {MESSAGES.deactivateExplained(firstName)}
      </Banner>
      {save.error !== null && <Banner tone="problem">{save.error}</Banner>}
    </Dialog>
  );
}

type TwoFactorFieldsProps = {
  employee: Employee;
  firstName: string;
  isOn: boolean;
  onChange: (isOn: boolean) => void;
  onReset: () => void;
};

/** Their two-step login switch, and a reset once they have an app set up (issue 62). */
function TwoFactorFields({ employee, firstName, isOn, onChange, onReset }: TwoFactorFieldsProps) {
  return (
    <>
      <Switch
        label={LABELS.twoStepLogin}
        description={MESSAGES.twoFactorSwitchHint}
        isOn={isOn}
        onChange={onChange}
      />
      {employee.twoFactorSetUp && (
        <Banner
          tone="neutral"
          action={<Button onClick={onReset}>{LABELS.resetTwoStepLogin}</Button>}
        >
          {MESSAGES.twoFactorResetExplained(firstName)}
        </Banner>
      )}
    </>
  );
}

type Changes = { role: Role; isTwoFactorOn: boolean };

function hasChanges(employee: Employee, changes: Changes): boolean {
  return changes.role !== employee.role || changes.isTwoFactorOn !== employee.twoFactorRequired;
}

/** Save what changed, the Role first, each with its own toast; return the employee as stored. */
async function saveChanges(
  employee: Employee,
  changes: Changes,
  showToast: (message: string) => void,
): Promise<Employee> {
  let saved = employee;
  if (changes.role !== employee.role) {
    saved = await changeEmployeeRole(employee.id, changes.role);
    showToast(MESSAGES.roleChanged(saved.name, ROLE_LABELS[saved.role]));
  }
  if (changes.isTwoFactorOn !== employee.twoFactorRequired) {
    saved = await setEmployeeTwoFactor(employee.id, changes.isTwoFactorOn);
    showToast(MESSAGES.twoFactorSwitched(saved.name, saved.twoFactorRequired));
  }
  return saved;
}

type AssignedCheck =
  { status: "loading" } | { status: "loaded"; students: AssignedStudent[] } | { status: "failed" };

/** The Students someone still counsels, checked when their deactivation is being confirmed. */
function useAssignedStudents(staffId: number): AssignedCheck {
  const [check, setCheck] = useState<AssignedCheck>({ status: "loading" });
  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const students = await fetchAssignedStudents(staffId);
        if (!isCancelled) setCheck({ status: "loaded", students });
      } catch {
        if (!isCancelled) setCheck({ status: "failed" });
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [staffId]);
  return check;
}

function DeactivateDialog({ employee, onClose, onSaved }: ManageEmployeeDialogProps) {
  const { showToast } = useToast();
  const save = useSave();
  const check = useAssignedStudents(employee.id);
  const firstName = employee.name.split(/\s+/)[0] ?? employee.name;

  function confirm(): Promise<void> {
    return save.run(async () => {
      const saved = await deactivateEmployee(employee.id);
      showToast(MESSAGES.staffDeactivated);
      onSaved(saved);
    });
  }

  return (
    <Dialog
      isOpen
      title={LABELS.deactivateEmployee(employee.name)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <DeactivateButton check={check} isSaving={save.isSaving} onClick={() => void confirm()} />
        </>
      }
    >
      <p>{MESSAGES.deactivateWarning}</p>
      <AssignedWarning check={check} firstName={firstName} />
      {save.error !== null && <Banner tone="problem">{save.error}</Banner>}
    </Dialog>
  );
}

type DeactivateButtonProps = { check: AssignedCheck; isSaving: boolean; onClick: () => void };

/** Waits for the check of assigned Students; says "anyway" when some are still assigned. */
function DeactivateButton({ check, isSaving, onClick }: DeactivateButtonProps) {
  const isChecking = check.status === "loading";
  const hasStudents = check.status === "loaded" && check.students.length > 0;
  return (
    <Button
      variant="danger"
      isLoading={isSaving || isChecking}
      loadingLabel={isChecking ? LABELS.checking : LABELS.deactivating}
      onClick={onClick}
    >
      {hasStudents ? LABELS.deactivateAnyway : LABELS.deactivate}
    </Button>
  );
}

/** The Students still assigned to someone, to Transfer before they leave (spec 21). */
function AssignedWarning({ check, firstName }: { check: AssignedCheck; firstName: string }) {
  if (check.status === "failed") {
    return <Banner tone="warning">{MESSAGES.assignedCheckFailed}</Banner>;
  }
  if (check.status === "loading" || check.students.length === 0) return null;
  return (
    <Banner tone="warning" icon="users">
      <div className="grid gap-1">
        <b>{MESSAGES.stillAssigned(check.students.length, firstName)}</b>
        <span className="text-small">{MESSAGES.transferThemFirst}</span>
        <ul className="mt-1 list-disc pl-5">
          {check.students.map((student) => (
            <li key={student.id}>
              <Link
                href={ROUTES.student(student.id)}
                className="min-h-control inline-flex items-center underline underline-offset-4"
              >
                {student.name}
              </Link>
              {`, ${STAGE_LABELS[student.stage]}`}
            </li>
          ))}
        </ul>
      </div>
    </Banner>
  );
}
