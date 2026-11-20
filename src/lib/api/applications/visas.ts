import type { RecordId } from "@/lib/recordId";
import { API_PATHS } from "@/constants/api";
import {
  APPOINTMENTS,
  type Appointment,
  type VisaResult,
  type VisaStatus,
} from "@/constants/visas";

import { patchJson, postForm, postJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import { StudentProfileSchema, type StudentProfile } from "../core/types";

/**
 * Add a Visa as Applied, once it is sent to the embassy, for one of the Student's Applications at
 * Offer (spec 58), and return the Student's profile as stored (now at Visa). Rejects with
 * `InvalidFieldsError` when it can't be added, and `ApiRequestError` when not allowed.
 */
export async function startVisa(
  studentId: RecordId,
  applicationId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  try {
    return await postJson(
      API_PATHS.studentVisas(studentId),
      { application: applicationId },
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { application: "application" }) ?? error;
  }
}

/**
 * Change one Visa's Status (spec 59). The answer is the Student's profile, whose Stage may have
 * moved with it (spec 60-61).
 */
export async function changeVisaStatus(
  studentId: RecordId,
  visaId: RecordId,
  status: VisaStatus,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  try {
    return await patchJson(
      API_PATHS.studentVisa(studentId, visaId),
      { status },
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { status: "status" }) ?? error;
  }
}

/** The appointments to change on a Visa: a new "YYYY-MM-DDTHH:MM", or null to clear it. */
export type VisaDatesChange = Partial<Record<Appointment, string | null>>;

/** Each appointment's API field, so a refusal lands under the right date. */
const DATE_FIELDS: Record<Appointment, string> = {
  biometrics: "biometrics_at",
  medical: "medical_at",
  interview: "interview_at",
};

/**
 * Book, move or clear (null) a Visa's Biometrics, Medical or Interview (spec 62a); those not given
 * stay as they are. Times are the office's own clock. Returns the Student's profile as stored; a
 * refused date rejects with `InvalidFieldsError` under its appointment.
 */
export async function setVisaDates(
  studentId: RecordId,
  visaId: RecordId,
  change: VisaDatesChange,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  const body = Object.fromEntries(
    APPOINTMENTS.filter((kind) => kind in change).map((kind) => [
      DATE_FIELDS[kind],
      change[kind] ?? null,
    ]),
  );
  try {
    return await patchJson(
      API_PATHS.studentVisaDates(studentId, visaId),
      body,
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, DATE_FIELDS) ?? error;
  }
}

/** A visa letter: what it says (null for a letter added later, keeping the Status) and its file. */
export type NewVisaLetter = { result: VisaResult | null; file: File };

/** The Upload visa letter fields, by their API names. */
const VISA_LETTER_FIELDS = { result: "result", file: "file" } as const;

/**
 * Upload a Visa's letter (spec 116). On a Visa at Applied it says Granted or Refused and the
 * Status changes with it, together or not at all; the Stage may follow. The answer is the
 * Student's profile. Rejects with `InvalidFieldsError` naming the refused field.
 */
export async function addVisaLetter(
  studentId: RecordId,
  visaId: RecordId,
  letter: NewVisaLetter,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  const form = new FormData();
  if (letter.result !== null) form.append(VISA_LETTER_FIELDS.result, letter.result);
  form.append(VISA_LETTER_FIELDS.file, letter.file);
  try {
    return await postForm(
      API_PATHS.studentVisaLetter(studentId, visaId),
      form,
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, VISA_LETTER_FIELDS) ?? error;
  }
}
