"use client";

import { useId, useState } from "react";

import { useCounsellorChoices } from "@/components/features/students/useCounsellorChoices";
import { VisitorForm, type VisitorFieldErrors } from "@/components/features/students/VisitorForm";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Panel } from "@/components/ui/Panel";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import { useToast } from "@/components/ui/useToast";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { VISIT_TEXT } from "@/constants/visits";
import { addStudent, InvalidFieldsError, type NewStudent, type Student } from "@/lib/api";

/**
 * The new-visitor form on the visitor desk (spec 23-26). Saving adds them as a Lead and logs their
 * first Visit (the server does both); the form then clears for the next visitor.
 */
export function NewVisitorPanel({ onSaved }: { onSaved: () => void }) {
  const formId = useId();
  const counsellors = useCounsellorChoices();
  const { showToast } = useToast();
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<VisitorFieldErrors>({});
  const [error, setError] = useState<string | null>(null);

  function clear(): void {
    setFormKey((current) => current + 1);
    setFieldErrors({});
    setError(null);
  }

  async function save(visitor: NewStudent): Promise<void> {
    setIsSaving(true);
    setFieldErrors({});
    setError(null);
    try {
      const added = await addStudent(visitor);
      showToast(MESSAGES.visitorSaved);
      setSaved(added);
      clear();
      onSaved();
    } catch (caught) {
      if (caught instanceof InvalidFieldsError) setFieldErrors(caught.fieldErrors);
      else setError(MESSAGES.saveVisitorFailed);
    }
    setIsSaving(false);
  }

  return (
    <>
      {saved !== null && (
        <Banner
          tone="info"
          icon="check"
          action={
            <ButtonLink href={ROUTES.student(saved.id)} size="sm">
              {VISIT_TEXT.openTheirPage}
            </ButtonLink>
          }
        >
          {VISIT_TEXT.savedAsNew(saved.name)}
        </Banner>
      )}
      <SubmitKeysScope>
        <Panel isPadded>
          <VisitorForm
            key={formKey}
            id={formId}
            counsellors={counsellors}
            fieldErrors={fieldErrors}
            onSubmit={(visitor) => void save(visitor)}
          />
          {error !== null && <Banner tone="problem">{error}</Banner>}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              form={formId}
              variant="primary"
              size="lg"
              icon="check"
              isLoading={isSaving}
              loadingLabel={LABELS.saving}
            >
              {LABELS.saveVisitor}
            </Button>
            <Button variant="ghost" onClick={clear}>
              {VISIT_TEXT.clearTheForm}
            </Button>
            <SubmitKeysHint action="save" />
          </div>
        </Panel>
      </SubmitKeysScope>
    </>
  );
}
