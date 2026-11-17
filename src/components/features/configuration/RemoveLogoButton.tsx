"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LOGO_TEXT } from "@/constants/logo";

type RemoveLogoButtonProps = {
  /** The confirm dialog's title and body: the office's logo or the product's. */
  title: string;
  body: string;
  isDisabled: boolean;
  /** Removes it; rejects when that failed. */
  onRemove: () => Promise<void>;
};

/** "Remove" beside a logo, asking first in the shared confirm dialog. */
export function RemoveLogoButton({ title, body, isDisabled, onRemove }: RemoveLogoButtonProps) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        isDisabled={isDisabled}
        onClick={() => {
          setIsAsking(true);
        }}
      >
        {LOGO_TEXT.remove}
      </Button>
      {isAsking && (
        <ConfirmDialog
          title={title}
          actionLabel={LOGO_TEXT.remove}
          onClose={() => {
            setIsAsking(false);
          }}
          onConfirm={async () => {
            await onRemove();
            setIsAsking(false);
          }}
          failureOf={() => LOGO_TEXT.removeFailed}
        >
          {body}
        </ConfirmDialog>
      )}
    </>
  );
}
