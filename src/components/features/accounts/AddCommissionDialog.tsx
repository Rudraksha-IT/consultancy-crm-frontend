"use client";

import { useId, useState, type SubmitEvent } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import {
  usePickableUniversities,
  type PickableUniversities,
} from "@/components/features/students/profile/usePickableUniversities";
import {
  StudentFinder,
  type StudentChoice,
  type StudentFinderLabels,
} from "@/components/features/tasks/StudentFinder";
import { Banner } from "@/components/ui/Banner";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { HTTP_STATUS } from "@/constants/api";
import { COMMISSION_TEXT } from "@/constants/commission";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_MAX_AMOUNT } from "@/constants/payments";
import {
  addCommission,
  ApiRequestError,
  InvalidFieldsError,
  type NewCommission,
  type University,
} from "@/lib/api";
import { formatIntake } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

// The same words the server uses, so a refusal reads the same wherever it comes from.
const AMOUNT_MESSAGE = `Enter a whole amount from ${formatNpr(1)} to ${formatNpr(PAYMENT_MAX_AMOUNT)}.`;
const WHOLE_NUMBER = /^[0-9]+$/;
const NONE = "";

const STUDENT_LABELS: StudentFinderLabels = {
  search: COMMISSION_TEXT.findStudent,
  placeholder: COMMISSION_TEXT.findStudentPlaceholder,
  choice: COMMISSION_TEXT.student,
  none: COMMISSION_TEXT.chooseStudent,
};

type AddCommissionDialogProps = { onClose: () => void; onAdded: () => void };

/** Record Commission for a Student from a Catalogue University and Intake (spec 76d). */
export function AddCommissionDialog({ onClose, onAdded }: AddCommissionDialogProps) {
  const formId = useId();
  const universities = usePickableUniversities();
  const [student, setStudent] = useState<StudentChoice | null>(null);
  const [universityId, setUniversityId] = useState(NONE);
  const [intake, setIntake] = useState(NONE);
  const { isSaving, fieldErrors, failure, save } = useFormSave(commissionFailure);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const amount = readField(new FormData(event.currentTarget), "amount").trim();
    void save(async () => {
      await addCommission(readCommission({ student, universityId, intake, amount }));
      onAdded();
    });
  }

  return (
    <SaveDialog
      title={COMMISSION_TEXT.addTitle}
      formId={formId}
      saveLabel={COMMISSION_TEXT.save}
      saveIcon="check"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <StudentFinder
          value={student}
          onChange={setStudent}
          labels={STUDENT_LABELS}
          isRequired
          errors={fieldErrors.studentId}
        />
        <UniversityFields
          universities={universities}
          universityId={universityId}
          intake={intake}
          onUniversity={(id) => {
            setUniversityId(id);
            setIntake(NONE);
          }}
          onIntake={setIntake}
          fieldErrors={fieldErrors}
        />
        <TextField
          label={COMMISSION_TEXT.expectedAmount}
          name="amount"
          type="number"
          inputMode="numeric"
          min="1"
          errors={fieldErrors.amount}
        />
      </form>
    </SaveDialog>
  );
}

type UniversityFieldsProps = {
  universities: PickableUniversities;
  universityId: string;
  intake: string;
  onUniversity: (id: string) => void;
  onIntake: (intake: string) => void;
  fieldErrors: Partial<Record<string, string[]>>;
};

/** A University from the Catalogue, then one of the Intakes its Courses run. */
function UniversityFields(props: UniversityFieldsProps) {
  const { universities, fieldErrors } = props;
  if (universities.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (universities.status === "failed") {
    return <Banner tone="problem">{COMMISSION_TEXT.universitiesFailed}</Banner>;
  }
  const chosen = universities.universities.find(
    (university) => String(university.id) === props.universityId,
  );
  return (
    <div className="tablet:grid-cols-2 grid gap-5">
      <SelectField
        label={COMMISSION_TEXT.university}
        name="university"
        options={[
          { value: NONE, label: COMMISSION_TEXT.chooseUniversity },
          ...universities.universities.map((university) => ({
            value: String(university.id),
            label: university.name,
          })),
        ]}
        value={props.universityId}
        onChange={props.onUniversity}
        errors={fieldErrors.universityId}
      />
      <SelectField
        label={COMMISSION_TEXT.intakeLabel}
        name="intake"
        options={[
          { value: NONE, label: COMMISSION_TEXT.chooseIntake },
          ...intakesOf(chosen).map((month) => ({ value: month, label: formatIntake(month) })),
        ]}
        value={props.intake}
        onChange={props.onIntake}
        errors={fieldErrors.intake}
      />
    </div>
  );
}

/** Every Intake the University's Courses run, earliest first, each once. */
export function intakesOf(university: University | undefined): string[] {
  if (university === undefined) return [];
  const months = new Set(university.courses.flatMap((course) => course.intakes));
  return [...months].sort();
}

type Typed = {
  student: StudentChoice | null;
  universityId: string;
  intake: string;
  amount: string;
};

/**
 * The Commission chosen in the form. Throws `InvalidFieldsError` naming every missing choice and
 * an amount that isn't a whole number in range, so nothing is sent.
 */
export function readCommission(typed: Typed): NewCommission {
  const errors = refusedChoices(typed);
  const { student, universityId, intake, amount } = typed;
  if (student === null || Object.keys(errors).length > 0) throw new InvalidFieldsError(errors);
  return {
    studentId: student.id,
    universityId: Number(universityId),
    intake,
    amount: Number(amount),
  };
}

function refusedChoices(typed: Typed): Partial<Record<keyof NewCommission, string[]>> {
  return {
    ...(typed.student === null && { studentId: [COMMISSION_TEXT.studentRefused] }),
    ...(typed.universityId === NONE && { universityId: [COMMISSION_TEXT.universityRefused] }),
    ...(typed.intake === NONE && { intake: [COMMISSION_TEXT.intakeRefused] }),
    ...(!isWholeAmount(typed.amount) && { amount: [AMOUNT_MESSAGE] }),
  };
}

function isWholeAmount(text: string): boolean {
  return WHOLE_NUMBER.test(text) && Number(text) >= 1 && Number(text) <= PAYMENT_MAX_AMOUNT;
}

/** Why it wasn't saved, when it wasn't about the fields. */
function commissionFailure(error: unknown): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? COMMISSION_TEXT.notAllowed : MESSAGES.saveFailed;
}
