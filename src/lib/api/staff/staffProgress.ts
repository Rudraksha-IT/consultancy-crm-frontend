import { z } from "zod";

import { RecordIdSchema } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import { ROLES } from "@/constants/roles";
import { PROGRESS_CHANGE_KINDS, PROGRESS_COUNTS } from "@/constants/staffProgress";
import { HISTORY_KINDS } from "@/constants/students";

import { getJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import type { DateRange } from "../workspace/reports";
import { StaffStatus } from "../core/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const Day = z.string().regex(ISO_DATE);
const Count = z.number().int().nonnegative();

const CardSchema = z
  .object({
    count: z.enum(PROGRESS_COUNTS),
    value: Count,
    counted_from: Day.nullable(),
    amount: Count.nullable(),
  })
  .transform(({ counted_from, ...rest }) => ({ ...rest, countedFrom: counted_from }));

/** One number card: the count, its number, when counting began if later, and any NPR amount. */
export type ProgressCard = z.infer<typeof CardSchema>;

const ChangeSchema = z.object({
  kind: z.enum([...HISTORY_KINDS, ...PROGRESS_CHANGE_KINDS]),
  at: z.iso.datetime({ offset: true }),
  before: z.string(),
  after: z.string(),
  detail: z.string(),
  student: z.object({ id: RecordIdSchema, name: z.string() }).nullable(),
});

/** One change they made: a History kind, or a Visit, Application, Visa or class day. */
export type ProgressChange = z.infer<typeof ChangeSchema>;

const StaffProgressSchema = z
  .object({
    staff: z.object({
      id: z.number().int().positive(),
      name: z.string(),
      job_title: z.string(),
      mobile: z.string(),
      role: z.enum(ROLES),
      status: z.enum(StaffStatus),
    }),
    from: Day,
    to: Day,
    cards: z.array(CardSchema),
    days: z.array(z.object({ day: Day, entries: z.array(ChangeSchema) })),
    more: z.boolean(),
  })
  .transform(({ staff: { job_title, ...staff }, ...rest }) => ({
    ...rest,
    staff: { ...staff, jobTitle: job_title },
  }));

/** A Staff member's Progress for a period: who, the cards, and the changes day by day. */
export type StaffProgress = z.infer<typeof StaffProgressSchema>;

const RANGE_FIELDS: Record<keyof DateRange, string> = { from: "from", to: "to" };

/** One Staff member's Progress between the dates (both included, at most one year). */
export async function fetchStaffProgress(
  staffId: number,
  range: DateRange,
  fetchFn: typeof fetch = fetch,
): Promise<StaffProgress> {
  const query = new URLSearchParams({ from: range.from, to: range.to }).toString();
  try {
    return await getJson(
      `${API_PATHS.staffProgress(staffId)}?${query}`,
      StaffProgressSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, RANGE_FIELDS) ?? error;
  }
}
