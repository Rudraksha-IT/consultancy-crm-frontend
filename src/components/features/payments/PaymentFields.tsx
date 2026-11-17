"use client";

import { DateField } from "@/components/ui/DateField";
import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  PAYMENT_MAX_AMOUNT,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_PURPOSE_SUGGESTIONS,
  PAYMENT_TEXT,
  PaymentMethod,
} from "@/constants/payments";
import { InvalidFieldsError, type NewPayment } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

const METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
}));

// The same words the server uses, so a refusal reads the same wherever it comes from.
const AMOUNT_MESSAGE = `Enter a whole amount from ${formatNpr(1)} to ${formatNpr(PAYMENT_MAX_AMOUNT)}.`;

const WHOLE_NUMBER = /^[0-9]+$/;

type PaymentFieldsProps = {
  /** The day paid (AD), controlled so the same day in the other calendar shows under it. */
  paidOn: string;
  onPaidOn: (paidOn: string) => void;
  fieldErrors: Partial<Record<string, string[]>>;
  /** The Payment as it is, when editing one. */
  initial?: Pick<NewPayment, "amount" | "method" | "purpose">;
};

/** Amount, date (with the other calendar under it), method and what it's for: one Payment. */
export function PaymentFields({ paidOn, onPaidOn, fieldErrors, initial }: PaymentFieldsProps) {
  const dates = useDates();
  const start = startingValues(initial);
  return (
    <div className="tablet:grid-cols-2 grid gap-5">
      <TextField
        label={PAYMENT_TEXT.amount}
        name="amount"
        type="number"
        inputMode="numeric"
        min="1"
        defaultValue={start.amount}
        errors={fieldErrors.amount}
      />
      <DateField
        label={PAYMENT_TEXT.date}
        name="paidOn"
        display={dates.display}
        max={todayIso()}
        value={paidOn}
        onChange={onPaidOn}
        showsOtherCalendar
        errors={fieldErrors.paidOn}
      />
      <SelectField
        label={PAYMENT_TEXT.method}
        name="method"
        options={METHOD_OPTIONS}
        defaultValue={start.method}
        errors={fieldErrors.method}
      />
      <TextField
        label={PAYMENT_TEXT.purpose}
        name="purpose"
        placeholder={PAYMENT_TEXT.purposePlaceholder}
        suggestions={PAYMENT_PURPOSE_SUGGESTIONS}
        defaultValue={start.purpose}
        errors={fieldErrors.purpose}
      />
    </div>
  );
}

/** What the fields start with: the Payment being edited, or empty with Cash for a new one. */
function startingValues(initial: PaymentFieldsProps["initial"]) {
  if (initial === undefined) return { amount: "", method: PaymentMethod.Cash, purpose: "" };
  return { amount: String(initial.amount), method: initial.method, purpose: initial.purpose };
}

/**
 * The Payment typed into `PaymentFields`. Throws `InvalidFieldsError` when the amount isn't a
 * whole number in range, so nothing is sent.
 */
export function readPayment(form: FormData, paidOn: string): NewPayment {
  const amount = readField(form, "amount").trim();
  if (!isWholeAmount(amount)) throw new InvalidFieldsError({ amount: [AMOUNT_MESSAGE] });
  const method = PAYMENT_METHODS.find((known) => known === readField(form, "method"));
  return {
    amount: Number(amount),
    paidOn,
    method: method ?? PaymentMethod.Cash,
    purpose: readField(form, "purpose"),
  };
}

function isWholeAmount(text: string): boolean {
  return WHOLE_NUMBER.test(text) && Number(text) >= 1 && Number(text) <= PAYMENT_MAX_AMOUNT;
}
