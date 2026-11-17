"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField } from "@/components/ui/SelectField";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import {
  ALLOWED_STATUS_CHANGES,
  CONSULTANCY_STATUS_LABELS,
  ConsultancyStatus,
  READ_ONLY_STATUSES,
  REASON_REQUIRED_STATUSES,
  STATUS_TEXT,
} from "@/constants/consultancyStatus";
import { LABELS } from "@/constants/messages";
import type { ConsultancyOverview, StatusChange } from "@/lib/api";
import { tomorrowIso } from "@/lib/dates";

import { ConsultancyStatusChip } from "./ConsultancyStatusChip";
import { useChangeStatus, type StatusFieldErrors } from "./useChangeStatus";

const FORM_ID = "change-status";

type ChangeStatusDialogProps = {
  consultancy: ConsultancyOverview;
  onClose: () => void;
  onSaved: (updated: ConsultancyOverview) => void;
};

/**
 * Change a Consultancy's Status (issue 42): only the moves the rules allow are offered, with the
 * date Active and an extended evaluation need, and a reason where one is required. Terminating
 * is final, so the subdomain must be typed to confirm it.
 */
export function ChangeStatusDialog({ consultancy, onClose, onSaved }: ChangeStatusDialogProps) {
  const choices = ALLOWED_STATUS_CHANGES[consultancy.status];
  const [choice, setChoice] = useState<ConsultancyStatus>(choices[0] ?? ConsultancyStatus.Active);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const { isSaving, fieldErrors, error, save } = useChangeStatus(consultancy, onSaved);
  const isTerminating = choice === ConsultancyStatus.Terminated;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isConfirmed = !isTerminating || readField(form, "confirmation") === consultancy.subdomain;
    setConfirmError(isConfirmed ? null : STATUS_TEXT.subdomainDoesntMatch);
    if (isConfirmed) void save(readChange(form, choice));
  }

  return (
    <SubmitKeysScope>
      <Dialog
        isOpen
        title={STATUS_TEXT.changeStatusFor(consultancy.name)}
        onClose={onClose}
        footer={<Footer isTerminating={isTerminating} isSaving={isSaving} onClose={onClose} />}
      >
        <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-5" noValidate>
          <p className="text-ink-2 flex flex-wrap items-center gap-2">
            {STATUS_TEXT.status}
            <ConsultancyStatusChip consultancy={consultancy} />
          </p>
          {error !== null && <Banner tone="problem">{error}</Banner>}
          <SelectField
            label={STATUS_TEXT.changeTo}
            name="status"
            value={choice}
            onChange={(value) => {
              const picked = choices.find((option) => option === value);
              if (picked !== undefined) setChoice(picked);
            }}
            options={choices.map((value) => ({ value, label: choiceLabel(value) }))}
            errors={fieldErrors.status}
          />
          <ChoiceDetails choice={choice} fieldErrors={fieldErrors} />
          {isTerminating && (
            <TerminateConfirmation subdomain={consultancy.subdomain} error={confirmError} />
          )}
        </form>
      </Dialog>
    </SubmitKeysScope>
  );
}

type FooterProps = { isTerminating: boolean; isSaving: boolean; onClose: () => void };

/** Cancel, and Save (or, in red, Terminate) submitting the dialog's form. */
function Footer({ isTerminating, isSaving, onClose }: FooterProps) {
  return (
    <>
      <SubmitKeysHint action="save" />
      <Button onClick={onClose}>{LABELS.cancel}</Button>
      <Button
        type="submit"
        form={FORM_ID}
        variant={isTerminating ? "danger" : "primary"}
        isLoading={isSaving}
        loadingLabel={LABELS.saving}
      >
        {isTerminating ? STATUS_TEXT.terminate : STATUS_TEXT.saveStatus}
      </Button>
    </>
  );
}

type ChoiceDetailsProps = { choice: ConsultancyStatus; fieldErrors: StatusFieldErrors };

/** What the chosen Status needs: what it means, its date, and the reason (required or not). */
function ChoiceDetails({ choice, fieldErrors }: ChoiceDetailsProps) {
  const isReasonRequired = REASON_REQUIRED_STATUSES.includes(choice);
  return (
    <>
      {READ_ONLY_STATUSES.includes(choice) && (
        <p className="text-secondary text-ink-2">{STATUS_TEXT.readOnlyHint}</p>
      )}
      <StatusDateField choice={choice} fieldErrors={fieldErrors} />
      <TextAreaField
        label={STATUS_TEXT.reason}
        name="reason"
        rows={3}
        isOptional={!isReasonRequired}
        hint={isReasonRequired ? STATUS_TEXT.reasonRequiredHint : STATUS_TEXT.reasonHint}
        errors={fieldErrors.reason}
      />
    </>
  );
}

/** Active needs the last day paid for; extending an evaluation needs its new last day. */
function StatusDateField({ choice, fieldErrors }: ChoiceDetailsProps) {
  const [tomorrow] = useState(() => tomorrowIso());
  if (choice === ConsultancyStatus.Active) {
    return (
      <TextField
        key="paid-until"
        label={STATUS_TEXT.paidUntil}
        name="paidUntil"
        type="date"
        min={tomorrow}
        hint={STATUS_TEXT.paidUntilHint}
        errors={fieldErrors.paidUntil}
      />
    );
  }
  if (choice === ConsultancyStatus.Evaluation) {
    return (
      <TextField
        key="evaluation-ends"
        label={STATUS_TEXT.evaluationEndsOn}
        name="evaluationEndsAt"
        type="date"
        min={tomorrow}
        hint={STATUS_TEXT.evaluationEndsHint}
        errors={fieldErrors.evaluationEndsAt}
      />
    );
  }
  return null;
}

/** Terminating is final: say so, and have the subdomain typed to confirm. */
function TerminateConfirmation({ subdomain, error }: { subdomain: string; error: string | null }) {
  return (
    <>
      <Banner tone="problem" icon="alert">
        {STATUS_TEXT.terminateWarning}
      </Banner>
      <TextField
        label={STATUS_TEXT.typeToConfirm(subdomain)}
        name="confirmation"
        autoComplete="off"
        errors={error === null ? undefined : [error]}
      />
    </>
  );
}

function choiceLabel(value: ConsultancyStatus): string {
  return value === ConsultancyStatus.Evaluation
    ? STATUS_TEXT.extendEvaluation
    : CONSULTANCY_STATUS_LABELS[value];
}

function readChange(form: FormData, status: ConsultancyStatus): StatusChange {
  return {
    status,
    reason: readField(form, "reason"),
    paidUntil: readField(form, "paidUntil"),
    evaluationEndsAt: readField(form, "evaluationEndsAt"),
  };
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}
