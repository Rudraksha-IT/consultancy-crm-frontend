"use client";

import { useId, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { DateField } from "@/components/ui/DateField";
import { TextField } from "@/components/ui/TextField";
import { WORK_FROM_HOME_REASON_MAX, WORK_FROM_HOME_TEXT as TEXT } from "@/constants/workFromHome";
import { InvalidFieldsError, type NewWorkFromHome } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { workFromHomeFailure } from "./workFromHomeFailure";

type WorkFromHomeDialogProps = {
  title: string;
  intro: string;
  saveLabel: string;
  onClose: () => void;
  /** Send the dates; a refused field or a failure is shown in the dialog. */
  onSave: (dates: NewWorkFromHome) => Promise<void>;
};

/**
 * Work From Home dates to ask for or set: From (today unless changed), To (empty for no end date)
 * and the reason. Checked here first, then by the server.
 */
export function WorkFromHomeDialog({
  title,
  intro,
  saveLabel,
  onClose,
  onSave,
}: WorkFromHomeDialogProps) {
  const formId = useId();
  const dates = useDates();
  const { isSaving, fieldErrors, failure, save } = useFormSave(workFromHomeFailure);
  const today = todayIso();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const wanted = {
      startsOn: readField(form, "startsOn"),
      endsOn: readField(form, "endsOn"),
      reason: readField(form, "reason").trim(),
    };
    void save(async () => {
      const refused = checked(wanted);
      if (refused !== null) throw refused;
      await onSave(wanted);
    });
  }

  return (
    <SaveDialog
      title={title}
      formId={formId}
      saveLabel={saveLabel}
      saveIcon="home"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <p className="text-ink-2">{intro}</p>
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-4">
        <div className="phone:grid-cols-2 grid gap-4">
          <DateField
            label={TEXT.from}
            name="startsOn"
            display={dates.display}
            min={today}
            defaultValue={today}
            errors={fieldErrors.startsOn}
          />
          <DateField
            label={TEXT.to}
            name="endsOn"
            display={dates.display}
            min={today}
            isOptional
            hint={TEXT.toHint}
            errors={fieldErrors.endsOn}
          />
        </div>
        <TextField
          label={TEXT.reason}
          name="reason"
          placeholder={TEXT.reasonPlaceholder}
          errors={fieldErrors.reason}
        />
      </form>
    </SaveDialog>
  );
}

/** The form's own checks, before anything is sent; null when it can be sent. */
function checked(wanted: NewWorkFromHome): InvalidFieldsError<keyof NewWorkFromHome> | null {
  const found: [keyof NewWorkFromHome, string | null][] = [
    ["startsOn", wanted.startsOn === "" ? TEXT.chooseStart : null],
    ["endsOn", endProblem(wanted)],
    ["reason", reasonProblem(wanted.reason)],
  ];
  const errors: Partial<Record<keyof NewWorkFromHome, string[]>> = {};
  for (const [field, message] of found) if (message !== null) errors[field] = [message];
  return Object.keys(errors).length === 0 ? null : new InvalidFieldsError(errors);
}

function endProblem({ startsOn, endsOn }: NewWorkFromHome): string | null {
  const isBefore = endsOn !== "" && startsOn !== "" && endsOn < startsOn;
  return isBefore ? TEXT.endBeforeStart : null;
}

function reasonProblem(reason: string): string | null {
  if (reason === "") return TEXT.sayWhy;
  return reason.length > WORK_FROM_HOME_REASON_MAX ? TEXT.reasonTooLong : null;
}
