import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";

import { getJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import { FeeTypeRefSchema } from "./feeTypes";

const Npr = z.number().int().nonnegative();

/** One Fee as the API answers it (spec 76a). */
const FeeSchema = z
  .object({
    id: RecordIdSchema,
    fee_type: FeeTypeRefSchema,
    note: z.string(),
    amount: z.number().int().positive(),
    added_by: z.object({ name: z.string() }),
  })
  .transform((fee) => ({
    id: fee.id,
    feeType: fee.fee_type,
    note: fee.note,
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

/** A Fee as the form sends it: its Fee Type, a short note (needed for Other) and whole NPR. */
export type NewFee = { feeTypeId: number | null; note: string; amount: number };

const FEE_FIELDS: Record<keyof NewFee, string> = {
  feeTypeId: "fee_type",
  note: "note",
  amount: "amount",
};

function feeBody(fee: NewFee): Record<string, unknown> {
  return { fee_type: fee.feeTypeId, note: fee.note, amount: fee.amount };
}

/** The Student's Fees, their total and (for Admins) the Balance (Accounts on). */
export function fetchStudentFees(
  studentId: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<StudentFees> {
  return getJson(API_PATHS.studentFees(studentId), StudentFeesSchema, fetchFn);
}

/**
 * Add a Fee to the Student (their counsellor or an Admin; spec 76a) and return their Fees.
 * Rejects with `InvalidFieldsError` for refused fields.
 */
export async function addFee(
  studentId: RecordId,
  fee: NewFee,
  fetchFn: typeof fetch = fetch,
): Promise<StudentFees> {
  try {
    return await postJson(
      API_PATHS.studentFees(studentId),
      feeBody(fee),
      StudentFeesSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, FEE_FIELDS) ?? error;
  }
}

/** Replace a Fee's Fee Type, note and amount and return the Student's Fees. */
export async function changeFee(
  feeId: RecordId,
  fee: NewFee,
  fetchFn: typeof fetch = fetch,
): Promise<StudentFees> {
  try {
    return await putJson(API_PATHS.fee(feeId), feeBody(fee), StudentFeesSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, FEE_FIELDS) ?? error;
  }
}

/** Delete a Fee. History keeps it. */
export function deleteFee(feeId: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
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
        student: z.object({ id: RecordIdSchema, name: z.string() }),
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

/**
 * One page of Students who still owe, leaving out Lost Students: the same rules as Fees by type,
 * for the Admin's Home (spec 87, 91).
 */
export function fetchCountedOwingStudents(
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<OwingPage> {
  return getJson(
    `${API_PATHS.accountsStudentFees}?page=${String(page)}&leave_out=lost`,
    OwingPageSchema,
    fetchFn,
  );
}
