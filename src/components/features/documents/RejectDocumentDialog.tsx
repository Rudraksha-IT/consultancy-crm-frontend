"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, type SubmitEvent } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { checkDocument, InvalidFieldsError, type Checklist } from "@/lib/api";

import { checkFailure } from "./checkFailure";

const REASON_ROWS = 3;

type RejectDocumentDialogProps = {
  studentId: RecordId;
  documentId: RecordId;
  onClose: () => void;
  onRejected: (checklist: Checklist) => void;
};

/** Reject a Document, always with the reason, so the Student can be asked for a new copy. */
export function RejectDocumentDialog(props: RejectDocumentDialogProps) {
  const { studentId, documentId, onClose, onRejected } = props;
  const formId = useId();
  const { isSaving, fieldErrors, failure, save } = useFormSave(checkFailure);
  const reasonErrors = fieldErrors.reason;

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const reason = readField(new FormData(event.currentTarget), "reason").trim();
    void save(async () => {
      if (reason === "") throw new InvalidFieldsError({ reason: [DOCUMENT_TEXT.reasonNeeded] });
      onRejected(await checkDocument(studentId, documentId, { verification: "rejected", reason }));
    });
  }

  return (
    <SaveDialog
      title={DOCUMENT_TEXT.rejectTitle}
      formId={formId}
      saveLabel={DOCUMENT_TEXT.reject}
      saveVariant="danger"
      saveIcon="x"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      keysHint="save"
    >
      <form id={formId} noValidate onSubmit={submit}>
        <TextAreaField
          label={DOCUMENT_TEXT.reason}
          name="reason"
          rows={REASON_ROWS}
          placeholder={DOCUMENT_TEXT.reasonPlaceholder}
          errors={reasonErrors}
        />
      </form>
    </SaveDialog>
  );
}
