"use client";

import { useState, type SubmitEvent } from "react";

import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Country, Qualification, Source } from "@/constants/students";
import type { CounsellorChoice, NewStudent, NewStudentField } from "@/lib/api";

import { FormGroup as Group } from "./FormGroup";
import { COUNTRY_OPTIONS, handOverOptions, QUALIFICATION_OPTIONS, SOURCE_OPTIONS } from "./options";

export type VisitorFieldErrors = Partial<Record<NewStudentField, string[]>>;

type VisitorFormProps = {
  /** So a button outside the form (a Dialog's footer) can submit it. */
  id: string;
  counsellors: readonly CounsellorChoice[];
  fieldErrors: VisitorFieldErrors;
  onSubmit: (visitor: NewStudent) => void;
};

/**
 * A new visitor's details, grouped as on the visitor desk: About the visitor, Education and work,
 * Note, Hand over (spec 23-26). The Sub-agent name only appears for a Sub-agent Source.
 */
export function VisitorForm({ id, counsellors, fieldErrors, onSubmit }: VisitorFormProps) {
  const [source, setSource] = useState<string>(Source.WalkIn);
  const isSubAgent = source === Source.SubAgent;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(readVisitor(new FormData(event.currentTarget), isSubAgent));
  }

  return (
    <form id={id} noValidate onSubmit={handleSubmit} className="grid gap-6">
      <Group legend={LABELS.aboutTheVisitor}>
        <TextField
          label={LABELS.fullName}
          name="name"
          autoComplete="off"
          errors={fieldErrors.name}
        />
        <TextField
          label={LABELS.mobileNumber}
          name="phone"
          type="tel"
          autoComplete="off"
          placeholder={LABELS.phonePlaceholder}
          errors={fieldErrors.phone}
        />
        <TextField
          label={LABELS.email}
          name="email"
          type="email"
          autoComplete="off"
          isOptional
          errors={fieldErrors.email}
        />
        <SelectField
          label={LABELS.countryToStudyIn}
          name="country"
          options={COUNTRY_OPTIONS}
          defaultValue={Country.Australia}
          errors={fieldErrors.country}
        />
        <SelectField
          label={LABELS.howTheyFoundUs}
          name="source"
          options={SOURCE_OPTIONS}
          value={source}
          onChange={setSource}
          errors={fieldErrors.source}
        />
        {isSubAgent && (
          <TextField
            label={LABELS.subAgentName}
            name="subAgentName"
            placeholder={LABELS.subAgentPlaceholder}
            errors={fieldErrors.subAgentName}
          />
        )}
      </Group>
      <Group legend={LABELS.educationAndWork}>
        <SelectField
          label={LABELS.highestQualification}
          name="highestQualification"
          options={QUALIFICATION_OPTIONS}
          defaultValue={Qualification.PlusTwo}
          errors={fieldErrors.highestQualification}
        />
        <TextField
          label={LABELS.pastDegree}
          name="pastDegree"
          placeholder={LABELS.pastDegreePlaceholder}
          isOptional
          errors={fieldErrors.pastDegree}
        />
        <TextField
          label={LABELS.previousJob}
          name="previousJob"
          placeholder={LABELS.previousJobPlaceholder}
          isOptional
          errors={fieldErrors.previousJob}
        />
      </Group>
      <Group legend={LABELS.note} isSingleColumn>
        <TextAreaField
          label={LABELS.note}
          isLabelHidden
          name="note"
          placeholder={LABELS.notePlaceholder}
          hint={MESSAGES.noteHint}
          isOptional
          errors={fieldErrors.note}
        />
      </Group>
      <Group legend={LABELS.handOver}>
        <SelectField
          label={LABELS.counsellor}
          name="assignedCounsellor"
          options={handOverOptions(counsellors)}
          defaultValue=""
          isOptional
          errors={fieldErrors.assignedCounsellor}
        />
      </Group>
    </form>
  );
}

function readVisitor(form: FormData, isSubAgent: boolean): NewStudent {
  return {
    name: readField(form, "name"),
    phone: readField(form, "phone"),
    email: readField(form, "email"),
    country: readField(form, "country"),
    source: readField(form, "source"),
    subAgentName: isSubAgent ? readField(form, "subAgentName") : "",
    highestQualification: readField(form, "highestQualification"),
    pastDegree: readField(form, "pastDegree"),
    previousJob: readField(form, "previousJob"),
    note: readField(form, "note"),
    assignedCounsellor: readField(form, "assignedCounsellor"),
  };
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
