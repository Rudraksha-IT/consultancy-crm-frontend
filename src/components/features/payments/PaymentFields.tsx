"use client";

import {
  FeeTypeFields,
  readFeeTypeChoice,
  throwIfRefused,
  type FeeTypeChoices,
} from "@/components/features/feeTypes/FeeTypeFields";
import { DateField } from "@/components/ui/DateField";
import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  PAYMENT_MAX_AMOUNT,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_TEXT,
  PaymentMethod,
} from "@/constants/payments";
import type { NewPayment, Payment } from "@/lib/api";
import { todayIso } from "@/lib/dates";
import { formatNpr } from "@/lib/money";

const METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
}));

// The same words the server uses, so a refusal reads the same wherever it comes from.
export const AMOUNT_MESSAGE = `Enter a whole amount from ${formatNpr(1)} to ${formatNpr(PAYMENT_MAX_AMOUNT)}.`;

const WHOLE_NUMBER = /^[0-9]+$/;

type PaymentFieldsProps = {
  /** The day paid (AD), controlled so the same day in the other calendar shows under it. */
  paidOn: string;
  onPaidOn: (paidOn: string) => void;
  fieldErrors: Partial<Record<string, string[]>>;
  /** The office's Fee Types to pick from. */
  choices: FeeTypeChoices;
  /** The Payment as it is, when editing one. */
  initial?: Pick<Payment, "amount" | "method" | "feeType" | "note">;
};

/** Amount, date (with the other calendar under it), method, Fee Type and note: one Payment. */
export function PaymentFields(props: PaymentFieldsProps) {
  const { paidOn, onPaidOn, fieldErrors, choices, initial } = props;
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
      <FeeTypeFields choices={choices} initial={initial} fieldErrors={fieldErrors} />
    </div>
  );
}

/** What the fields start with: the Payment being edited, or empty with Cash for a new one. */
function startingValues(initial: PaymentFieldsProps["initial"]) {
  if (initial === undefined) return { amount: "", method: PaymentMethod.Cash };
  return { amount: String(initial.amount), method: initial.method };
}

/**
 * The Payment typed into `PaymentFields`. Throws `InvalidFieldsError` when the amount isn't a
 * whole number in range, no Fee Type is chosen, or Other has no note, so nothing is sent.
 */
export function readPayment(form: FormData, paidOn: string, choices: FeeTypeChoices): NewPayment {
  const errors: Partial<Record<keyof NewPayment, string[]>> = {};
  const amount = readField(form, "amount").trim();
  if (!isWholeAmount(amount)) errors.amount = [AMOUNT_MESSAGE];
  const forWhat = readFeeTypeChoice(form, choices, errors);
  throwIfRefused(errors);
  const method = PAYMENT_METHODS.find((known) => known === readField(form, "method"));
  return { amount: Number(amount), paidOn, method: method ?? PaymentMethod.Cash, ...forWhat };
}

/** Whether the text is a whole amount the API takes: NPR 1 up to `PAYMENT_MAX_AMOUNT`. */
export function isWholeAmount(text: string): boolean {
  return WHOLE_NUMBER.test(text) && Number(text) >= 1 && Number(text) <= PAYMENT_MAX_AMOUNT;
}
