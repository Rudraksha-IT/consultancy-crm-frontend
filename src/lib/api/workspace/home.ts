import { z } from "zod";

import { RecordIdSchema } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { Stage } from "@/constants/stages";
import { COUNTRIES } from "@/constants/students";
import { APPOINTMENTS } from "@/constants/visas";

import { getJson } from "../core/client";
import { APPOINTMENT_AT } from "../core/types";

const PERCENT_MAX = 100;
const Count = z.number().int().nonnegative();
const PersonSchema = z.object({ id: RecordIdSchema, name: z.string() });
const StudentRefSchema = z.object({ id: RecordIdSchema, name: z.string() });

/** One Student on a Home: how far along they are, the next step and their documents. */
const ProgressRowSchema = z
  .object({
    student: z.object({
      id: RecordIdSchema,
      name: z.string(),
      stage: z.enum(Stage),
      country: z.enum(COUNTRIES),
      assigned_counsellor: PersonSchema.nullable(),
    }),
    percent: z.number().int().min(0).max(PERCENT_MAX),
    next_step: z.string(),
    is_done: z.boolean(),
    documents: z.object({
      done: Count,
      total: Count,
      rejected: Count,
      waiting: Count,
      missing: Count,
    }),
  })
  .transform(({ student, next_step, is_done, ...rest }) => ({
    student: {
      id: student.id,
      name: student.name,
      stage: student.stage,
      country: student.country,
      assignedCounsellor: student.assigned_counsellor,
    },
    percent: rest.percent,
    nextStep: next_step,
    isDone: is_done,
    documents: rest.documents,
  }));

export type ProgressRow = z.infer<typeof ProgressRowSchema>;

const ProgressListSchema = z
  .object({ count: Count, results: z.array(ProgressRowSchema) })
  .transform(({ count, results }) => ({ count, rows: results }));

export type ProgressList = z.infer<typeof ProgressListSchema>;

const PipelineSchema = z.object({
  counts: z.object({
    lead: Count,
    counselling: Count,
    applying: Count,
    offer: Count,
    visa: Count,
    lost: Count,
  }) satisfies z.ZodType<Record<Stage, number>>,
});

/**
 * Students furthest along first (spec 22a): the viewer's own (`mine`) or anyone's, at most
 * `limit` of them, with how many there are in all. Lost Students are left out.
 */
export function fetchProgress(
  { mine, limit }: { mine: boolean; limit: number },
  fetchFn: typeof fetch = fetch,
): Promise<ProgressList> {
  const query = new URLSearchParams({ counsellor: mine ? "me" : "any", limit: String(limit) });
  return getJson(`${API_PATHS.homeProgress}?${query.toString()}`, ProgressListSchema, fetchFn);
}

/** How many Students are at each Stage, Lost included (the Admin's pipeline). */
export async function fetchPipeline(fetchFn: typeof fetch = fetch): Promise<Record<Stage, number>> {
  const answer = await getJson(API_PATHS.homePipeline, PipelineSchema, fetchFn);
  return answer.counts;
}

/** What waits on a Counsellor or Admin (spec 22a1): counts, and the first few appointments. */
const WaitingSchema = z
  .object({
    documents_waiting: Count,
    transfer_requests_waiting: Count,
    /** Admins: what waits in the Bin (issue 79); 0 for everyone else. */
    documents_in_bin: Count.default(0),
    /** Admins with Clock-in on: Work From Home requests waiting, and whose is oldest (issue 87). */
    work_from_home_requests: z
      .object({ count: Count, first_staff_id: RecordIdSchema.nullable() })
      .default({ count: 0, first_staff_id: null }),
    visa_appointments: z.object({
      count: Count,
      results: z.array(
        z.object({
          visa_id: RecordIdSchema,
          student: StudentRefSchema,
          kind: z.enum(APPOINTMENTS),
          at: APPOINTMENT_AT,
        }),
      ),
    }),
  })
  .transform(
    ({
      documents_waiting,
      transfer_requests_waiting,
      documents_in_bin,
      work_from_home_requests,
      visa_appointments,
    }) => ({
      documents: documents_waiting,
      transferRequests: transfer_requests_waiting,
      inBin: documents_in_bin,
      workFromHome: {
        count: work_from_home_requests.count,
        firstStaffId: work_from_home_requests.first_staff_id,
      },
      appointmentCount: visa_appointments.count,
      appointments: visa_appointments.results.map(({ visa_id, student, kind, at }) => ({
        visaId: visa_id,
        student,
        kind,
        at,
      })),
    }),
  );

export type Waiting = z.infer<typeof WaitingSchema>;

/**
 * What's waiting on me (spec 22a1): Documents to check (my Students', or everyone's for an
 * Admin), Transfer Requests to answer, and a Counsellor's Visa appointments in the next 7 days.
 */
export function fetchWaiting(fetchFn: typeof fetch = fetch): Promise<Waiting> {
  return getJson(API_PATHS.homeWaiting, WaitingSchema, fetchFn);
}
