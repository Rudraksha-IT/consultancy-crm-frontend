import { z } from "zod";

import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { API_PATHS } from "@/constants/api";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  type ExpenseCategory,
  type ExpenseMethod,
} from "@/constants/expenses";

import { getJson, postJson, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";

const Npr = z.number().int().nonnegative();

/** One Expense as the API answers it (spec 76c). The day is AD, "YYYY-MM-DD". */
const ExpenseSchema = z
  .object({
    id: RecordIdSchema,
    spent_on: z.iso.date(),
    category: z.enum(EXPENSE_CATEGORIES),
    paid_to: z.string(),
    amount: z.number().int().positive(),
    method: z.enum(EXPENSE_METHODS),
    recorded_by: z.object({ name: z.string() }),
  })
  .transform((expense) => ({
    id: expense.id,
    spentOn: expense.spent_on,
    category: expense.category,
    paidTo: expense.paid_to,
    amount: expense.amount,
    method: expense.method,
    recordedBy: { name: expense.recorded_by.name },
  }));

export type Expense = z.infer<typeof ExpenseSchema>;

/** One page of a month's Expenses, newest first, with the whole month's totals. */
const ExpensePageSchema = z
  .object({
    month: z.string().regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/),
    total: Npr,
    count: Npr,
    page: z.number().int().positive(),
    page_size: z.number().int().positive(),
    by_category: z.array(z.object({ category: z.enum(EXPENSE_CATEGORIES), amount: Npr })),
    results: z.array(ExpenseSchema),
  })
  .transform((page) => ({
    month: page.month,
    total: page.total,
    count: page.count,
    page: page.page,
    pageSize: page.page_size,
    byCategory: page.by_category,
    rows: page.results,
  }));

export type ExpensePage = z.infer<typeof ExpensePageSchema>;

/** An Expense as the form sends it. */
export type NewExpense = {
  spentOn: string;
  category: ExpenseCategory;
  paidTo: string;
  amount: number;
  method: ExpenseMethod;
};

const API_FIELDS: Record<keyof NewExpense, string> = {
  spentOn: "spent_on",
  category: "category",
  paidTo: "paid_to",
  amount: "amount",
  method: "method",
};

function apiBody(expense: NewExpense): Record<string, unknown> {
  return {
    spent_on: expense.spentOn,
    category: expense.category,
    paid_to: expense.paidTo,
    amount: expense.amount,
    method: expense.method,
  };
}

/** One page of a month's Expenses ("YYYY-MM", AD; null for this month). Admins, Accounts on. */
export function fetchExpenses(
  month: string | null,
  page: number,
  fetchFn: typeof fetch = fetch,
): Promise<ExpensePage> {
  const query = new URLSearchParams();
  if (month !== null) query.set("month", month);
  query.set("page", String(page));
  return getJson(`${API_PATHS.expenses}?${query.toString()}`, ExpensePageSchema, fetchFn);
}

/** Record an Expense. Rejects with `InvalidFieldsError` for refused fields. */
export async function addExpense(
  expense: NewExpense,
  fetchFn: typeof fetch = fetch,
): Promise<Expense> {
  try {
    return await postJson(API_PATHS.expenses, apiBody(expense), ExpenseSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** Replace every detail of an Expense and return it. */
export async function changeExpense(
  expenseId: RecordId,
  expense: NewExpense,
  fetchFn: typeof fetch = fetch,
): Promise<Expense> {
  try {
    return await putJson(API_PATHS.expense(expenseId), apiBody(expense), ExpenseSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, API_FIELDS) ?? error;
  }
}

/** Delete an Expense. */
export function deleteExpense(expenseId: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.expense(expenseId), fetchFn);
}
