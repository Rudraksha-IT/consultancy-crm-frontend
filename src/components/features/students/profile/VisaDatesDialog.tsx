"use client";

import { useId, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { DateField } from "@/components/ui/DateField";
import { TextField } from "@/components/ui/TextField";
import { HTTP_STATUS } from "@/constants/api";
import { APPOINTMENTS, APPOINTMENT_LABELS, VISA_TEXT, type Appointment } from "@/constants/visas";
import {
  ApiRequestError,
  DetailAnswerSchema,
  InvalidFieldsError,
  setVisaDates,
  type StudentProfile,
  type Visa,
  type VisaDatesChange,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { readField } from "./formData";
import { saveFailure } from "./saveErrors";
import { SaveDialog } from "./SaveDialog";
import { useFormSave } from "./useFormSave";

type VisaDatesDialogProps = {
  profile: StudentProfile;
  visa: Visa;
  onClose: () => void;
  /** Called with the profile as stored and the toast to show; null when nothing changed. */
  onSaved: (profile: StudentProfile | null, message: string | null) => void;
};

/** A form field's name: the appointment, then "day" or "time". */
type DateFieldName = `${Appointment}Day` | `${Appointment}Time`;
type Refused = Partial<Record<DateFieldName | Appointment, string[]>>;

/**
 * Book, move or clear a Visa's Biometrics, Medical and Interview (spec 62a): each a day from today
 * on and a time on the office's clock, or both left empty to remove it. Only what changed is sent;
 * the server checks the same rules again.
 */
export function VisaDatesDialog({ profile, visa, onClose, onSaved }: VisaDatesDialogProps) {
  const formId = useId();
  const dates = useDates();
  const { isSaving, fieldErrors, failure, save } = useFormSave(datesFailure);
  const today = todayIso();
  const errors: Refused = fieldErrors;

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      const { change, refused } = changedDates(form, visa, today);
      if (Object.keys(refused).length > 0) throw new InvalidFieldsError(refused);
      if (Object.keys(change).length === 0) {
        onSaved(null, null);
        return;
      }
      onSaved(await setVisaDates(profile.id, visa.id, change), VISA_TEXT.datesSaved);
    });
  }

  return (
    <SaveDialog
      title={VISA_TEXT.datesTitle(profile.name)}
      formId={formId}
      saveLabel={VISA_TEXT.saveDates}
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={submit} className="grid gap-4">
        {APPOINTMENTS.map((kind) => {
          const label = APPOINTMENT_LABELS[kind];
          const booked = bookedParts(bookedAt(visa, kind));
          return (
            <div key={kind} className="phone:grid-cols-2 grid gap-4">
              <DateField
                label={VISA_TEXT.dateOf(label)}
                name={`${kind}Day`}
                display={dates.display}
                min={today}
                defaultValue={booked.day}
                errors={[...(errors[`${kind}Day`] ?? []), ...(errors[kind] ?? [])]}
              />
              <TextField
                label={VISA_TEXT.timeOf(label)}
                name={`${kind}Time`}
                type="time"
                defaultValue={booked.time}
                errors={errors[`${kind}Time`]}
              />
            </div>
          );
        })}
        <p className="text-small text-ink-2">{VISA_TEXT.datesNote(counsellorName(profile))}</p>
      </form>
    </SaveDialog>
  );
}

function bookedAt(visa: Visa, kind: Appointment): string | null {
  return { biometrics: visa.biometricsAt, medical: visa.medicalAt, interview: visa.interviewAt }[
    kind
  ];
}

/** The booked day and time to start from; empty when none is booked. */
function bookedParts(at: string | null): { day: string; time: string } {
  const [day = "", time = ""] = at === null ? [] : at.split("T");
  return { day, time };
}

/**
 * What changed, ready to send, and what is wrong before anything is sent. Both empty clears a
 * booked appointment; an unchanged one is left alone.
 */
function changedDates(
  form: FormData,
  visa: Visa,
  today: string,
): { change: VisaDatesChange; refused: Refused } {
  const change: VisaDatesChange = {};
  const refused: Refused = {};
  for (const kind of APPOINTMENTS) {
    const day = readField(form, `${kind}Day`);
    const time = readField(form, `${kind}Time`);
    const next = day === "" && time === "" ? null : `${day}T${time}`;
    if (next === bookedAt(visa, kind)) continue;
    Object.assign(refused, refusedParts(kind, day, time, today));
    change[kind] = next;
  }
  return { change, refused };
}

/** A day needs a time and a time a day; a changed day must be today or later. */
function refusedParts(kind: Appointment, day: string, time: string, today: string): Refused {
  const label = APPOINTMENT_LABELS[kind];
  const refused: Refused = {};
  const dayProblem = dayRefusal(day, time, today, label);
  if (dayProblem !== null) refused[`${kind}Day`] = [dayProblem];
  if (day !== "" && time === "") refused[`${kind}Time`] = [VISA_TEXT.timeNeeded(label)];
  return refused;
}

function dayRefusal(day: string, time: string, today: string, label: string): string | null {
  if (day === "") return time === "" ? null : VISA_TEXT.dayNeeded(label);
  return day < today ? VISA_TEXT.pastDay : null;
}

function counsellorName(profile: StudentProfile): string | null {
  return profile.assignedCounsellor === null ? null : profile.assignedCounsellor.name;
}

/** The API's own reason when it refused the change (e.g. a decided visa), else the usual words. */
function datesFailure(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest) {
    const refused = DetailAnswerSchema.safeParse(error.body);
    if (refused.success) return refused.data.detail;
  }
  return saveFailure(error);
}
