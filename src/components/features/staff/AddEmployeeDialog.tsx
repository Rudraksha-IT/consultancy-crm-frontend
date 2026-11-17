"use client";

import { useId, useState, type SubmitEvent } from "react";

import { DateField } from "@/components/ui/DateField";
import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import {
  InvalidFieldsError,
  inviteEmployee,
  type Employee,
  type NewEmployee,
  type NewEmployeeField,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { roleOptions } from "./roles";

type AddEmployeeDialogProps = {
  onClose: () => void;
  onAdded: (employee: Employee) => void;
};

type FieldErrors = Partial<Record<NewEmployeeField, string[]>>;

/** Add an employee; they're emailed a Code and choose their own password (spec 18, 18a). */
export function AddEmployeeDialog({ onClose, onAdded }: AddEmployeeDialogProps) {
  const dates = useDates();
  const formId = useId();
  const { modules } = useCurrentStaff();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function add(employee: NewEmployee): Promise<void> {
    setIsSaving(true);
    setFieldErrors({});
    setError(null);
    try {
      const added = await inviteEmployee(employee);
      showToast(MESSAGES.inviteSent(added.name, added.email));
      onAdded(added);
    } catch (caught) {
      if (caught instanceof InvalidFieldsError) setFieldErrors(caught.fieldErrors);
      else setError(MESSAGES.inviteFailed);
      setIsSaving(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    void add(readEmployee(new FormData(event.currentTarget)));
  }

  return (
    <Dialog
      isOpen
      title={LABELS.addEmployee}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            isLoading={isSaving}
            loadingLabel={LABELS.adding}
          >
            {LABELS.addAndSendCode}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={handleSubmit}
        className="tablet:grid-cols-2 grid gap-5"
      >
        <TextField
          label={LABELS.fullName}
          name="name"
          autoComplete="off"
          errors={fieldErrors.name}
        />
        <TextField
          label={LABELS.mobileNumber}
          name="mobile"
          type="tel"
          autoComplete="off"
          errors={fieldErrors.mobile}
        />
        <TextField
          label={LABELS.workEmail}
          name="email"
          type="email"
          autoComplete="off"
          errors={fieldErrors.email}
        />
        <TextField
          label={LABELS.jobTitle}
          name="jobTitle"
          placeholder={LABELS.jobTitlePlaceholder}
          errors={fieldErrors.jobTitle}
        />
        <SelectField
          label={LABELS.canUseAppAs}
          name="role"
          options={roleOptions(modules)}
          errors={fieldErrors.role}
        />
        <DateField
          label={LABELS.joinedOn}
          name="joinedOn"
          display={dates.display}
          defaultValue={todayIso()}
          errors={fieldErrors.joinedOn}
        />
      </form>
      <p className="text-ink-2">{MESSAGES.inviteExplained}</p>
      {error !== null && <Banner tone="problem">{error}</Banner>}
    </Dialog>
  );
}

function readEmployee(form: FormData): NewEmployee {
  return {
    name: readField(form, "name"),
    mobile: readField(form, "mobile"),
    email: readField(form, "email"),
    jobTitle: readField(form, "jobTitle"),
    role: readField(form, "role"),
    joinedOn: readField(form, "joinedOn"),
  };
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
