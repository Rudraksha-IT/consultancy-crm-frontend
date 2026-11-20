import { z } from "zod";

import type { RecordId } from "@/lib/recordId";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import { CONSULTANCY_STATUSES } from "@/constants/consultancyStatus";
import { MODULES, type SwitchableModule } from "@/constants/modules";

import { getJson, postForBlob, postJson, postWithoutBody, putJson } from "../core/client";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  FieldErrorsSchema,
  HostSchema,
  LoginAnswerSchema,
  MomentSchema,
  type StaffContext,
} from "../core/types";

/** The longest entry code this app reads from the address (the server makes 43 characters). */
export const ENTRY_CODE_MAX_LENGTH = 100;
/** The Platform keeps up to this many characters of a visit's reason. */
export const SUPPORT_REASON_MAX_LENGTH = 500;

/** One Support Access visit, as the Platform lists it (never shown to the office). */
export const SupportVisitSchema = z
  .object({
    id: z.number().int(),
    platform_admin: z.object({ name: z.string().min(1) }),
    consultancy: z.object({ id: z.number().int(), name: z.string().min(1) }),
    reason: z.string(),
    consultancy_status: z.enum(CONSULTANCY_STATUSES),
    started_at: MomentSchema,
    ended_at: MomentSchema.nullable(),
  })
  .transform((visit) => ({
    id: visit.id,
    platformAdminName: visit.platform_admin.name,
    consultancy: visit.consultancy,
    reason: visit.reason,
    consultancyStatus: visit.consultancy_status,
    startedAt: visit.started_at,
    endedAt: visit.ended_at,
  }));

export type SupportVisit = z.infer<typeof SupportVisitSchema>;

const EntryCodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+$/)
  .min(1)
  .max(ENTRY_CODE_MAX_LENGTH);

const StartedVisitSchema = z
  .object({ visit: SupportVisitSchema, host: HostSchema, entry_code: EntryCodeSchema })
  .transform(({ visit, host, entry_code }) => ({ visit, host, entryCode: entry_code }));

export type StartedVisit = z.infer<typeof StartedVisitSchema>;

const ModulesAnswerSchema = z.object({ modules: z.array(z.enum(MODULES)) });
const RefusedSchema = z.object({ detail: z.string().min(1) });

/** What a refused visit or action names: the reason field, or the request as a whole. */
export type SupportField = "reason" | "detail";

/**
 * Open a Consultancy as Platform Admin with a reason (spec 9-10): the visit is recorded on the
 * Platform, and its one-time entry code is used on the office's own address.
 */
export async function startSupportVisit(
  consultancyId: number,
  reason: string,
  fetchFn: typeof fetch = fetch,
): Promise<StartedVisit> {
  try {
    return await postJson(
      API_PATHS.platformSupportVisitStart(consultancyId),
      { reason },
      StartedVisitSchema,
      fetchFn,
    );
  } catch (error) {
    throw refusedFields(error) ?? error;
  }
}

/** The latest visits by every Platform Admin, newest first. */
export function fetchSupportVisits(fetchFn: typeof fetch = fetch): Promise<SupportVisit[]> {
  return getJson(API_PATHS.platformSupportVisits, z.array(SupportVisitSchema), fetchFn);
}

/** Whether `code` looks like an entry code; anything else is never sent. */
export function isEntryCode(code: string): boolean {
  return EntryCodeSchema.safeParse(code).success;
}

/**
 * On the office's address: swap the entry code for a login (the Next.js server keeps the tokens)
 * and return the context. Rejects with `InvalidFieldsError` ("detail") when the code can't be used.
 */
export async function enterSupportVisit(
  code: string,
  fetchFn: typeof fetch = fetch,
): Promise<StaffContext> {
  try {
    const answer = await postJson(API_PATHS.supportEnter, { code }, LoginAnswerSchema, fetchFn);
    return answer.context;
  } catch (error) {
    throw refusedFields(error) ?? error;
  }
}

/** Switch the office's Modules from inside it; returns the Modules now on. */
export async function switchOfficeModules(
  switches: Record<SwitchableModule, boolean>,
  fetchFn: typeof fetch = fetch,
): Promise<z.infer<typeof ModulesAnswerSchema>["modules"]> {
  const answer = await putJson(API_PATHS.supportModules, switches, ModulesAnswerSchema, fetchFn);
  return answer.modules;
}

/** Email a Staff member (Admins included) a password reset Code. */
export async function sendResetCodeTo(
  staffId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  try {
    await postJson(API_PATHS.supportResetCode(staffId), {}, RefusedSchema, fetchFn);
  } catch (error) {
    throw refusedFields(error) ?? error;
  }
}

/** Sign a Staff member (Admins included) out of every device at once. */
export function signOutStaff(staffId: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return postWithoutBody(API_PATHS.supportSignOut(staffId), fetchFn);
}

/** All of the office's data, as a ZIP of CSV files. */
export function downloadOfficeData(fetchFn: typeof fetch = fetch): Promise<Blob> {
  return postForBlob(API_PATHS.supportExport, fetchFn);
}

function refusedFields(error: unknown): InvalidFieldsError<SupportField> | null {
  return isRefusedInput(error) ? refusalOf(error.body) : null;
}

function isRefusedInput(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest;
}

function refusalOf(body: unknown): InvalidFieldsError<SupportField> | null {
  const refused = RefusedSchema.safeParse(body);
  if (refused.success)
    return new InvalidFieldsError<SupportField>({ detail: [refused.data.detail] });
  const fields = FieldErrorsSchema.safeParse(body);
  if (!fields.success) return null;
  const reason = fields.data.reason;
  return new InvalidFieldsError<SupportField>(reason === undefined ? {} : { reason });
}
