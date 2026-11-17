"use client";

import { useId, useState, type SubmitEvent } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { StudentFinder, type StudentChoice } from "@/components/features/tasks/StudentFinder";
import { Banner } from "@/components/ui/Banner";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { BATCH_TEXT, BatchTiming } from "@/constants/batches";
import { MESSAGES } from "@/constants/messages";
import { addStudentToBatch, type Batch } from "@/lib/api";

import { ENROLL_LABELS } from "./finderLabels";

type EnrollDialogProps = {
  classes: readonly Batch[];
  onClose: () => void;
  onEnrolled: () => void;
};

/** Enroll a Student in a class: find the Student, choose a running or upcoming class (spec 84). */
export function EnrollDialog({ classes, onClose, onEnrolled }: EnrollDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const [student, setStudent] = useState<StudentChoice | null>(null);
  const [missingStudent, setMissingStudent] = useState(false);
  const { isSaving, fieldErrors, failure, save } = useFormSave(() => MESSAGES.saveFailed);
  const open = classes.filter((batch) => batch.timing !== BatchTiming.Finished);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const chosen = open.find(
      (batch) => String(batch.id) === readField(new FormData(event.currentTarget), "class"),
    );
    setMissingStudent(student === null);
    if (student === null || chosen === undefined) return;
    void save(async () => {
      await addStudentToBatch(chosen.id, student.id);
      showToast(BATCH_TEXT.enrolled(student.name, chosen.name));
      onEnrolled();
    });
  }

  return (
    <SaveDialog
      title={BATCH_TEXT.enrollTitle}
      formId={formId}
      saveLabel={BATCH_TEXT.enrollButton}
      saveIcon="userplus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <StudentFinder
          value={student}
          onChange={setStudent}
          errors={missingStudent ? [BATCH_TEXT.chooseStudentFirst] : fieldErrors.studentId}
          labels={ENROLL_LABELS}
          isRequired
          excludesLost
        />
        {open.length === 0 ? (
          <Banner tone="warning">{BATCH_TEXT.noClassToEnroll}</Banner>
        ) : (
          <SelectField
            label={BATCH_TEXT.class}
            name="class"
            options={open.map((batch) => ({
              value: String(batch.id),
              label: BATCH_TEXT.classWithSlot(batch.name, batch.timeSlot),
            }))}
          />
        )}
      </form>
    </SaveDialog>
  );
}
