"use client";

import { useId, useState, type SubmitEvent } from "react";

import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { IconName } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { HTTP_STATUS } from "@/constants/api";
import { FEE_PURPOSE_SUGGESTIONS, FEE_TEXT } from "@/constants/fees";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_MAX_AMOUNT } from "@/constants/payments";
import {
  addFee,
  ApiRequestError,
  changeFee,
  deleteFee,
  InvalidFieldsError,
  type Fee,
  type NewFee,
  type StudentFees,
} from "@/lib/api";
import { formatNpr } from "@/lib/money";

// The same words the server uses, so a refusal reads the same wherever it comes from.
const AMOUNT_MESSAGE = `Enter a whole amount from ${formatNpr(1)} to ${formatNpr(PAYMENT_MAX_AMOUNT)}.`;
const WHOLE_NUMBER = /^[0-9]+$/;

type FeeDialogProps = {
  student: { id: number; name: string };
  /** The Fee being changed; null to add a new one. */
  fee: Fee | null;
  onClose: () => void;
  /** Saved or deleted: the Student's Fees as they are now, or null after a delete. */
  onSaved: (fees: StudentFees | null, toast: string) => void;
};

/** Add a Fee, or change one and delete it after confirming (spec 76a). */
export function FeeDialog({ student, fee, onClose, onSaved }: FeeDialogProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  if (fee !== null && isConfirmingDelete) {
    return <DeleteFeeDialog fee={fee} onClose={onClose} onSaved={onSaved} />;
  }
  return (
    <FeeForm
      student={student}
      fee={fee}
      onClose={onClose}
      onSaved={onSaved}
      onDelete={() => {
        setIsConfirmingDelete(true);
      }}
    />
  );
}

type FeeFormProps = FeeDialogProps & { onDelete: () => void };

type FormCopy = { title: string; saveLabel: string; icon: IconName };

/** The title and save button: adding a Fee, or changing one (which can also delete it). */
function formCopy(studentName: string, fee: Fee | null): FormCopy {
  if (fee === null) {
    return { title: FEE_TEXT.addTitle(studentName), saveLabel: FEE_TEXT.addButton, icon: "plus" };
  }
  return { title: FEE_TEXT.editTitle, saveLabel: FEE_TEXT.saveChanges, icon: "check" };
}

function FeeForm({ student, fee, onClose, onSaved, onDelete }: FeeFormProps) {
  const formId = useId();
  const { isSaving, fieldErrors, failure, save } = useFormSave(feeFailure);
  const copy = formCopy(student.name, fee);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      const details = readFee(form);
      if (fee === null) onSaved(await addFee(student.id, details), FEE_TEXT.added);
      else onSaved(await changeFee(fee.id, details), FEE_TEXT.changesSaved);
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
      {...(fee !== null && { sideAction: <DeleteButton onDelete={onDelete} /> })}
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-5">
        <FeeFields fee={fee} fieldErrors={fieldErrors} />
        <p className="text-small text-ink-2">{FEE_TEXT.isRecorded}</p>
      </form>
    </SaveDialog>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <Button variant="ghost" icon="trash" onClick={onDelete}>
      {FEE_TEXT.deleteFee}
    </Button>
  );
}

type FeeFieldsProps = { fee: Fee | null; fieldErrors: Partial<Record<string, string[]>> };

/** What it's for and the amount, empty for a new Fee. */
function FeeFields({ fee, fieldErrors }: FeeFieldsProps) {
  const start = fee === null ? { purpose: "", amount: "" } : { ...fee, amount: String(fee.amount) };
  return (
    <>
      <TextField
        label={FEE_TEXT.purpose}
        name="purpose"
        placeholder={FEE_TEXT.purposePlaceholder}
        suggestions={FEE_PURPOSE_SUGGESTIONS}
        defaultValue={start.purpose}
        errors={fieldErrors.purpose}
      />
      <TextField
        label={FEE_TEXT.amount}
        name="amount"
        type="number"
        inputMode="numeric"
        min="1"
        defaultValue={start.amount}
        errors={fieldErrors.amount}
      />
    </>
  );
}

type DeleteFeeDialogProps = Pick<FeeDialogProps, "onClose" | "onSaved"> & { fee: Fee };

function DeleteFeeDialog({ fee, onClose, onSaved }: DeleteFeeDialogProps) {
  return (
    <ConfirmDialog
      title={FEE_TEXT.confirmDeleteTitle(fee.purpose)}
      actionLabel={FEE_TEXT.confirmDeleteButton}
      onClose={onClose}
      onConfirm={async () => {
        await deleteFee(fee.id);
        onSaved(null, FEE_TEXT.deleted);
      }}
      failureOf={(error) => feeFailure(error, FEE_TEXT.deleteFailed)}
    >
      <div className="grid gap-3">
        <p className="text-ink wrap-anywhere">
          {FEE_TEXT.confirmDelete(fee.purpose, formatNpr(fee.amount))}
        </p>
        <p className="text-small">{FEE_TEXT.deletionIsRecorded}</p>
      </div>
    </ConfirmDialog>
  );
}

/**
 * The Fee typed into the form. Throws `InvalidFieldsError` when the amount isn't a whole number
 * in range or nothing says what it's for, so nothing is sent.
 */
export function readFee(form: FormData): NewFee {
  const purpose = readField(form, "purpose").trim();
  const amount = readField(form, "amount").trim();
  const errors: Partial<Record<keyof NewFee, string[]>> = {};
  if (purpose === "") errors.purpose = [FEE_TEXT.purposeRefused];
  if (!isWholeAmount(amount)) errors.amount = [AMOUNT_MESSAGE];
  if (Object.keys(errors).length > 0) throw new InvalidFieldsError(errors);
  return { purpose, amount: Number(amount) };
}

function isWholeAmount(text: string): boolean {
  return WHOLE_NUMBER.test(text) && Number(text) >= 1 && Number(text) <= PAYMENT_MAX_AMOUNT;
}

/** Why a change wasn't saved, when it wasn't about the fields. */
function feeFailure(error: unknown, otherwise: string = MESSAGES.saveFailed): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? FEE_TEXT.notAllowed : otherwise;
}
