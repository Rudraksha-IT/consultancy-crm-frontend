"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/useToast";
import { LABELS } from "@/constants/messages";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import { approveTransferRequest, type TransferRequest } from "@/lib/api";

import { firstName, transferFailure } from "./transferFailure";

type ApproveTransferDialogProps = {
  request: TransferRequest;
  onClose: () => void;
  onDone: (request: TransferRequest) => void;
};

/** Confirm, then approve: the Student is Transferred to whoever asked (spec 44b). */
export function ApproveTransferDialog({ request, onClose, onDone }: ApproveTransferDialogProps) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const asker = request.askedBy.name;
  const student = request.student.name;

  async function approve(): Promise<void> {
    setIsSaving(true);
    setFailure(null);
    try {
      const approved = await approveTransferRequest(request.id);
      showToast(TRANSFER_TEXT.approved(student, asker));
      onDone(approved);
    } catch (error) {
      setFailure(transferFailure(error));
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      isOpen
      title={TRANSFER_TEXT.approveTitle}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button
            variant="primary"
            icon="check"
            isLoading={isSaving}
            loadingLabel={LABELS.saving}
            onClick={() => void approve()}
          >
            {TRANSFER_TEXT.approveAndTransfer}
          </Button>
        </>
      }
    >
      <p>
        {TRANSFER_TEXT.approveMoves(student, request.counsellor?.name ?? null, asker)}{" "}
        {TRANSFER_TEXT.approveAfter(firstName(asker))}
      </p>
      <p className="text-small text-ink-2">{TRANSFER_TEXT.approveRecorded}</p>
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </Dialog>
  );
}
