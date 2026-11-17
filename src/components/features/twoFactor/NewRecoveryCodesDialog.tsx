"use client";

import { useId, useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { CodeField } from "@/components/ui/CodeField";
import { Dialog } from "@/components/ui/Dialog";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";
import { makeNewRecoveryCodes, type TwoFactorSide } from "@/lib/api";

import { RecoveryCodes } from "./RecoveryCodes";
import { readNumber } from "./secondStep";
import { errorsOf, useRefusal } from "./useRefusal";

type NewRecoveryCodesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /** New codes were made; how many there are now. */
  onMade: (count: number) => void;
  side: TwoFactorSide;
};

/** Make 10 new recovery codes with a number; the old ones stop working. Shown once. */
export function NewRecoveryCodesDialog({
  isOpen,
  onClose,
  onMade,
  side,
}: NewRecoveryCodesDialogProps) {
  const [codes, setCodes] = useState<readonly string[] | null>(null);

  function close(): void {
    setCodes(null);
    onClose();
  }

  if (codes !== null) {
    return (
      <Dialog
        isOpen={isOpen}
        title={TEXT.codesTitle}
        onClose={close}
        footer={
          <Button variant="primary" onClick={close}>
            {TEXT.done}
          </Button>
        }
      >
        <p>{TEXT.codesIntro}</p>
        <RecoveryCodes codes={codes} />
      </Dialog>
    );
  }
  return (
    <NumberDialog
      side={side}
      isOpen={isOpen}
      onClose={close}
      onMade={(made) => {
        setCodes(made);
        onMade(made.length);
      }}
    />
  );
}

type NumberDialogProps = {
  side: TwoFactorSide;
  isOpen: boolean;
  onClose: () => void;
  onMade: (codes: readonly string[]) => void;
};

function NumberDialog({ side, isOpen, onClose, onMade }: NumberDialogProps) {
  const formId = useId();
  const refusal = useRefusal();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    refusal.clear();
    const code = readNumber(new FormData(event.currentTarget));
    if (code === null) {
      refusal.setFieldError(TEXT.enterNumber);
      return;
    }
    setIsSaving(true);
    try {
      onMade(await makeNewRecoveryCodes(code, fetch, side));
    } catch (error) {
      refusal.show(error, false);
    }
    setIsSaving(false);
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={TEXT.newCodes}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{TEXT.cancel}</Button>
          <Button type="submit" form={formId} variant="primary" isLoading={isSaving}>
            {TEXT.makeCodes}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <p>{TEXT.newCodesBody}</p>
        <CodeField label={TEXT.numberLabel} name="code" errors={errorsOf(refusal.fieldError)} />
        {refusal.problem !== null && <Banner tone="problem">{refusal.problem}</Banner>}
      </form>
    </Dialog>
  );
}
