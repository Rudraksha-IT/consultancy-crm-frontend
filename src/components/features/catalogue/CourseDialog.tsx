"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type SubmitEvent } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { CATALOGUE_TEXT, CourseLevel } from "@/constants/catalogue";
import { addCourse, type Course } from "@/lib/api";

import { SaveDialog } from "../students/profile/SaveDialog";
import { useFormSave } from "../students/profile/useFormSave";
import { catalogueFailure } from "./catalogueFailure";
import { IntakePicker } from "./IntakePicker";
import { COURSE_LEVEL_OPTIONS } from "./options";
import { RequiredDocuments } from "./RequiredDocuments";
import { useOptionalDocumentTypes } from "./useOptionalDocumentTypes";

type CourseDialogProps = {
  universityId: RecordId;
  onClose: () => void;
  onSaved: (course: Course) => void;
};

/**
 * Add a Course to a University with the same picker as the edit page: name, level, Intakes on
 * a month grid and Required documents as tick boxes (issue 92).
 */
export function CourseDialog({ universityId, onClose, onSaved }: CourseDialogProps) {
  const formId = useId();
  const { isSaving, fieldErrors, failure, save } = useFormSave(catalogueFailure);
  const types = useOptionalDocumentTypes();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<string>(CourseLevel.Bachelor);
  const [intakes, setIntakes] = useState<string[]>([]);
  const [documents, setDocuments] = useState<RecordId[]>([]);
  const [checked, setChecked] = useState<{ name?: string[]; intakes?: string[] }>({});

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = {
      ...(name.trim() === "" && { name: [CATALOGUE_TEXT.enterCourseName] }),
      ...(intakes.length === 0 && { intakes: [CATALOGUE_TEXT.intakesEmpty] }),
    };
    setChecked(found);
    if (Object.keys(found).length > 0) return;
    void save(async () => {
      onSaved(await addCourse(universityId, { name, level, intakes, documents }));
    });
  }

  return (
    <SaveDialog
      title={CATALOGUE_TEXT.addCourseTitle}
      formId={formId}
      saveLabel={CATALOGUE_TEXT.addCourseTitle}
      saveIcon="plus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <div className="tablet:grid-cols-2 grid gap-5">
          <TextField
            label={CATALOGUE_TEXT.courseName}
            name="name"
            autoComplete="off"
            value={name}
            onChange={setName}
            errors={checked.name ?? fieldErrors.name}
          />
          <SelectField
            label={CATALOGUE_TEXT.level}
            name="level"
            options={COURSE_LEVEL_OPTIONS}
            value={level}
            onChange={setLevel}
            errors={fieldErrors.level}
          />
        </div>
        <IntakePicker
          label={CATALOGUE_TEXT.intakes}
          intakes={intakes}
          onChange={setIntakes}
          errors={checked.intakes ?? fieldErrors.intakes}
        />
        <RequiredDocuments
          name="documents"
          types={types}
          ticked={documents}
          onChange={setDocuments}
          errors={fieldErrors.documents}
        />
      </form>
    </SaveDialog>
  );
}
