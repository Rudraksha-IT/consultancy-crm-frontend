"use client";

import { useId, useState, type SubmitEvent } from "react";

import { CourseBrochures } from "@/components/features/catalogue/CourseBrochures";
import { Banner } from "@/components/ui/Banner";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { APPLICATION_TEXT } from "@/constants/applications";
import { COURSE_LEVEL_LABELS } from "@/constants/catalogue";
import { COUNTRY_LABELS } from "@/constants/students";
import { addApplication, type Course, type StudentProfile, type University } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

import { SaveDialog } from "./SaveDialog";
import { statusSavedMessage } from "./statusSaved";
import { NOTHING, useApplicationPicker, type PickerField } from "./useApplicationPicker";
import { useFormSave } from "./useFormSave";
import { usePickableUniversities, type PickableUniversities } from "./usePickableUniversities";

type AddApplicationDialogProps = {
  profile: StudentProfile;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
};

const NEEDED: Record<PickerField, string> = {
  university: APPLICATION_TEXT.universityNeeded,
  course: APPLICATION_TEXT.courseNeeded,
  intake: APPLICATION_TEXT.intakeNeeded,
};

/** Add an Application from the Catalogue: University, then Course, then Intake (spec 51-52). */
export function AddApplicationDialog({ profile, onClose, onSaved }: AddApplicationDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const catalogue = usePickableUniversities();
  const universities = catalogue.status === "loaded" ? catalogue.universities : [];
  const picker = useApplicationPicker(universities);
  const [missing, setMissing] = useState<readonly PickerField[]>([]);
  const { isSaving, fieldErrors, failure, save } = useFormSave();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const { course, intake } = picker;
    setMissing(picker.missing());
    if (course === undefined || intake === undefined) return;
    void save(async () => {
      const saved = await addApplication(profile.id, { courseId: course.id, intake });
      showToast(statusSavedMessage(APPLICATION_TEXT.added, profile.stage, saved.stage));
      onSaved(saved);
    });
  }

  function select(field: PickerField, label: string, options: SelectOption[]) {
    return (
      <SelectField
        label={label}
        name={field}
        options={options}
        value={picker.picked[field]}
        onChange={(value) => {
          picker.pick(field, value);
        }}
        errors={missing.includes(field) ? [NEEDED[field]] : fieldErrors[field]}
      />
    );
  }

  return (
    <SaveDialog
      title={APPLICATION_TEXT.dialogTitle}
      formId={formId}
      saveLabel={APPLICATION_TEXT.save}
      saveIcon="plus"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <CatalogueNotice catalogue={catalogue} />
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-4">
        {select("university", APPLICATION_TEXT.university, universityOptions(universities))}
        {select("course", APPLICATION_TEXT.course, courseOptions(picker.university))}
        {picker.course !== undefined && (
          <CourseBrochures courseName={picker.course.name} files={picker.course.files} />
        )}
        {select("intake", APPLICATION_TEXT.intake, intakeOptions(picker.course))}
        <p className="text-small text-ink-2">{APPLICATION_TEXT.pickerNote}</p>
      </form>
    </SaveDialog>
  );
}

/** While the Catalogue loads, if it couldn't, or if it has nothing to pick. */
function CatalogueNotice({ catalogue }: { catalogue: PickableUniversities }) {
  if (catalogue.status === "loading") {
    return <p className="text-ink-2">{APPLICATION_TEXT.loadingCatalogue}</p>;
  }
  if (catalogue.status === "failed") {
    return <Banner tone="problem">{APPLICATION_TEXT.catalogueFailed}</Banner>;
  }
  if (catalogue.universities.length === 0) {
    return <p className="text-ink-2">{APPLICATION_TEXT.catalogueEmpty}</p>;
  }
  return null;
}

function universityOptions(universities: readonly University[]): SelectOption[] {
  return [
    { value: NOTHING, label: APPLICATION_TEXT.chooseUniversity },
    ...universities.map((university) => ({
      value: university.id,
      label: APPLICATION_TEXT.universityOption(university.name, COUNTRY_LABELS[university.country]),
    })),
  ];
}

function courseOptions(university: University | undefined): SelectOption[] {
  return [
    { value: NOTHING, label: APPLICATION_TEXT.chooseCourse },
    ...(university?.courses ?? []).map((course) => ({
      value: course.id,
      label: APPLICATION_TEXT.courseOption(course.name, COURSE_LEVEL_LABELS[course.level]),
    })),
  ];
}

function intakeOptions(course: Course | undefined): SelectOption[] {
  return [
    { value: NOTHING, label: APPLICATION_TEXT.chooseIntake },
    ...(course?.intakes ?? []).map((month) => ({ value: month, label: formatIntake(month) })),
  ];
}
