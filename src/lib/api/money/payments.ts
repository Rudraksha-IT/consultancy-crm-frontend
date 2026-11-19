import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/payments";

import { getJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import { FeeTypeRefSchema } from "./feeTypes";

/** A Payment's receipt as the API answers it (spec 72). Dates are AD, "YYYY-MM-DD". */
export const ReceiptSchema = z
  .object({
    id: z.number().int(),
    receipt_number: z.string().min(1),
    student: z.object({ id: z.number().int(), name: z.string(), phone: z.string() }),
    amount: z.number().int().positive(),
    paid_on: z.iso.date(),
    method: z.enum(PAYMENT_METHODS),
    fee_type: FeeTypeRefSchema,
    note: z.string(),
    recorded_by: z.object({ name: z.string() }),
  })
  .transform((receipt) => ({
    id: receipt.id,
    receiptNumber: receipt.receipt_number,
    student: receipt.student,
    amount: receipt.amount,
    paidOn: receipt.paid_on,
    method: receipt.method,
    feeType: receipt.fee_type,
    note: receipt.note,
    recordedBy: { name: receipt.recorded_by.name },
  }));

export type Receipt = z.infer<typeof ReceiptSchema>;

/**
 * A Payment as the form sends it: whole NPR, the day paid (AD), how, its Fee Type and a short
 * note (needed for Other).
 */
export type NewPayment = {
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  feeTypeId: number | null;
  note: string;
};

type PaymentField = keyof NewPayment;

const API_FIELDS: Record<PaymentField, string> = {
  amount: "amount",
  paidOn: "paid_on",
  method: "method",
  feeTypeId: "fee_type",
  note: "note",
};

function apiBody(payment: NewPayment): Record<string, unknown> {
  return {
    amount: payment.amount,
    paid_on: payment.paidOn,
    method: payment.method,
    fee_type: payment.feeTypeId,
    note: payment.note,
  };
}

/**
 * Record a Payment from the Student (spec 71) and return its receipt. Rejects with
 * `InvalidFieldsError` for refused fields, and `ApiRequestError` when not allowed.
 */
export async function recordPayment(
  studentId: number,
  payment: NewPayment,
  fetchFn: typeof fetch = fetch,
): Promise<Receipt> {
  try {
    return await postJson(
      API_PATHS.studentPayments(studentId),
      apiBody(payment),
      ReceiptSchema,
      fetchFn,
    );
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** One page of the Admin's Payments list, with the total of every match (spec 74). */
export const PaymentPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    results: z.array(ReceiptSchema),
  })
  .transform((page) => ({
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    total: page.total,
    rows: page.results,
  }));

export type PaymentPage = z.infer<typeof PaymentPageSchema>;

/** The Payments list's filters. Empty text (or no Student) means "any". Dates are AD. */
export type PaymentFilters = {
  from: string;
  to: string;
  /** A Student's name or phone, or a receipt number. */
  search: string;
  feeTypeId: number | null;
  studentId: number | null;
};

type FilterField = "from" | "to" | "search" | "feeTypeId";

const FILTER_FIELDS: Record<FilterField, string> = {
  from: "from",
  to: "to",
  search: "q",
  feeTypeId: "fee_type",
};

/** The filters that are set, by their API names; the Student first. */
export function paymentFilterQuery(filters: PaymentFilters): Record<string, string> {
  const query: Record<string, string> = {};
  if (filters.studentId !== null) query.student = String(filters.studentId);
  for (const field of ["from", "to", "search"] as const) {
    const value = filters[field].trim();
    if (value !== "") query[FILTER_FIELDS[field]] = value;
  }
  if (filters.feeTypeId !== null) query[FILTER_FIELDS.feeTypeId] = String(filters.feeTypeId);
  return query;
}

/**
 * One page of Payments matching the filters, newest first (Admins, Accounts on). Rejects with
 * `InvalidFieldsError` for refused filters.
 */
export async function fetchPayments(
  filters: PaymentFilters,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<PaymentPage> {
  const query = new URLSearchParams(paymentFilterQuery(filters));
  query.set("page", String(page));
  try {
    return await getJson(`${API_PATHS.payments}?${query.toString()}`, PaymentPageSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, FILTER_FIELDS) ?? error;
  }
}

/**
 * Replace a Payment's amount, date, method, Fee Type and note (Admins; spec 75) and return its
 * receipt. Rejects with `InvalidFieldsError` for refused fields.
 */
export async function changePayment(
  paymentId: number,
  payment: NewPayment,
  fetchFn: typeof fetch = fetch,
): Promise<Receipt> {
  try {
    return await putJson(API_PATHS.payment(paymentId), apiBody(payment), ReceiptSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** Delete a Payment (Admins; spec 75). History keeps its details. */
export function deletePayment(paymentId: number, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.payment(paymentId), fetchFn);
}
