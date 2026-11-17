import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { COMMISSION_STATUSES, type CommissionStatus } from "@/constants/commission";

import { getJson, postJson, putJson } from "./client";
import { toFieldErrors } from "./fieldErrors";

const Npr = z.number().int().nonnegative();
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** One Commission as the API answers it (spec 76d). The Intake is "YYYY-MM", days are AD. */
const CommissionSchema = z
  .object({
    id: z.number().int(),
    student: z.object({ id: z.number().int(), name: z.string() }),
    university: z.object({ id: z.number().int(), name: z.string() }),
    intake: z.string().regex(MONTH),
    amount: z.number().int().positive(),
    status: z.enum(COMMISSION_STATUSES),
    received_on: z.iso.date().nullable(),
  })
  .transform(({ received_on, ...commission }) => ({ ...commission, receivedOn: received_on }));

export type Commission = z.infer<typeof CommissionSchema>;

/** One page of Commission, newest first, with the totals across all of it. */
const CommissionPageSchema = z
  .object({
    count: Npr,
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    totals: z.object({
      waiting_for_enrolment: Npr,
      claim_sent: Npr,
      received: Npr,
      to_come: Npr,
    }),
    results: z.array(CommissionSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    totals: {
      waitingForEnrolment: page.totals.waiting_for_enrolment,
      claimSent: page.totals.claim_sent,
      received: page.totals.received,
      toCome: page.totals.to_come,
    },
    rows: page.results,
  }));

export type CommissionPage = z.infer<typeof CommissionPageSchema>;

const ReceivedSchema = z.object({ total: Npr, count: Npr });

export type ReceivedCommission = z.infer<typeof ReceivedSchema>;

/** Commission as the form sends it. */
export type NewCommission = {
  studentId: number;
  universityId: number;
  intake: string;
  amount: number;
};

const API_FIELDS: Record<keyof NewCommission, string> = {
  studentId: "student",
  universityId: "university",
  intake: "intake",
  amount: "amount",
};

/** One page of every Commission (Admins, Accounts on). */
export function fetchCommission(
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<CommissionPage> {
  return getJson(`${API_PATHS.commission}?page=${String(page)}`, CommissionPageSchema, fetchFn);
}

/** Record Commission, Waiting for enrolment. Rejects with `InvalidFieldsError` for fields. */
export async function addCommission(
  commission: NewCommission,
  fetchFn: typeof fetch = fetch,
): Promise<Commission> {
  const body = {
    student: commission.studentId,
    university: commission.universityId,
    intake: commission.intake,
    amount: commission.amount,
  };
  try {
    return await postJson(API_PATHS.commission, body, CommissionSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** Move Commission to `status`; Received records the day (spec 76d). */
export function changeCommissionStatus(
  commissionId: number,
  status: CommissionStatus,
  fetchFn: typeof fetch = fetch,
): Promise<Commission> {
  return putJson(API_PATHS.commissionStatus(commissionId), { status }, CommissionSchema, fetchFn);
}

/** Commission Received between two days ("YYYY-MM-DD", AD; "" leaves an end open). */
export function fetchReceivedCommission(
  days: { from: string; to: string },
  fetchFn: typeof fetch = fetch,
): Promise<ReceivedCommission> {
  const query = new URLSearchParams();
  if (days.from !== "") query.set("from", days.from);
  if (days.to !== "") query.set("to", days.to);
  const search = query.toString();
  const path =
    search === "" ? API_PATHS.commissionReceived : `${API_PATHS.commissionReceived}?${search}`;
  return getJson(path, ReceivedSchema, fetchFn);
}
