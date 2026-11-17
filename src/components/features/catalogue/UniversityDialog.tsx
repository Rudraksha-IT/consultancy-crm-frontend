"use client";

import { useId, type SubmitEvent } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { CATALOGUE_TEXT } from "@/constants/catalogue";
import { Country } from "@/constants/students";
import { addUniversity, type University, type UniversityInput } from "@/lib/api";

import { readField } from "../students/profile/formData";
import { SaveDialog } from "../students/profile/SaveDialog";
import { useFormSave } from "../students/profile/useFormSave";
import { catalogueFailure } from "./catalogueFailure";
import { UNIVERSITY_COUNTRY_OPTIONS } from "./options";

type UniversityDialogProps = {
  onClose: () => void;
  onSaved: (university: University) => void;
};

/** Add a University (spec 46); it is changed later on its edit page (issue 92). */
export function UniversityDialog({ onClose, onSaved }: UniversityDialogProps) {
  const formId = useId();
  const { isSaving, fieldErrors, failure, save } = useFormSave(catalogueFailure);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: UniversityInput = {
      name: readField(form, "name"),
      country: readField(form, "country"),
    };
    void save(async () => {
      onSaved(await addUniversity(input));
    });
  }

  return (
    <SaveDialog
      title={CATALOGUE_TEXT.addUniversity}
      formId={formId}
      saveLabel={CATALOGUE_TEXT.addUniversity}
      saveIcon="plus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form
        id={formId}
        noValidate
        onSubmit={handleSubmit}
        className="tablet:grid-cols-2 grid gap-5"
      >
        <TextField
          label={CATALOGUE_TEXT.name}
          name="name"
          autoComplete="off"
          defaultValue=""
          errors={fieldErrors.name}
        />
        <SelectField
          label={CATALOGUE_TEXT.country}
          name="country"
          options={UNIVERSITY_COUNTRY_OPTIONS}
          defaultValue={Country.Australia}
          errors={fieldErrors.country}
        />
      </form>
    </SaveDialog>
  );
}
