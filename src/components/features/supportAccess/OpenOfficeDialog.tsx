"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { LABELS } from "@/constants/messages";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import {
  InvalidFieldsError,
  startSupportVisit,
  type StartedVisit,
  type SupportField,
} from "@/lib/api";

import { entryUrl } from "./officeAddress";

const FORM_ID = "open-office";

type OpenOfficeDialogProps = {
  office: { id: number; name: string };
  onClose: () => void;
  /** Where the browser goes with the visit; the office's own address by default. */
  onOpened?: (started: StartedVisit) => void;
};

type Errors = Partial<Record<SupportField, string[]>>;

/**
 * Open an office as Platform Admin (spec 9-10): say why, then enter it on its own address as
 * yourself. The visit is recorded on the Platform.
 */
export function OpenOfficeDialog({
  office,
  onClose,
  onOpened = goToOffice,
}: OpenOfficeDialogProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function open(reason: string): Promise<void> {
    setIsOpening(true);
    setErrors({});
    try {
      onOpened(await startSupportVisit(office.id, reason));
    } catch (error) {
      setErrors(errorsOf(error));
      setIsOpening(false);
    }
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("reason");
    const reason = typeof value === "string" ? value.trim() : "";
    if (reason === "") {
      setErrors({ reason: [SUPPORT_TEXT.reasonRequired] });
      return;
    }
    void open(reason);
  }

  return (
    <Dialog
      isOpen
      title={SUPPORT_TEXT.openTitle(office.name)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            icon="shield"
            isLoading={isOpening}
            loadingLabel={SUPPORT_TEXT.opening}
          >
            {SUPPORT_TEXT.open}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-5" noValidate>
        <p>{SUPPORT_TEXT.openIntro}</p>
        <ul className="text-ink-2 grid list-disc gap-1 ps-6">
          {SUPPORT_TEXT.openPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        {errors.detail !== undefined && <Banner tone="problem">{errors.detail.join(" ")}</Banner>}
        <TextField
          label={SUPPORT_TEXT.reasonLabel}
          name="reason"
          placeholder={SUPPORT_TEXT.reasonPlaceholder}
          hint={SUPPORT_TEXT.reasonHint}
          errors={errors.reason}
        />
      </form>
    </Dialog>
  );
}

function goToOffice(started: StartedVisit): void {
  window.location.assign(entryUrl(started.host, started.entryCode));
}

function errorsOf(error: unknown): Errors {
  if (error instanceof InvalidFieldsError) {
    const { reason, detail } = error.fieldErrors;
    if (reason !== undefined) return { reason };
    if (detail !== undefined) return { detail };
  }
  return { detail: [SUPPORT_TEXT.openFailed] };
}
