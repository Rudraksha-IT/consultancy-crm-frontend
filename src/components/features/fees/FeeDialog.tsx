"use client";

import { useId, useState, type SubmitEvent } from "react";

import {
  FeeTypeFields,
  readFeeTypeChoice,
  throwIfRefused,
  useFeeTypeChoices,
  type FeeTypeChoices,
} from "@/components/features/feeTypes/FeeTypeFields";
import { readField } from "@/components/features/students/profile/formData";
import { SaveDialog } from "@/components/features/students/profile/SaveDialog";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { IconName } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { HTTP_STATUS } from "@/constants/api";
import { FEE_TEXT } from "@/constants/fees";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_MAX_AMOUNT } from "@/constants/payments";
import {
  addFee,
  ApiRequestError,
  changeFee,
  deleteFee,
  describeFeeType,
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
  const choices = useFeeTypeChoices();
  const copy = formCopy(student.name, fee);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void save(async () => {
      const details = readFee(form, choices);
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
        <FeeFields fee={fee} choices={choices} fieldErrors={fieldErrors} />
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

type FeeFieldsProps = {
  fee: Fee | null;
  choices: FeeTypeChoices;
  fieldErrors: Partial<Record<string, string[]>>;
};

/** The Fee Type, a note and the amount, empty for a new Fee. */
function FeeFields({ fee, choices, fieldErrors }: FeeFieldsProps) {
  return (
    <>
      <FeeTypeFields choices={choices} initial={fee ?? undefined} fieldErrors={fieldErrors} />
      <TextField
        label={FEE_TEXT.amount}
        name="amount"
        type="number"
        inputMode="numeric"
        min="1"
        defaultValue={fee === null ? "" : String(fee.amount)}
        errors={fieldErrors.amount}
      />
    </>
  );
}

type DeleteFeeDialogProps = Pick<FeeDialogProps, "onClose" | "onSaved"> & { fee: Fee };

function DeleteFeeDialog({ fee, onClose, onSaved }: DeleteFeeDialogProps) {
  return (
    <ConfirmDialog
      title={FEE_TEXT.confirmDeleteTitle(describeFeeType(fee.feeType, fee.note))}
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
          {FEE_TEXT.confirmDelete(describeFeeType(fee.feeType, fee.note), formatNpr(fee.amount))}
        </p>
        <p className="text-small">{FEE_TEXT.deletionIsRecorded}</p>
      </div>
    </ConfirmDialog>
  );
}

/**
 * The Fee typed into the form. Throws `InvalidFieldsError` when no Fee Type is chosen, Other has
 * no note, or the amount isn't a whole number in range, so nothing is sent.
 */
export function readFee(form: FormData, choices: FeeTypeChoices): NewFee {
  const errors: Partial<Record<keyof NewFee, string[]>> = {};
  const forWhat = readFeeTypeChoice(form, choices, errors);
  const amount = readField(form, "amount").trim();
  if (!isWholeAmount(amount)) errors.amount = [AMOUNT_MESSAGE];
  throwIfRefused(errors);
  return { ...forWhat, amount: Number(amount) };
}

function isWholeAmount(text: string): boolean {
  return WHOLE_NUMBER.test(text) && Number(text) >= 1 && Number(text) <= PAYMENT_MAX_AMOUNT;
}

/** Why a change wasn't saved, when it wasn't about the fields. */
function feeFailure(error: unknown, otherwise: string = MESSAGES.saveFailed): string {
  const isRefused = error instanceof ApiRequestError && error.status === HTTP_STATUS.forbidden;
  return isRefused ? FEE_TEXT.notAllowed : otherwise;
}
