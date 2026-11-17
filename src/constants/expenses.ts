/** Expenses: money the office pays out (GLOSSARY: Expense), with the Accounts Module (issue 36). */

import { PAYMENT_METHOD_LABELS, PaymentMethod } from "./payments";

/** What kind of Expense it is; values match the API. The starting list (spec 76c). */
export const ExpenseCategory = {
  OfficeRent: "office_rent",
  Salaries: "salaries",
  Internet: "internet",
  Electricity: "electricity",
  Marketing: "marketing",
  EducationFair: "education_fair",
  OfficeSupplies: "office_supplies",
  TeaAndSnacks: "tea_and_snacks",
  Other: "other",
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const EXPENSE_CATEGORIES = Object.values(ExpenseCategory);

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  office_rent: "Office rent",
  salaries: "Salaries",
  internet: "Internet",
  electricity: "Electricity",
  marketing: "Marketing",
  education_fair: "Education fair",
  office_supplies: "Office supplies",
  tea_and_snacks: "Tea and snacks",
  other: "Other",
};

/** How the office paid: the Payment methods, and a card. Values match the API. */
export const ExpenseMethod = { ...PaymentMethod, Card: "card" } as const;

export type ExpenseMethod = (typeof ExpenseMethod)[keyof typeof ExpenseMethod];

export const EXPENSE_METHODS = Object.values(ExpenseMethod);

export const EXPENSE_METHOD_LABELS: Record<ExpenseMethod, string> = {
  ...PAYMENT_METHOD_LABELS,
  card: "Card",
};

/** The longest "Paid to" the API accepts. */
export const EXPENSE_PAID_TO_MAX_LENGTH = 200;

/** How many months back the Money out month picker reaches, this month included. */
export const EXPENSE_MONTHS_SHOWN = 24;

export const EXPENSE_TEXT = {
  // Accounts -> Money out (spec 76c).
  moneyOut: "Money out",
  month: "Month",
  addAnExpense: "Add an expense",
  spentThisMonth: "Spent this month",
  spentIn: (month: string) => `Spent in ${month}`,
  expensesCount: (count: number) => (count === 1 ? "1 expense" : `${String(count)} expenses`),
  byType: "By type",
  everyExpense: "Every expense",
  noExpenses: "No expenses recorded this month.",
  noExpensesIn: (month: string) => `No expenses recorded in ${month}.`,
  listFailed: "We couldn't load the expenses. Please refresh the page.",
  line: (paidTo: string, date: string, method: string) => `${paidTo}, ${date}, ${method}`,
  edit: "Edit",
  editFor: (category: string, paidTo: string) => `Edit expense: ${category}, ${paidTo}`,
  // Adding, changing and deleting.
  addTitle: "Add an expense",
  editTitle: "Edit expense",
  type: "Type",
  amount: "Amount (NPR)",
  paidTo: "Paid to",
  paidToPlaceholder: "For example, Nepal Electricity Authority",
  date: "Date",
  paidBy: "Paid by",
  saveExpense: "Save expense",
  saved: "Expense saved",
  saveChanges: "Save changes",
  changesSaved: "Changes saved",
  deleteExpense: "Delete expense",
  confirmDeleteTitle: (category: string) => `Delete the ${category} expense?`,
  confirmDelete: (category: string, paidTo: string, amount: string, date: string) =>
    `${category}, ${paidTo}, ${amount} on ${date}.`,
  confirmDeleteButton: "Delete expense",
  deleted: "Expense deleted",
  deleteFailed: "We couldn't delete it. Please try again.",
  notAllowed: "Only an Admin can see or change Expenses. Refresh the page.",
  paidToRefused: "Say who it was paid to.",
  // The Admin's Home (spec 22a).
  moneyOutFootnote: (count: number, period: string) =>
    `${count === 1 ? "1 expense" : `${String(count)} expenses`}, ${period}`,
} as const;
