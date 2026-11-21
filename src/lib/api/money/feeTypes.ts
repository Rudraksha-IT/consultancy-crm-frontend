import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { getJson, patchJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { DetailAnswerSchema } from "../core/types";

/** What a Fee or Payment is for, as its answer names it (GLOSSARY: Fee Type). */
export const FeeTypeRefSchema = z.object({ id: RecordIdSchema, name: z.string().min(1) });

export type FeeTypeRef = z.infer<typeof FeeTypeRefSchema>;

/**
 * One Fee Type (issue 06). `uses` (how many Fees and Payments name it) is given to Admins only;
 * it is null for everyone else.
 */
const FeeTypeSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string().min(1),
    hidden: z.boolean(),
    other: z.boolean(),
    uses: z
      .object({ fees: z.number().int().nonnegative(), payments: z.number().int().nonnegative() })
      .nullable(),
  })
  .transform((type) => ({
    id: type.id,
    name: type.name,
    hidden: type.hidden,
    isOther: type.other,
    uses: type.uses,
  }));

export type FeeType = z.infer<typeof FeeTypeSchema>;

const FeeTypeListSchema = z
  .object({ results: z.array(FeeTypeSchema) })
  .transform((answer) => answer.results);

/** The office's Fee Types in their order, hidden ones included (Accounts on). */
export function fetchFeeTypes(fetchFn: typeof fetch = fetch): Promise<FeeType[]> {
  return getJson(API_PATHS.feeTypes, FeeTypeListSchema, fetchFn);
}

/**
 * Add a Fee Type at the end, before Other (Admins). Rejects with `InvalidFieldsError` on
 * `name` when it is refused (empty, too long or already there).
 */
export async function addFeeType(name: string, fetchFn: typeof fetch = fetch): Promise<FeeType> {
  try {
    return await postJson(API_PATHS.feeTypes, { name }, FeeTypeSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { name: "name" }) ?? error;
  }
}

/** A rename, or hiding or showing it again; at least one of them. */
export type FeeTypeChange = { name?: string; hidden?: boolean };

/**
 * Rename a Fee Type, or hide or show it (Admins). Other can't be changed. Rejects with
 * `InvalidFieldsError` on `name`, or `ApiRequestError` with the reason.
 */
export async function changeFeeType(
  feeTypeId: RecordId,
  change: FeeTypeChange,
  fetchFn: typeof fetch = fetch,
): Promise<FeeType> {
  try {
    return await patchJson(API_PATHS.feeType(feeTypeId), change, FeeTypeSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { name: "name" }) ?? error;
  }
}

/** Delete a Fee Type no Fee or Payment uses (Admins); one in use is refused: hide it instead. */
export function deleteFeeType(feeTypeId: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.feeType(feeTypeId), fetchFn);
}

/** Put the Fee Types in this order (every id once) and return the list. */
export function reorderFeeTypes(
  order: readonly RecordId[],
  fetchFn: typeof fetch = fetch,
): Promise<FeeType[]> {
  return putJson(API_PATHS.feeTypeOrder, { order }, FeeTypeListSchema, fetchFn);
}

/** "Visa fee (first half)": the Fee Type with its note, when there is one. */
export function describeFeeType(feeType: FeeTypeRef, note: string): string {
  return note === "" ? feeType.name : `${feeType.name} (${note})`;
}

/**
 * The server's reason for refusing a change to a Fee Type ("Fees or Payments use this Fee Type.
 * Hide it instead."), or null when it gave none.
 */
export function feeTypeRefusal(error: unknown): string | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const detail = DetailAnswerSchema.safeParse(error.body);
  return detail.success ? detail.data.detail : null;
}
