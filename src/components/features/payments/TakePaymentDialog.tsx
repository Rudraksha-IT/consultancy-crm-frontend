"use client";

import type { RecordId } from "@/lib/recordId";
import { useId, useState, type SubmitEvent } from "react";

import { useFeeTypeChoices } from "@/components/features/feeTypes/FeeTypeFields";
import { useDates } from "@/components/features/shell/dateDisplay";
import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
import { HTTP_STATUS } from "@/constants/api";
import { MESSAGES } from "@/constants/messages";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PAYMENT_TEXT,
  PaymentMethod,
} from "@/constants/payments";
import { ApiRequestError, recordPayments, type Receipt } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { emptyLine, PaymentLines, readPaymentLines, type LineDraft } from "./PaymentLines";

const METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
}));

type TakePaymentDialogProps = {
  studentId: RecordId;
  studentName: string;
  /** Admins see every Payment, so they aren't told the others stay with the Admin. */
  isAdmin: boolean;
  onClose: () => void;
  onRecorded: (receipt: Receipt) => void;
};

/**
 * Record one visit's money from a Student (spec 71, 73): the date and method, then a line per
 * Fee Type. Each line is saved as its own Payment, all or none, on one receipt that saving shows.
 */
export function TakePaymentDialog(props: TakePaymentDialogProps) {
  const { studentId, studentName, isAdmin, onClose, onRecorded } = props;
  const formId = useId();
  const dates = useDates();
  const [paidOn, setPaidOn] = useState(() => todayIso());
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()]);
  const { isSaving, fieldErrors, failure, save } = useFormSave(paymentFailure);
  const choices = useFeeTypeChoices();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const method = PAYMENT_METHODS.find(
      (known) => known === readField(new FormData(event.currentTarget), "method"),
    );
    void save(async () => {
      const visit = {
        paidOn,
        method: method ?? PaymentMethod.Cash,
        lines: readPaymentLines(lines, choices),
      };
      onRecorded(await recordPayments(studentId, visit));
    });
  }

  return (
    <SaveDialog
      title={PAYMENT_TEXT.recordFrom(studentName)}
      formId={formId}
      saveLabel={PAYMENT_TEXT.savePayment}
      saveIcon="receipt"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      isWide
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-6">
        <div className="tablet:grid-cols-2 grid gap-5">
          <DateField
            label={PAYMENT_TEXT.date}
            name="paidOn"
            display={dates.display}
            max={todayIso()}
            value={paidOn}
            onChange={setPaidOn}
            showsOtherCalendar
            errors={fieldErrors.paidOn}
          />
          <SelectField
            label={PAYMENT_TEXT.method}
            name="method"
            options={METHOD_OPTIONS}
            defaultValue={PaymentMethod.Cash}
            errors={fieldErrors.method}
          />
        </div>
        <PaymentLines
          lines={lines}
          onChange={setLines}
          choices={choices}
          fieldErrors={fieldErrors}
        />
        {!isAdmin && <p className="text-small text-ink-2">{PAYMENT_TEXT.othersStayWithAdmin}</p>}
      </form>
    </SaveDialog>
  );
}

/** Why the Payments weren't saved, when it wasn't about the fields. */
function paymentFailure(error: unknown): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? PAYMENT_TEXT.cannotTakePayments : MESSAGES.saveFailed;
}
