"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Banner } from "@/components/ui/Banner";
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { BATCH_TEXT, TEST_TYPE_LABELS, TEST_TYPES, TestType } from "@/constants/batches";
import { MESSAGES } from "@/constants/messages";
import { createBatch, saveBatch, type Batch, type BatchTeacher } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { TimeSlotField } from "./TimeSlotField";
import { useBatchTeachers, type Loaded } from "./useBatchData";

// A new class starts in five days and runs for two months, as the prototype suggests.
const STARTS_IN_DAYS = 5;
const ENDS_IN_DAYS = 65;

const TEST_TYPE_OPTIONS = TEST_TYPES.map((type) => ({
  value: type,
  label: TEST_TYPE_LABELS[type],
}));

/** What the form starts with: a new class's suggestions, or the class being edited. */
type Start = {
  name: string;
  testType: TestType;
  teacherId: RecordId | undefined;
  timeSlot: string;
  startsOn: string;
  endsOn: string;
};

function startFrom(batch: Batch | undefined): Start {
  if (batch === undefined) {
    return {
      name: "",
      testType: TestType.Ielts,
      teacherId: undefined,
      timeSlot: "",
      startsOn: daysFromToday(STARTS_IN_DAYS),
      endsOn: daysFromToday(ENDS_IN_DAYS),
    };
  }
  return { ...batch, teacherId: batch.teacher.id };
}

const NEW_WORDS = { title: BATCH_TEXT.newClass, save: BATCH_TEXT.create, icon: "plus" } as const;
const EDIT_WORDS = { title: BATCH_TEXT.editTitle, save: BATCH_TEXT.save, icon: "check" } as const;

type BatchFormDialogProps = {
  /** The class to edit; a new one without it. */
  batch?: Batch | undefined;
  onClose: () => void;
  onSaved: () => void;
};

/** New class, or Edit class: name, test type, Teacher, time slot and dates (spec 83). */
export function BatchFormDialog({ batch, onClose, onSaved }: BatchFormDialogProps) {
  const formId = useId();
  const dates = useDates();
  const { showToast } = useToast();
  const teachers = useBatchTeachers();
  const [start] = useState(() => startFrom(batch));
  const [startsOn, setStartsOn] = useState(start.startsOn);
  const [endsOn, setEndsOn] = useState(start.endsOn);
  const words = batch === undefined ? NEW_WORDS : EDIT_WORDS;
  const { isSaving, fieldErrors, failure, save } = useFormSave(() => MESSAGES.saveFailed);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const details = {
      name: readField(form, "name"),
      testType: toTestType(readField(form, "testType")),
      teacherId: readField(form, "teacher"),
      timeSlot: readField(form, "timeSlot"),
      startsOn,
      endsOn,
    };
    void save(async () => {
      await (batch === undefined ? createBatch(details) : saveBatch(batch.id, details));
      showToast(BATCH_TEXT.saved);
      onSaved();
    });
  }

  return (
    <SaveDialog
      title={words.title}
      formId={formId}
      saveLabel={words.save}
      saveIcon={words.icon}
      isSaving={isSaving}
      isSaveDisabled={!hasTeachers(teachers)}
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
          label={BATCH_TEXT.name}
          name="name"
          placeholder={BATCH_TEXT.namePlaceholder}
          defaultValue={start.name}
          errors={fieldErrors.name}
        />
        <SelectField
          label={BATCH_TEXT.testType}
          name="testType"
          options={TEST_TYPE_OPTIONS}
          defaultValue={start.testType}
          errors={fieldErrors.testType}
        />
        <TeacherField
          teachers={teachers}
          current={batch?.teacher.id}
          errors={fieldErrors.teacherId}
        />
        <TimeSlotField name="timeSlot" saved={start.timeSlot} errors={fieldErrors.timeSlot} />
        <DateField
          label={BATCH_TEXT.starts}
          name="startsOn"
          display={dates.display}
          value={startsOn}
          onChange={setStartsOn}
          errors={fieldErrors.startsOn}
        />
        <DateField
          label={BATCH_TEXT.ends}
          name="endsOn"
          display={dates.display}
          min={startsOn}
          value={endsOn}
          onChange={setEndsOn}
          errors={fieldErrors.endsOn}
        />
      </form>
    </SaveDialog>
  );
}

type TeacherFieldProps = {
  teachers: Loaded<BatchTeacher[]>;
  current: RecordId | undefined;
  errors?: readonly string[] | undefined;
};

/** The Teacher, from the active Teachers; why there's no choice when there is none. */
function TeacherField({ teachers, current, errors }: TeacherFieldProps) {
  if (teachers.status === "loading") return null;
  if (teachers.status !== "loaded")
    return <Banner tone="problem">{BATCH_TEXT.teachersFailed}</Banner>;
  const [first] = teachers.data;
  if (first === undefined) return <Banner tone="warning">{BATCH_TEXT.noTeachers}</Banner>;
  return (
    <SelectField
      label={BATCH_TEXT.teacher}
      name="teacher"
      options={teachers.data.map((teacher) => ({ value: teacher.id, label: teacher.name }))}
      defaultValue={String(startingTeacher(teachers.data, current, first))}
      errors={errors}
    />
  );
}

/** The class's own Teacher while they're still active; otherwise the first on the list. */
function startingTeacher(
  teachers: BatchTeacher[],
  current: RecordId | undefined,
  first: BatchTeacher,
) {
  return teachers.some((teacher) => teacher.id === current) ? current : first.id;
}

/** Whether a Teacher can be chosen yet: the list has loaded and isn't empty. */
function hasTeachers(teachers: Loaded<BatchTeacher[]>): boolean {
  return teachers.status === "loaded" && teachers.data.length > 0;
}

function toTestType(value: string): TestType {
  return TEST_TYPES.find((type) => type === value) ?? TestType.Ielts;
}

/** A day `days` from today in the browser's own calendar day, as AD "YYYY-MM-DD". */
function daysFromToday(days: number): string {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return todayIso(day);
}
