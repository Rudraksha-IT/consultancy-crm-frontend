import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import { PAYMENT_METHODS, type PaymentMethod } from "@/constants/payments";

import { getJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { FeeTypeRefSchema } from "./feeTypes";

const PaymentFields = {
  id: z.number().int(),
  receipt_number: z.string().min(1),
  student: z.object({ id: z.number().int(), name: z.string(), phone: z.string() }),
  amount: z.number().int().positive(),
  paid_on: z.iso.date(),
  method: z.enum(PAYMENT_METHODS),
  fee_type: FeeTypeRefSchema,
  note: z.string(),
  recorded_by: z.object({ name: z.string() }),
};

type ApiPayment = z.infer<z.ZodObject<typeof PaymentFields>>;

function toPayment(payment: ApiPayment) {
  return {
    id: payment.id,
    receiptNumber: payment.receipt_number,
    student: payment.student,
    amount: payment.amount,
    paidOn: payment.paid_on,
    method: payment.method,
    feeType: payment.fee_type,
    note: payment.note,
    recordedBy: { name: payment.recorded_by.name },
  };
}

/** One Payment as the Payments list answers it (spec 74). Dates are AD, "YYYY-MM-DD". */
export const PaymentSchema = z.object(PaymentFields).transform(toPayment);

export type Payment = z.infer<typeof PaymentSchema>;

/** One line of a receipt: a Payment as it is now (ticket 07). */
const ReceiptLineSchema = z
  .object({
    id: z.number().int(),
    fee_type: FeeTypeRefSchema,
    note: z.string(),
    amount: z.number().int().positive(),
    paid_on: z.iso.date(),
    method: z.enum(PAYMENT_METHODS),
  })
  .transform((line) => ({
    id: line.id,
    feeType: line.fee_type,
    note: line.note,
    amount: line.amount,
    paidOn: line.paid_on,
    method: line.method,
  }));

export type ReceiptLine = z.infer<typeof ReceiptLineSchema>;

/**
 * The receipt a Payment is on (spec 72-73): that Payment, then every Payment recorded with it
 * (one line each, as they are now) and their total.
 */
export const ReceiptSchema = z
  .object({
    ...PaymentFields,
    lines: z.array(ReceiptLineSchema).min(1),
    total: z.number().int().positive(),
  })
  .transform((receipt) => ({ ...toPayment(receipt), lines: receipt.lines, total: receipt.total }));

export type Receipt = z.infer<typeof ReceiptSchema>;

/**
 * A Payment as the edit form sends it: whole NPR, the day paid (AD), how, its Fee Type and a
 * short note (needed for Other).
 */
export type NewPayment = {
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  feeTypeId: number | null;
  note: string;
};

/** One line of a visit's money: a Fee Type, its note and whole NPR. */
export type NewPaymentLine = { feeTypeId: number | null; note: string; amount: number };

/** One visit's money (spec 73): the day paid (AD), how, and a Payment per line. */
export type NewPayments = {
  paidOn: string;
  method: PaymentMethod;
  lines: readonly NewPaymentLine[];
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

/** The form name of each line field the API can refuse. */
const LINE_FIELDS = { fee_type: "feeTypeId", note: "note", amount: "amount" } as const;

const LinesRefusalSchema = z.object({
  paid_on: z.array(z.string()).optional(),
  method: z.array(z.string()).optional(),
  lines: z
    .union([z.array(z.string()), z.array(z.record(z.string(), z.array(z.string())))])
    .optional(),
});

type LinesRefusal = z.infer<typeof LinesRefusalSchema>;

/**
 * A refusal of a visit's Payments, named by form fields: `paidOn`, `method`, `lines` for the lines
 * as a whole, and `lines.<n>.<field>` for one line's field. Null when no field can be named.
 */
function toLinesErrors(error: unknown): InvalidFieldsError<string> | null {
  const refusal = linesRefusalOf(error);
  if (refusal === null) return null;
  const fieldErrors = { ...visitErrorsOf(refusal), ...linesErrorsOf(refusal.lines ?? []) };
  return Object.keys(fieldErrors).length === 0 ? null : new InvalidFieldsError(fieldErrors);
}

function linesRefusalOf(error: unknown): LinesRefusal | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const parsed = LinesRefusalSchema.safeParse(error.body);
  return parsed.success ? parsed.data : null;
}

/** The refusals of the visit's own fields: its date and method. */
function visitErrorsOf(refusal: LinesRefusal): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries({
    paidOn: refusal.paid_on,
    method: refusal.method,
  })) {
    if (messages !== undefined) fieldErrors[field] = messages;
  }
  return fieldErrors;
}

/** The lines' refusals: messages about all of them as `lines`, one line's as `lines.<n>.<field>`. */
function linesErrorsOf(lines: NonNullable<LinesRefusal["lines"]>): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  lines.forEach((refusal, index) => {
    if (typeof refusal === "string") {
      fieldErrors.lines = [...(fieldErrors.lines ?? []), refusal];
      return;
    }
    for (const [apiField, field] of Object.entries(LINE_FIELDS)) {
      const messages = refusal[apiField];
      if (messages !== undefined) fieldErrors[`lines.${String(index)}.${field}`] = messages;
    }
  });
  return fieldErrors;
}

/**
 * Record one visit's money from the Student, a Payment per line, all on one receipt (spec 73),
 * and return that receipt. Rejects with `InvalidFieldsError` for refused fields (see
 * `toLinesErrors` for their names), and `ApiRequestError` when not allowed.
 */
export async function recordPayments(
  studentId: number,
  visit: NewPayments,
  fetchFn: typeof fetch = fetch,
): Promise<Receipt> {
  const body = {
    paid_on: visit.paidOn,
    method: visit.method,
    lines: visit.lines.map((line) => ({
      fee_type: line.feeTypeId,
      note: line.note,
      amount: line.amount,
    })),
  };
  try {
    return await postJson(API_PATHS.studentPayments(studentId), body, ReceiptSchema, fetchFn);
  } catch (error) {
    throw toLinesErrors(error) ?? error;
  }
}

/** The receipt a Payment is on, with every line as it is now (spec 72-73). */
export function fetchReceipt(paymentId: number, fetchFn: typeof fetch = fetch): Promise<Receipt> {
  return getJson(API_PATHS.payment(paymentId), ReceiptSchema, fetchFn);
}

/** One page of the Admin's Payments list, with the total of every match (spec 74). */
export const PaymentPageSchema = z
  .object({
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    results: z.array(PaymentSchema),
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
 * Replace a Payment's amount, date, method, Fee Type and note (Admins; spec 75) and return it as
 * it is now; it keeps its receipt number. Rejects with `InvalidFieldsError` for refused fields.
 */
export async function changePayment(
  paymentId: number,
  payment: NewPayment,
  fetchFn: typeof fetch = fetch,
): Promise<Payment> {
  try {
    return await putJson(API_PATHS.payment(paymentId), apiBody(payment), PaymentSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** Delete a Payment (Admins; spec 75). History keeps its details. */
export function deletePayment(paymentId: number, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.payment(paymentId), fetchFn);
}
