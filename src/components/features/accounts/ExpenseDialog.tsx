"use client";

import { useId, useState, type SubmitEvent } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DateField } from "@/components/ui/DateField";
import type { IconName } from "@/components/ui/Icon";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { HTTP_STATUS } from "@/constants/api";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_METHOD_LABELS,
  EXPENSE_METHODS,
  EXPENSE_TEXT,
  ExpenseCategory,
  ExpenseMethod,
} from "@/constants/expenses";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_MAX_AMOUNT } from "@/constants/payments";
import {
  addExpense,
  ApiRequestError,
  changeExpense,
  deleteExpense,
  InvalidFieldsError,
  type Expense,
  type NewExpense,
} from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

// The same words the server uses, so a refusal reads the same wherever it comes from.
const AMOUNT_MESSAGE = `Enter a whole amount from ${formatNpr(1)} to ${formatNpr(PAYMENT_MAX_AMOUNT)}.`;
const WHOLE_NUMBER = /^[0-9]+$/;

const CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: EXPENSE_CATEGORY_LABELS[category],
}));

const METHOD_OPTIONS = EXPENSE_METHODS.map((method) => ({
  value: method,
  label: EXPENSE_METHOD_LABELS[method],
}));

type ExpenseDialogProps = {
  /** The Expense being changed; null to add a new one. */
  expense: Expense | null;
  onClose: () => void;
  /** Saved (the Expense as it is now) or deleted (null), with the toast to show. */
  onSaved: (expense: Expense | null, toast: string) => void;
};

/** Add an Expense, or change one and delete it after confirming (spec 76c). Admins only. */
export function ExpenseDialog({ expense, onClose, onSaved }: ExpenseDialogProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  if (expense !== null && isConfirmingDelete) {
    return <DeleteExpenseDialog expense={expense} onClose={onClose} onSaved={onSaved} />;
  }
  return (
    <ExpenseForm
      expense={expense}
      onClose={onClose}
      onSaved={onSaved}
      onDelete={() => {
        setIsConfirmingDelete(true);
      }}
    />
  );
}

type FormCopy = { title: string; saveLabel: string; icon: IconName };

function formCopy(expense: Expense | null): FormCopy {
  if (expense === null) {
    return { title: EXPENSE_TEXT.addTitle, saveLabel: EXPENSE_TEXT.saveExpense, icon: "check" };
  }
  return { title: EXPENSE_TEXT.editTitle, saveLabel: EXPENSE_TEXT.saveChanges, icon: "check" };
}

type ExpenseFormProps = ExpenseDialogProps & { onDelete: () => void };

function ExpenseForm({ expense, onClose, onSaved, onDelete }: ExpenseFormProps) {
  const formId = useId();
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? todayIso());
  const { isSaving, fieldErrors, failure, save } = useFormSave(expenseFailure);
  const copy = formCopy(expense);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      const details = readExpense(form, spentOn);
      if (expense === null) onSaved(await addExpense(details), EXPENSE_TEXT.saved);
      else onSaved(await changeExpense(expense.id, details), EXPENSE_TEXT.changesSaved);
    });
  }

  return (
    <SaveDialog
      title={copy.title}
      formId={formId}
      saveLabel={copy.saveLabel}
      saveIcon={copy.icon}
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      {...(expense !== null && {
        sideAction: (
          <Button variant="ghost" icon="trash" onClick={onDelete}>
            {EXPENSE_TEXT.deleteExpense}
          </Button>
        ),
      })}
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <ExpenseFields
          expense={expense}
          spentOn={spentOn}
          onSpentOn={setSpentOn}
          fieldErrors={fieldErrors}
        />
      </form>
    </SaveDialog>
  );
}

type ExpenseFieldsProps = {
  expense: Expense | null;
  spentOn: string;
  onSpentOn: (spentOn: string) => void;
  fieldErrors: Partial<Record<string, string[]>>;
};

/** Type, amount, who it was paid to, the day and how: the prototype's order. */
function ExpenseFields({ expense, spentOn, onSpentOn, fieldErrors }: ExpenseFieldsProps) {
  const dates = useDates();
  const start = startingValues(expense);
  return (
    <div className="tablet:grid-cols-2 grid gap-5">
      <SelectField
        label={EXPENSE_TEXT.type}
        name="category"
        options={CATEGORY_OPTIONS}
        defaultValue={start.category}
        errors={fieldErrors.category}
      />
      <TextField
        label={EXPENSE_TEXT.amount}
        name="amount"
        type="number"
        inputMode="numeric"
        min="1"
        defaultValue={start.amount}
        errors={fieldErrors.amount}
      />
      <TextField
        label={EXPENSE_TEXT.paidTo}
        name="paidTo"
        placeholder={EXPENSE_TEXT.paidToPlaceholder}
        defaultValue={start.paidTo}
        errors={fieldErrors.paidTo}
      />
      <DateField
        label={EXPENSE_TEXT.date}
        name="spentOn"
        display={dates.display}
        max={todayIso()}
        value={spentOn}
        onChange={onSpentOn}
        errors={fieldErrors.spentOn}
      />
      <SelectField
        label={EXPENSE_TEXT.paidBy}
        name="method"
        options={METHOD_OPTIONS}
        defaultValue={start.method}
        errors={fieldErrors.method}
      />
    </div>
  );
}

/** What the fields start with: the Expense being changed, or Office rent and Cash for a new one. */
function startingValues(expense: Expense | null) {
  if (expense === null) {
    return {
      category: ExpenseCategory.OfficeRent,
      amount: "",
      paidTo: "",
      method: ExpenseMethod.Cash,
    };
  }
  return { ...expense, amount: String(expense.amount) };
}

type DeleteExpenseDialogProps = Pick<ExpenseDialogProps, "onClose" | "onSaved"> & {
  expense: Expense;
};

function DeleteExpenseDialog({ expense, onClose, onSaved }: DeleteExpenseDialogProps) {
  const dates = useDates();
  const category = EXPENSE_CATEGORY_LABELS[expense.category];
  return (
    <ConfirmDialog
      title={EXPENSE_TEXT.confirmDeleteTitle(category)}
      actionLabel={EXPENSE_TEXT.confirmDeleteButton}
      onClose={onClose}
      onConfirm={async () => {
        await deleteExpense(expense.id);
        onSaved(null, EXPENSE_TEXT.deleted);
      }}
      failureOf={(error) => expenseFailure(error, EXPENSE_TEXT.deleteFailed)}
    >
      <p className="text-ink wrap-anywhere">
        {EXPENSE_TEXT.confirmDelete(
          category,
          expense.paidTo,
          formatNpr(expense.amount),
          dates.date(expense.spentOn),
        )}
      </p>
    </ConfirmDialog>
  );
}

/**
 * The Expense typed into the form. Throws `InvalidFieldsError` when the amount isn't a whole
 * number in range or nothing says who it was paid to, so nothing is sent.
 */
export function readExpense(form: FormData, spentOn: string): NewExpense {
  const amount = readField(form, "amount").trim();
  const paidTo = readField(form, "paidTo").trim();
  const errors = refusedFields(amount, paidTo);
  if (Object.keys(errors).length > 0) throw new InvalidFieldsError(errors);
  const category = EXPENSE_CATEGORIES.find((known) => known === readField(form, "category"));
  const method = EXPENSE_METHODS.find((known) => known === readField(form, "method"));
  return {
    spentOn,
    category: category ?? ExpenseCategory.Other,
    paidTo,
    amount: Number(amount),
    method: method ?? ExpenseMethod.Cash,
  };
}

function refusedFields(
  amount: string,
  paidTo: string,
): Partial<Record<keyof NewExpense, string[]>> {
  return {
    ...(!isWholeAmount(amount) && { amount: [AMOUNT_MESSAGE] }),
    ...(paidTo === "" && { paidTo: [EXPENSE_TEXT.paidToRefused] }),
  };
}

function isWholeAmount(text: string): boolean {
  return WHOLE_NUMBER.test(text) && Number(text) >= 1 && Number(text) <= PAYMENT_MAX_AMOUNT;
}

/** Why a change wasn't saved, when it wasn't about the fields. */
function expenseFailure(error: unknown, otherwise: string = MESSAGES.saveFailed): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? EXPENSE_TEXT.notAllowed : otherwise;
}
