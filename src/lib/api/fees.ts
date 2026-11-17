import { z } from "zod";

import { API_PATHS } from "@/constants/api";

import { getJson, postJson, putJson, sendWithoutBody } from "./client";
import { toFieldErrors } from "./fieldErrors";

const Npr = z.number().int().nonnegative();

/** One Fee as the API answers it (spec 76a). */
const FeeSchema = z
  .object({
    id: z.number().int(),
    purpose: z.string(),
    amount: z.number().int().positive(),
    added_by: z.object({ name: z.string() }),
  })
  .transform((fee) => ({
    id: fee.id,
    purpose: fee.purpose,
    amount: fee.amount,
    addedBy: { name: fee.added_by.name },
  }));

export type Fee = z.infer<typeof FeeSchema>;

/**
 * A Student's Fees and their total, and the Balance (spec 76b). The Balance is null for anyone
 * but an Admin: Payments and totals stay with the Admin (spec 73).
 */
const StudentFeesSchema = z
  .object({
    fees: z.array(FeeSchema),
    total: Npr,
    balance: z.object({ paid: Npr, still_to_pay: Npr, overpaid: Npr }).nullable(),
  })
  .transform((answer) => ({
    fees: answer.fees,
    total: answer.total,
    balance:
      answer.balance === null
        ? null
        : {
            paid: answer.balance.paid,
            stillToPay: answer.balance.still_to_pay,
            overpaid: answer.balance.overpaid,
          },
  }));

export type StudentFees = z.infer<typeof StudentFeesSchema>;

/** A Fee as the form sends it: what it's for and whole NPR. */
export type NewFee = { purpose: string; amount: number };

const FEE_FIELDS: Record<keyof NewFee, string> = { purpose: "purpose", amount: "amount" };

/** The Student's Fees, their total and (for Admins) the Balance (Accounts on). */
export function fetchStudentFees(
  studentId: number,
  fetchFn: typeof fetch = fetch,
): Promise<StudentFees> {
  return getJson(API_PATHS.studentFees(studentId), StudentFeesSchema, fetchFn);
}

/**
 * Add a Fee to the Student (their counsellor or an Admin; spec 76a) and return their Fees.
 * Rejects with `InvalidFieldsError` for refused fields.
 */
export async function addFee(
  studentId: number,
  fee: NewFee,
  fetchFn: typeof fetch = fetch,
): Promise<StudentFees> {
  try {
    return await postJson(API_PATHS.studentFees(studentId), fee, StudentFeesSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, FEE_FIELDS) ?? error;
  }
}

/** Replace a Fee's purpose and amount and return the Student's Fees. */
export async function changeFee(
  feeId: number,
  fee: NewFee,
  fetchFn: typeof fetch = fetch,
): Promise<StudentFees> {
  try {
    return await putJson(API_PATHS.fee(feeId), fee, StudentFeesSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, FEE_FIELDS) ?? error;
  }
}

/** Delete a Fee. History keeps it. */
export function deleteFee(feeId: number, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.fee(feeId), fetchFn);
}

/** One page of the Students who still owe, most first, with the office's totals (spec 76b). */
const OwingPageSchema = z
  .object({
    count: Npr,
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    totals: z.object({
      agreed: Npr,
      collected: Npr,
      still_to_collect: Npr,
      students: Npr,
      owing: Npr,
    }),
    results: z.array(
      z.object({
        student: z.object({ id: z.number().int(), name: z.string() }),
        fees: Npr,
        paid: Npr,
        still_to_pay: Npr,
      }),
    ),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    totals: {
      agreed: page.totals.agreed,
      collected: page.totals.collected,
      stillToCollect: page.totals.still_to_collect,
      students: page.totals.students,
      owing: page.totals.owing,
    },
    rows: page.results.map((row) => ({
      student: row.student,
      fees: row.fees,
      paid: row.paid,
      stillToPay: row.still_to_pay,
    })),
  }));

export type OwingPage = z.infer<typeof OwingPageSchema>;
export type OwingStudent = OwingPage["rows"][number];

/** One page of Students who still owe (Admins, Accounts on). */
export function fetchOwingStudents(
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<OwingPage> {
  return getJson(`${API_PATHS.accountsStudentFees}?page=${String(page)}`, OwingPageSchema, fetchFn);
}
