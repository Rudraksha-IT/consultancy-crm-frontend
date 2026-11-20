import type { RecordId } from "@/lib/recordId";
import { API_PATHS } from "@/constants/api";
import type { OfferKind, StatusByHand } from "@/constants/applications";

import { fetchUniversities } from "../catalogue/catalogue";
import type { University } from "../catalogue/catalogueTypes";
import { patchJson, postForm, postJson, putJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import {
  APPLICATION_API_FIELDS,
  StudentProfileSchema,
  type NewApplication,
  type StudentProfile,
} from "../core/types";

/** The most Catalogue pages the picker reads (25 Universities each). */
const MAX_PICKER_PAGES = 40;

/**
 * Add an Application as Draft (spec 52) and return the Student's profile as stored. Rejects with
 * `InvalidFieldsError` for a refused course or intake, and `ApiRequestError` when not allowed.
 */
export async function addApplication(
  studentId: RecordId,
  application: NewApplication,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  const fields = APPLICATION_API_FIELDS;
  const body = { [fields.course]: application.courseId, [fields.intake]: application.intake };
  try {
    return await postJson(
      API_PATHS.studentApplications(studentId),
      body,
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, fields) ?? error;
  }
}

/**
 * Change one Application's Status (spec 53). The answer is the Student's profile, whose Stage may
 * have moved with it (spec 54-56).
 */
export async function changeApplicationStatus(
  studentId: RecordId,
  applicationId: RecordId,
  status: StatusByHand,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  try {
    return await patchJson(
      API_PATHS.studentApplication(studentId, applicationId),
      { status },
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { status: "status" }) ?? error;
  }
}

/** An Offer Letter to add: which Application it is for, the kind of offer and the file. */
export type NewOfferLetter = { applicationId: RecordId; kind: OfferKind; file: File };

/** The Add offer letter fields, by their API names. */
const OFFER_LETTER_FIELDS = { application: "application", kind: "kind", file: "file" } as const;

/**
 * Add a University's Offer Letter to one of the Student's Applications (spec 114). It is kept as
 * a Document linked to that Application, which becomes Offer; the answer is the Student's profile,
 * whose Stage may have moved to Offer. Rejects with `InvalidFieldsError` naming the refused field.
 */
export async function addOfferLetter(
  studentId: RecordId,
  letter: NewOfferLetter,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  const form = new FormData();
  form.append(OFFER_LETTER_FIELDS.application, letter.applicationId);
  form.append(OFFER_LETTER_FIELDS.kind, letter.kind);
  form.append(OFFER_LETTER_FIELDS.file, letter.file);
  try {
    return await postForm(
      API_PATHS.studentOfferLetters(studentId),
      form,
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, OFFER_LETTER_FIELDS) ?? error;
  }
}

/**
 * Make one of the Student's offers their Chosen Offer, replacing any other (spec 115). Rejects with
 * `InvalidFieldsError` on `application` when it is refused, e.g. while its visa is waiting.
 */
export async function chooseOffer(
  studentId: RecordId,
  applicationId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  try {
    return await putJson(
      API_PATHS.studentChosenOffer(studentId),
      { application: applicationId },
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, { application: "application" }) ?? error;
  }
}

/** Every active University with its active Courses, by name, for the Application picker. */
export async function fetchPickableUniversities(
  fetchFn: typeof fetch = fetch,
): Promise<University[]> {
  const filters = { search: "", includeArchived: false };
  const universities: University[] = [];
  for (let page = 1; page <= MAX_PICKER_PAGES; page += 1) {
    const found = await fetchUniversities(filters, page, fetchFn);
    universities.push(...found.universities);
    if (page * found.pageSize >= found.count) break;
  }
  return universities;
}
