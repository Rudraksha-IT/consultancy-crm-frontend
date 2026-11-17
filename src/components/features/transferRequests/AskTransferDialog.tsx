"use client";

import { useId, type SubmitEvent } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { useToast } from "@/components/ui/useToast";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import { askToTakeStudent, type TransferRequest } from "@/lib/api";

import { firstName, transferFailure } from "./transferFailure";

const REASON_ROWS = 3;

type AskTransferDialogProps = {
  student: { id: number; name: string };
  /** The Student's counsellor now; null when they have none. */
  counsellor: string | null;
  onClose: () => void;
  onSent: (request: TransferRequest) => void;
};

/** Ask to take a Student who isn't mine, with the reason (spec 44a). */
export function AskTransferDialog({
  student,
  counsellor,
  onClose,
  onSent,
}: AskTransferDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const { isSaving, fieldErrors, failure, save } = useFormSave(transferFailure);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const reason = readField(new FormData(event.currentTarget), "reason");
    void save(async () => {
      const sent = await askToTakeStudent(student.id, reason);
      showToast(TRANSFER_TEXT.sent(counsellor ?? TRANSFER_TEXT.frontDesk));
      onSent(sent);
    });
  }

  const intro =
    counsellor === null
      ? TRANSFER_TEXT.askIntroUnassigned(student.name, firstName(student.name))
      : TRANSFER_TEXT.askIntroAssigned(student.name, counsellor, firstName(student.name));

  return (
    <SaveDialog
      title={TRANSFER_TEXT.askTitle(student.name)}
      formId={formId}
      saveLabel={TRANSFER_TEXT.send}
      saveIcon="send"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      keysHint="send"
    >
      <p>{intro}</p>
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <TextAreaField
          label={TRANSFER_TEXT.askReasonLabel}
          name="reason"
          rows={REASON_ROWS}
          placeholder={TRANSFER_TEXT.askReasonPlaceholder}
          hint={TRANSFER_TEXT.askReasonHint}
          errors={fieldErrors.reason}
        />
      </form>
    </SaveDialog>
  );
}
