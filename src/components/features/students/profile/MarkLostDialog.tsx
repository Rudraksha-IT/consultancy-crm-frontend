"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, type SubmitEvent } from "react";

import { TextAreaField } from "@/components/ui/TextAreaField";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Stage } from "@/constants/stages";
import { setStage, type StudentProfile } from "@/lib/api";

import { readField } from "./formData";
import { SaveDialog } from "./SaveDialog";
import { useFormSave } from "./useFormSave";

const REASON_ROWS = 3;

type MarkLostDialogProps = {
  studentId: RecordId;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
};

/** Mark a Student Lost, always with the reason (spec 39). */
export function MarkLostDialog({ studentId, onClose, onSaved }: MarkLostDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const { isSaving, fieldErrors, failure, save } = useFormSave();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const lostReason = readField(new FormData(event.currentTarget), "lostReason");
    void save(async () => {
      const saved = await setStage(studentId, { stage: Stage.Lost, lostReason });
      showToast(MESSAGES.markedLost);
      onSaved(saved);
    });
  }

  return (
    <SaveDialog
      title={LABELS.markAsLost}
      formId={formId}
      saveLabel={LABELS.markLost}
      saveVariant="danger"
      saveIcon="x"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      keysHint="save"
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <TextAreaField
          label={LABELS.whyLost}
          name="lostReason"
          rows={REASON_ROWS}
          placeholder={MESSAGES.lostReasonPlaceholder}
          hint={MESSAGES.lostReasonHint}
          errors={fieldErrors.lostReason ?? fieldErrors.stage}
        />
      </form>
    </SaveDialog>
  );
}
