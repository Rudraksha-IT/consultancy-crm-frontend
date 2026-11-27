"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { HTTP_STATUS } from "@/constants/api";
import { Stage } from "@/constants/stages";
import { VISA_STATUS_LABELS, VISA_TEXT, VisaStatus, type VisaResult } from "@/constants/visas";
import { ApiRequestError, type StudentProfile, type Visa } from "@/lib/api";

import { changeFailure } from "./statusSaved";

type VisaFinalDialogProps = {
  profile: StudentProfile;
  visa: Visa;
  result: VisaResult;
  /** Saves the result; a rejection keeps the popup open with its reason. */
  onConfirm: () => Promise<void>;
  /** Cancel, Escape or the close button: the visa stays Applied. */
  onClose: () => void;
};

/**
 * Asks before a Visa is marked Granted or Refused, from its status list or its letter: the result
 * is final, and a new try is a new Visa (UI revamp ticket 10; prototype `visaFinalAsk`).
 */
export function VisaFinalDialog({
  profile,
  visa,
  result,
  onConfirm,
  onClose,
}: VisaFinalDialogProps) {
  const status = VISA_STATUS_LABELS[result];
  const goesBack = result === VisaStatus.Refused && profile.stage === Stage.Visa;
  return (
    <ConfirmDialog
      title={VISA_TEXT.finalTitle(status)}
      actionLabel={VISA_TEXT.finalButton(status)}
      actionVariant={result === VisaStatus.Refused ? "danger" : "primary"}
      onConfirm={onConfirm}
      onClose={onClose}
      failureOf={decideFailure}
    >
      <div className="grid gap-3">
        <p className="text-ink wrap-anywhere">
          {VISA_TEXT.finalBody(visa.university.name, status)}
        </p>
        <p>
          {goesBack
            ? `${VISA_TEXT.finalNewTry} ${VISA_TEXT.refusedGoesBack}`
            : VISA_TEXT.finalNewTry}
        </p>
      </div>
    </ConfirmDialog>
  );
}

/** Why it wasn't saved: someone decided it first (409), or the usual reasons. */
function decideFailure(error: unknown): string {
  const isDecided = error instanceof ApiRequestError && error.status === HTTP_STATUS.conflict;
  return isDecided ? VISA_TEXT.decided : changeFailure(error);
}
