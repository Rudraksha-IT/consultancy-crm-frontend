"use client";

import { useId, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { addStudent, InvalidFieldsError, type NewStudent, type Student } from "@/lib/api";

import { useCounsellorChoices } from "./useCounsellorChoices";
import { VisitorForm, type VisitorFieldErrors } from "./VisitorForm";

type AddVisitorDialogProps = {
  onClose: () => void;
  onAdded: (student: Student) => void;
};

/** Add a new visitor as a Lead, optionally handing them straight to a Counsellor. */
export function AddVisitorDialog({ onClose, onAdded }: AddVisitorDialogProps) {
  const formId = useId();
  const counsellors = useCounsellorChoices();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<VisitorFieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  async function save(visitor: NewStudent): Promise<void> {
    setIsSaving(true);
    setFieldErrors({});
    setError(null);
    try {
      const added = await addStudent(visitor);
      showToast(MESSAGES.visitorSaved);
      onAdded(added);
    } catch (caught) {
      if (caught instanceof InvalidFieldsError) setFieldErrors(caught.fieldErrors);
      else setError(MESSAGES.saveVisitorFailed);
      setIsSaving(false);
    }
  }

  return (
    <SubmitKeysScope>
      <Dialog
        isOpen
        title={LABELS.addVisitor}
        onClose={onClose}
        footer={
          <>
            <SubmitKeysHint action="save" />
            <Button onClick={onClose}>{LABELS.cancel}</Button>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              icon="check"
              isLoading={isSaving}
              loadingLabel={LABELS.saving}
            >
              {LABELS.saveVisitor}
            </Button>
          </>
        }
      >
        <VisitorForm
          id={formId}
          counsellors={counsellors}
          fieldErrors={fieldErrors}
          onSubmit={(visitor) => void save(visitor)}
        />
        {error !== null && <Banner tone="problem">{error}</Banner>}
      </Dialog>
    </SubmitKeysScope>
  );
}
