import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { Stage } from "@/constants/stages";

import { getJson } from "../core/client";

const Npr = z.number().int().nonnegative();

/** A Fee Type on Fees by type: a hidden one still shows its money (spec 69). */
const ByTypeFeeTypeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  hidden: z.boolean(),
});

/**
 * Fees by type (spec 79-81): To collect = Received + Remaining, what Lost Students left (not
 * counted), how many Students still owe, and one row per Fee Type in the office's order.
 */
const FeesByTypeSchema = z
  .object({
    totals: z.object({
      to_collect: Npr,
      received: Npr,
      remaining: Npr,
      lost_not_counted: Npr,
      owing: Npr,
    }),
    fee_types: z.array(z.object({ fee_type: ByTypeFeeTypeSchema, fees: Npr, received: Npr })),
  })
  .transform((answer) => ({
    totals: {
      toCollect: answer.totals.to_collect,
      received: answer.totals.received,
      remaining: answer.totals.remaining,
      lostNotCounted: answer.totals.lost_not_counted,
      owing: answer.totals.owing,
    },
    feeTypes: answer.fee_types.map((row) => ({
      feeType: row.fee_type,
      fees: row.fees,
      received: row.received,
    })),
  }));

export type FeesByType = z.infer<typeof FeesByTypeSchema>;
export type FeeTypeMoney = FeesByType["feeTypes"][number];

/** The Students counted in Remaining, or the Lost ones (spec 82, 89). */
export type FeeTypePart = "counted" | "lost";

/** One page of one Fee Type's Students, most still to pay first (spec 82, 89). */
const FeeTypeStudentsSchema = z
  .object({
    fee_type: ByTypeFeeTypeSchema,
    fees: Npr,
    received: Npr,
    count: Npr,
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    results: z.array(
      z.object({
        student: z.object({ id: z.number().int(), name: z.string(), stage: z.enum(Stage) }),
        lost_reason: z.string(),
        fee: Npr,
        paid: Npr,
        still_to_pay: Npr,
      }),
    ),
  })
  .transform((page) => ({
    feeType: page.fee_type,
    fees: page.fees,
    received: page.received,
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    rows: page.results.map((row) => ({
      student: row.student,
      lostReason: row.lost_reason,
      fee: row.fee,
      paid: row.paid,
      stillToPay: row.still_to_pay,
    })),
  }));

export type FeeTypeStudents = z.infer<typeof FeeTypeStudentsSchema>;
export type FeeTypeStudent = FeeTypeStudents["rows"][number];

/** Fees by type for the whole office, for all time (Admins, Accounts on). */
export function fetchFeesByType(fetchFn: typeof fetch = fetch): Promise<FeesByType> {
  return getJson(API_PATHS.feesByType, FeesByTypeSchema, fetchFn);
}

/** One page of one Fee Type's counted or Lost Students (Admins, Accounts on). */
export function fetchFeeTypeStudents(
  feeTypeId: number,
  part: FeeTypePart,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<FeeTypeStudents> {
  const query = new URLSearchParams({ part, page: String(page) });
  return getJson(
    `${API_PATHS.feeTypeStudents(feeTypeId)}?${query.toString()}`,
    FeeTypeStudentsSchema,
    fetchFn,
  );
}
