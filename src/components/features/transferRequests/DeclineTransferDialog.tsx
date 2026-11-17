"use client";

import { useId, type SubmitEvent } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { useToast } from "@/components/ui/useToast";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import { declineTransferRequest, type TransferRequest } from "@/lib/api";

import { firstName, transferFailure } from "./transferFailure";

const REASON_ROWS = 3;

type DeclineTransferDialogProps = {
  request: TransferRequest;
  onClose: () => void;
  onDone: (request: TransferRequest) => void;
};

/** Decline a request, with an optional reason the asker sees (spec 44b). */
export function DeclineTransferDialog({ request, onClose, onDone }: DeclineTransferDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const { isSaving, fieldErrors, failure, save } = useFormSave(transferFailure);
  const asker = request.askedBy.name;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const reason = readField(new FormData(event.currentTarget), "reason");
    void save(async () => {
      const declined = await declineTransferRequest(request.id, reason);
      showToast(TRANSFER_TEXT.declined);
      onDone(declined);
    });
  }

  return (
    <SaveDialog
      title={TRANSFER_TEXT.declineTitle(asker)}
      formId={formId}
      saveLabel={TRANSFER_TEXT.decline}
      saveVariant="danger"
      saveIcon="x"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      keysHint="save"
    >
      <p>{TRANSFER_TEXT.declineStays(request.student.name, request.counsellor?.name ?? null)}</p>
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <TextAreaField
          label={TRANSFER_TEXT.declineReasonLabel}
          name="reason"
          rows={REASON_ROWS}
          placeholder={TRANSFER_TEXT.declineReasonPlaceholder}
          hint={TRANSFER_TEXT.declineReasonHint(firstName(asker))}
          errors={fieldErrors.reason}
        />
      </form>
    </SaveDialog>
  );
}
