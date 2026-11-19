"use client";

import { useId, useState, type SubmitEvent } from "react";

import { useFeeTypeChoices } from "@/components/features/feeTypes/FeeTypeFields";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HTTP_STATUS } from "@/constants/api";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_TEXT } from "@/constants/payments";
import {
  ApiRequestError,
  changePayment,
  deletePayment,
  describeFeeType,
  type Receipt,
} from "@/lib/api";
import { formatNpr } from "@/lib/money";

import { PaymentFields, readPayment } from "./PaymentFields";

type EditPaymentDialogProps = {
  payment: Receipt;
  onClose: () => void;
  onSaved: (payment: Receipt) => void;
  onDeleted: () => void;
};

/** An Admin changes a Payment, or deletes it after confirming (spec 75-76). */
export function EditPaymentDialog({
  payment,
  onClose,
  onSaved,
  onDeleted,
}: EditPaymentDialogProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  if (isConfirmingDelete) {
    return <DeletePaymentDialog payment={payment} onClose={onClose} onDeleted={onDeleted} />;
  }
  return (
    <EditForm
      payment={payment}
      onClose={onClose}
      onSaved={onSaved}
      onDelete={() => {
        setIsConfirmingDelete(true);
      }}
    />
  );
}

type EditFormProps = Omit<EditPaymentDialogProps, "onDeleted"> & { onDelete: () => void };

function EditForm({ payment, onClose, onSaved, onDelete }: EditFormProps) {
  const formId = useId();
  const [paidOn, setPaidOn] = useState(payment.paidOn);
  const { isSaving, fieldErrors, failure, save } = useFormSave(changeFailure);
  const choices = useFeeTypeChoices();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      onSaved(await changePayment(payment.id, readPayment(form, paidOn, choices)));
    });
  }

  return (
    <SaveDialog
      title={PAYMENT_TEXT.editTitle(payment.receiptNumber)}
      formId={formId}
      saveLabel={PAYMENT_TEXT.saveChanges}
      isSaving={isSaving}
      failure={failure}
      onClose={onClose}
      sideAction={
        <Button variant="ghost" icon="trash" onClick={onDelete}>
          {PAYMENT_TEXT.deletePayment}
        </Button>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <PaymentFields
          paidOn={paidOn}
          onPaidOn={setPaidOn}
          fieldErrors={fieldErrors}
          choices={choices}
          initial={payment}
        />
        <p className="text-small text-ink-2">{PAYMENT_TEXT.changeIsRecorded}</p>
      </form>
    </SaveDialog>
  );
}

type DeletePaymentDialogProps = Pick<EditPaymentDialogProps, "payment" | "onClose" | "onDeleted">;

function DeletePaymentDialog({ payment, onClose, onDeleted }: DeletePaymentDialogProps) {
  return (
    <ConfirmDialog
      title={PAYMENT_TEXT.confirmDeleteTitle(payment.receiptNumber)}
      actionLabel={PAYMENT_TEXT.confirmDeleteButton}
      onClose={onClose}
      onConfirm={async () => {
        await deletePayment(payment.id);
        onDeleted();
      }}
      failureOf={(error) => changeFailure(error, PAYMENT_TEXT.deleteFailed)}
    >
      <div className="grid gap-3">
        <p className="text-ink wrap-anywhere">
          {PAYMENT_TEXT.confirmDelete(
            payment.receiptNumber,
            formatNpr(payment.amount),
            payment.student.name,
            describeFeeType(payment.feeType, payment.note),
          )}
        </p>
        <p className="text-small">{PAYMENT_TEXT.deletionIsRecorded}</p>
      </div>
    </ConfirmDialog>
  );
}

/** Why a change wasn't saved, when it wasn't about the fields. */
function changeFailure(error: unknown, otherwise: string = MESSAGES.saveFailed): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? PAYMENT_TEXT.onlyAdminChanges : otherwise;
}
