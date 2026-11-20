"use client";

import type { RecordId } from "@/lib/recordId";
import type { ReactNode } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { LABELS } from "@/constants/messages";
import { EDIT_DETAILS_TEXT, PROFILE_TEXT } from "@/constants/studentProfile";
import { EnglishTest, Qualification } from "@/constants/students";
import type { EditList, StudentProfile } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { QUALIFICATION_OPTIONS, TEST_OPTIONS } from "../options";
import { readField } from "../profile/formData";

/** What one row's fields show to start with, by field name; every value is text as typed. */
export type RowValues = Record<string, string>;

export type RowFieldsProps = {
  /** Each field is named `<prefix>.<field>`, e.g. "academicRecords.r2.institution". */
  prefix: string;
  values: RowValues;
  errors: Partial<Record<string, string[]>>;
};

/** How one list on the Edit details page looks and reads (issue 81). */
export type ListKind = {
  title: string;
  rowName: (n: number) => string;
  add: string;
  none: string;
  fields: readonly string[];
  /** A new row's values. */
  blank: RowValues;
  stored: (profile: StudentProfile) => { id: RecordId; values: RowValues }[];
  Fields: (props: RowFieldsProps) => ReactNode;
};

const GRID = "tablet:grid-cols-2 grid gap-5";

/** A field's starting value; "" when the row has none. */
function valueOf(values: RowValues, field: string): string {
  return values[field] ?? "";
}

function named(prefix: string, field: string): string {
  return `${prefix}.${field}`;
}

/** One row's values from the submitted form. */
export function readRow(form: FormData, prefix: string, fields: readonly string[]): RowValues {
  return Object.fromEntries(fields.map((field) => [field, readField(form, named(prefix, field))]));
}

function AcademicRecordFields({ prefix, values, errors }: RowFieldsProps) {
  const name = (field: string) => named(prefix, field);
  return (
    <div className={GRID}>
      <SelectField
        label={LABELS.level}
        name={name("level")}
        options={QUALIFICATION_OPTIONS}
        defaultValue={valueOf(values, "level")}
        errors={errors[name("level")]}
      />
      <TextField
        label={LABELS.institution}
        name={name("institution")}
        autoComplete="off"
        defaultValue={valueOf(values, "institution")}
        errors={errors[name("institution")]}
      />
      <TextField
        label={LABELS.yearFinished}
        name={name("finishedYear")}
        inputMode="numeric"
        autoComplete="off"
        defaultValue={valueOf(values, "finishedYear")}
        isOptional
        errors={errors[name("finishedYear")]}
      />
      <TextField
        label={LABELS.result}
        name={name("result")}
        autoComplete="off"
        placeholder={LABELS.resultPlaceholder}
        defaultValue={valueOf(values, "result")}
        isOptional
        errors={errors[name("result")]}
      />
    </div>
  );
}

function WorkExperienceFields({ prefix, values, errors }: RowFieldsProps) {
  const name = (field: string) => named(prefix, field);
  const thisMonth = todayIso().slice(0, 7);
  return (
    <div className={GRID}>
      <TextField
        label={PROFILE_TEXT.employer}
        name={name("employer")}
        autoComplete="off"
        placeholder={PROFILE_TEXT.employerPlaceholder}
        defaultValue={valueOf(values, "employer")}
        errors={errors[name("employer")]}
      />
      <TextField
        label={PROFILE_TEXT.jobTitle}
        name={name("jobTitle")}
        autoComplete="off"
        placeholder={PROFILE_TEXT.jobTitlePlaceholder}
        defaultValue={valueOf(values, "jobTitle")}
        errors={errors[name("jobTitle")]}
      />
      <TextField
        label={PROFILE_TEXT.from}
        name={name("startedOn")}
        type="month"
        max={thisMonth}
        defaultValue={valueOf(values, "startedOn")}
        errors={errors[name("startedOn")]}
      />
      <TextField
        label={PROFILE_TEXT.to}
        name={name("endedOn")}
        type="month"
        max={thisMonth}
        defaultValue={valueOf(values, "endedOn")}
        hint={EDIT_DETAILS_TEXT.toHint}
        isOptional
        errors={errors[name("endedOn")]}
      />
    </div>
  );
}

function TestScoreFields({ prefix, values, errors }: RowFieldsProps) {
  const dates = useDates();
  const name = (field: string) => named(prefix, field);
  return (
    <div className={GRID}>
      <SelectField
        label={LABELS.test}
        name={name("test")}
        options={TEST_OPTIONS}
        defaultValue={valueOf(values, "test")}
        errors={errors[name("test")]}
      />
      <TextField
        label={LABELS.overallScore}
        name={name("overall")}
        inputMode="decimal"
        autoComplete="off"
        defaultValue={valueOf(values, "overall")}
        errors={errors[name("overall")]}
      />
      <DateField
        label={LABELS.takenOn}
        name={name("takenOn")}
        display={dates.display}
        max={todayIso()}
        defaultValue={valueOf(values, "takenOn")}
        isOptional
        errors={errors[name("takenOn")]}
      />
      <TextField
        label={LABELS.sectionScores}
        name={name("details")}
        autoComplete="off"
        placeholder={LABELS.sectionScoresPlaceholder}
        defaultValue={valueOf(values, "details")}
        isOptional
        errors={errors[name("details")]}
      />
    </div>
  );
}

/** The three lists, in the order the page shows them. */
export const LIST_KINDS: Record<EditList, ListKind> = {
  academicRecords: {
    title: EDIT_DETAILS_TEXT.academicHistory,
    rowName: EDIT_DETAILS_TEXT.qualification,
    add: EDIT_DETAILS_TEXT.addQualification,
    none: EDIT_DETAILS_TEXT.noQualifications,
    fields: ["level", "institution", "finishedYear", "result"],
    blank: { level: Qualification.PlusTwo, institution: "", finishedYear: "", result: "" },
    stored: (profile) =>
      profile.academicRecords.map((record) => ({
        id: record.id,
        values: {
          level: record.level,
          institution: record.institution,
          finishedYear: record.finishedYear === null ? "" : String(record.finishedYear),
          result: record.result,
        },
      })),
    Fields: AcademicRecordFields,
  },
  workExperience: {
    title: PROFILE_TEXT.workExperience,
    rowName: EDIT_DETAILS_TEXT.job,
    add: EDIT_DETAILS_TEXT.addJob,
    none: EDIT_DETAILS_TEXT.noJobs,
    fields: ["employer", "jobTitle", "startedOn", "endedOn"],
    blank: { employer: "", jobTitle: "", startedOn: "", endedOn: "" },
    stored: (profile) =>
      profile.workExperience.map((job) => ({
        id: job.id,
        values: {
          employer: job.employer,
          jobTitle: job.jobTitle,
          startedOn: job.startedOn,
          endedOn: job.endedOn ?? "",
        },
      })),
    Fields: WorkExperienceFields,
  },
  testScores: {
    title: PROFILE_TEXT.testScores,
    rowName: EDIT_DETAILS_TEXT.testScore,
    add: EDIT_DETAILS_TEXT.addTestScore,
    none: EDIT_DETAILS_TEXT.noTestScores,
    fields: ["test", "overall", "takenOn", "details"],
    blank: { test: EnglishTest.Ielts, overall: "", takenOn: "", details: "" },
    stored: (profile) =>
      profile.testScores.map((score) => ({
        id: score.id,
        values: {
          test: score.test,
          overall: score.overall,
          takenOn: score.takenOn ?? "",
          details: score.details,
        },
      })),
    Fields: TestScoreFields,
  },
};
