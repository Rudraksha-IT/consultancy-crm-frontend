"use client";

import { useId, useState, type SubmitEvent } from "react";

import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { HTTP_STATUS } from "@/constants/api";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_TEXT } from "@/constants/payments";
import { ApiRequestError, recordPayment, type Receipt } from "@/lib/api";
import { todayIso } from "@/lib/dates";

import { PaymentFields, readPayment } from "./PaymentFields";

type TakePaymentDialogProps = {
  studentId: number;
  studentName: string;
  /** Admins see every Payment, so they aren't told the others stay with the Admin. */
  isAdmin: boolean;
  onClose: () => void;
  onRecorded: (receipt: Receipt) => void;
};

/** Record a Payment from one Student (spec 71); saving shows its receipt. */
export function TakePaymentDialog(props: TakePaymentDialogProps) {
  const { studentId, studentName, isAdmin, onClose, onRecorded } = props;
  const formId = useId();
  const [paidOn, setPaidOn] = useState(() => todayIso());
  const { isSaving, fieldErrors, failure, save } = useFormSave(paymentFailure);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      onRecorded(await recordPayment(studentId, readPayment(form, paidOn)));
    });
  }

  return (
    <SaveDialog
      title={PAYMENT_TEXT.recordFrom(studentName)}
      formId={formId}
      saveLabel={PAYMENT_TEXT.saveAndShowReceipt}
      saveIcon="receipt"
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <PaymentFields paidOn={paidOn} onPaidOn={setPaidOn} fieldErrors={fieldErrors} />
        <p className="text-small text-ink-2">
          {isAdmin
            ? PAYMENT_TEXT.afterSaving
            : `${PAYMENT_TEXT.afterSaving} ${PAYMENT_TEXT.othersStayWithAdmin}`}
        </p>
      </form>
    </SaveDialog>
  );
}

/** Why a Payment wasn't saved, when it wasn't about the fields. */
function paymentFailure(error: unknown): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? PAYMENT_TEXT.cannotTakePayments : MESSAGES.saveFailed;
}
