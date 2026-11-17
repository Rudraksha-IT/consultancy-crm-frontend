"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { TRANSFER_TEXT } from "@/constants/transferRequests";
import { cancelTransferRequest, type TransferRequest } from "@/lib/api";

import { useTransferCount } from "@/components/features/shell/menuCount";

import { ApproveTransferDialog } from "./ApproveTransferDialog";
import { DeclineTransferDialog } from "./DeclineTransferDialog";
import { transferFailure } from "./transferFailure";

type Open = "approve" | "decline" | null;

type TransferRequestActionsProps = {
  request: TransferRequest;
  /** The request changed: approved, declined or cancelled. */
  onChanged: (request: TransferRequest) => void;
};

/**
 * Approve and Decline for whoever may answer; Cancel request for whoever asked; nothing for anyone
 * else (spec 44b, 44c). The menu's count is asked for again after an answer.
 */
export function TransferRequestActions({ request, onChanged }: TransferRequestActionsProps) {
  const [open, setOpen] = useState<Open>(null);
  const { refresh: refreshCount } = useTransferCount();
  const done = (changed: TransferRequest) => {
    setOpen(null);
    refreshCount();
    onChanged(changed);
  };

  if (request.canAnswer) {
    return (
      <>
        <Button
          size="sm"
          variant="primary"
          icon="check"
          onClick={() => {
            setOpen("approve");
          }}
        >
          {TRANSFER_TEXT.approve}
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setOpen("decline");
          }}
        >
          {TRANSFER_TEXT.decline}
        </Button>
        {open === "approve" && (
          <ApproveTransferDialog
            request={request}
            onClose={() => {
              setOpen(null);
            }}
            onDone={done}
          />
        )}
        {open === "decline" && (
          <DeclineTransferDialog
            request={request}
            onClose={() => {
              setOpen(null);
            }}
            onDone={done}
          />
        )}
      </>
    );
  }
  if (request.canCancel) return <CancelButton request={request} onDone={done} />;
  return null;
}

function CancelButton(props: {
  request: TransferRequest;
  onDone: (request: TransferRequest) => void;
}) {
  const { request, onDone } = props;
  const { showToast } = useToast();
  const [isAsking, setIsAsking] = useState(false);

  async function cancel(): Promise<void> {
    const cancelled = await cancelTransferRequest(request.id);
    setIsAsking(false);
    showToast(TRANSFER_TEXT.cancelled);
    onDone(cancelled);
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setIsAsking(true);
        }}
      >
        {TRANSFER_TEXT.cancel}
      </Button>
      {isAsking && (
        <ConfirmDialog
          title={TRANSFER_TEXT.cancelTitle}
          actionLabel={TRANSFER_TEXT.cancel}
          onClose={() => {
            setIsAsking(false);
          }}
          onConfirm={cancel}
          failureOf={transferFailure}
        >
          {TRANSFER_TEXT.cancelBody(request.counsellor?.name ?? null)}
        </ConfirmDialog>
      )}
    </>
  );
}
