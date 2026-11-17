import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import { WORK_FROM_HOME_STATUSES } from "@/constants/workFromHome";

import { getJson, postJson } from "../core/client";
import { ApiRequestError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { DetailAnswerSchema, MomentSchema } from "../core/types";

const DaySchema = z.iso.date();

/** One set of Work From Home dates (spec 131-133, issue 87). */
const DatesSchema = z
  .object({
    id: z.number().int(),
    staff_id: z.number().int(),
    starts_on: DaySchema,
    ends_on: DaySchema.nullable(),
    reason: z.string(),
    status: z.enum(WORK_FROM_HOME_STATUSES),
    set_directly: z.boolean(),
    asked_by: z.string(),
    asked_at: MomentSchema,
    answered_by: z.string().nullable(),
    answered_at: MomentSchema.nullable(),
  })
  .transform((dates) => ({
    id: dates.id,
    staffId: dates.staff_id,
    startsOn: dates.starts_on,
    endsOn: dates.ends_on,
    reason: dates.reason,
    status: dates.status,
    isSetDirectly: dates.set_directly,
    askedBy: dates.asked_by,
    askedAt: dates.asked_at,
    answeredBy: dates.answered_by,
    answeredAt: dates.answered_at,
  }));

const MineSchema = z
  .object({ can_ask: z.boolean(), results: z.array(DatesSchema) })
  .transform(({ can_ask, results }) => ({ canAsk: can_ask, dates: results }));

const PersonSchema = z
  .object({
    staff: z.object({ id: z.number().int(), name: z.string() }),
    needs_dates: z.boolean(),
    results: z.array(DatesSchema),
  })
  .transform(({ staff, needs_dates, results }) => ({
    name: staff.name,
    needsDates: needs_dates,
    dates: results,
  }));

export type WorkFromHomeDates = z.infer<typeof DatesSchema>;
export type MyWorkFromHome = z.infer<typeof MineSchema>;
export type PersonWorkFromHome = z.infer<typeof PersonSchema>;
/** Dates to ask for or set: an empty end means no end date. */
export type NewWorkFromHome = { startsOn: string; endsOn: string; reason: string };

export const WORK_FROM_HOME_FIELDS = {
  startsOn: "starts_on",
  endsOn: "ends_on",
  reason: "reason",
} as const;

/** The server refused; its own short reason is the message. */
export class WorkFromHomeRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkFromHomeRefusedError";
  }
}

/** My dates, newest first, and whether I may ask (Admins never need to). */
export function fetchMyWorkFromHome(fetchFn: typeof fetch = fetch): Promise<MyWorkFromHome> {
  return getJson(API_PATHS.workFromHome, MineSchema, fetchFn);
}

/** One person's dates, and whether they need any (Admins). */
export function fetchPersonWorkFromHome(
  staffId: number,
  fetchFn: typeof fetch = fetch,
): Promise<PersonWorkFromHome> {
  return getJson(API_PATHS.personWorkFromHome(staffId), PersonSchema, fetchFn);
}

/** Ask for dates; every Admin is told. Rejects with `InvalidFieldsError` on a field. */
export function askForWorkFromHome(
  dates: NewWorkFromHome,
  fetchFn: typeof fetch = fetch,
): Promise<WorkFromHomeDates> {
  return send(API_PATHS.workFromHome, bodyOf(dates), fetchFn);
}

/** An Admin sets dates for someone directly: Approved at once, and they are told. */
export function setWorkFromHome(
  staffId: number,
  dates: NewWorkFromHome,
  fetchFn: typeof fetch = fetch,
): Promise<WorkFromHomeDates> {
  return send(API_PATHS.personWorkFromHome(staffId), bodyOf(dates), fetchFn);
}

/** Take back my own waiting request. */
export function cancelWorkFromHome(
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<WorkFromHomeDates> {
  return send(API_PATHS.workFromHomeAction(id, "cancel"), {}, fetchFn);
}

/** Approve or decline a waiting request (Admins). */
export function answerWorkFromHome(
  id: number,
  answer: "approve" | "decline",
  fetchFn: typeof fetch = fetch,
): Promise<WorkFromHomeDates> {
  return send(API_PATHS.workFromHomeAction(id, answer), {}, fetchFn);
}

/** End Approved dates today (Admins). */
export function endWorkFromHome(
  id: number,
  fetchFn: typeof fetch = fetch,
): Promise<WorkFromHomeDates> {
  return send(API_PATHS.workFromHomeAction(id, "end"), {}, fetchFn);
}

function bodyOf(dates: NewWorkFromHome) {
  return {
    starts_on: dates.startsOn,
    ends_on: dates.endsOn === "" ? null : dates.endsOn,
    reason: dates.reason,
  };
}

async function send(path: string, body: object, fetchFn: typeof fetch): Promise<WorkFromHomeDates> {
  try {
    return await postJson(path, body, DatesSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, WORK_FROM_HOME_FIELDS) ?? refusalOf(error) ?? error;
  }
}

// The statuses the server refuses with, giving its own short reason as `detail`.
const REFUSAL_STATUSES: readonly (number | null)[] = [
  HTTP_STATUS.badRequest,
  HTTP_STATUS.forbidden,
  HTTP_STATUS.conflict,
];

function refusalOf(error: unknown): WorkFromHomeRefusedError | null {
  if (!(error instanceof ApiRequestError) || !REFUSAL_STATUSES.includes(error.status)) return null;
  const parsed = DetailAnswerSchema.safeParse(error.body);
  return parsed.success ? new WorkFromHomeRefusedError(parsed.data.detail) : null;
}
