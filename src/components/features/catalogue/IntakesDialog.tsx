"use client";

import { useId, useState, type SubmitEvent } from "react";

import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { setCourseIntakes, type Course } from "@/lib/api";

import { SaveDialog } from "../students/profile/SaveDialog";
import { useFormSave } from "../students/profile/useFormSave";
import { catalogueFailure } from "./catalogueFailure";
import { IntakePicker } from "./IntakePicker";

type IntakesDialogProps = {
  course: Course;
  onClose: () => void;
  onSaved: (course: Course) => void;
};

/** "+ Add intake" on the Catalogue: the Course's Intakes on the month grid (issue 92). */
export function IntakesDialog({ course, onClose, onSaved }: IntakesDialogProps) {
  const formId = useId();
  const { isSaving, failure, save } = useFormSave(catalogueFailure);
  const [intakes, setIntakes] = useState<string[]>(course.intakes);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const isEmpty = intakes.length === 0;
    setError(isEmpty ? CATALOGUE_TEXT.keepOneIntake : null);
    if (isEmpty) return;
    void save(async () => {
      onSaved(await setCourseIntakes(course.id, intakes));
    });
  }

  return (
    <SaveDialog
      title={CATALOGUE_TEXT.intakesTitle(course.name)}
      formId={formId}
      saveLabel={CATALOGUE_TEXT.saveIntakes}
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <p className="text-ink-2">{CATALOGUE_TEXT.intakesLead}</p>
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <IntakePicker
          label={CATALOGUE_TEXT.intakes}
          intakes={intakes}
          onChange={setIntakes}
          errors={error === null ? undefined : [error]}
        />
      </form>
    </SaveDialog>
  );
}
