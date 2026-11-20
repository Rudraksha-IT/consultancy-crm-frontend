import type { RecordId } from "@/lib/recordId";
import { API_PATHS } from "@/constants/api";

import { postJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import {
  COUNSELLOR_PICK_API_FIELDS,
  STAGE_CHANGE_API_FIELDS,
  StudentProfileSchema,
  type StageChange,
  type StudentProfile,
} from "../core/types";

/**
 * Move a Student's Stage by hand, mark them Lost with the reason, or bring them back (spec 38-40).
 * Rejects with `InvalidFieldsError` when the API refuses the Stage or reason, and with
 * `ApiRequestError` (403) when the Staff member may not.
 */
export async function setStage(
  id: RecordId,
  change: StageChange,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  const fields = STAGE_CHANGE_API_FIELDS;
  const body: Record<string, string> = { [fields.stage]: change.stage };
  if (change.lostReason !== undefined) body[fields.lostReason] = change.lostReason;
  try {
    return await postJson(API_PATHS.studentStage(id), body, StudentProfileSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, fields) ?? error;
  }
}

/** Give a Student with no counsellor their first one (spec 28). */
export function assignCounsellor(
  id: RecordId,
  counsellorId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  return pickCounsellor(API_PATHS.studentAssign(id), counsellorId, fetchFn);
}

/** Transfer a Student to another counsellor (spec 42). */
export function transferStudent(
  id: RecordId,
  counsellorId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentProfile> {
  return pickCounsellor(API_PATHS.studentTransfer(id), counsellorId, fetchFn);
}

async function pickCounsellor(
  path: string,
  counsellorId: RecordId,
  fetchFn: typeof fetch,
): Promise<StudentProfile> {
  const fields = COUNSELLOR_PICK_API_FIELDS;
  try {
    return await postJson(
      path,
      { [fields.counsellor]: counsellorId },
      StudentProfileSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, fields) ?? error;
  }
}
