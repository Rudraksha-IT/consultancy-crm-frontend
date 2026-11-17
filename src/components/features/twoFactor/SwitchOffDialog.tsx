"use client";

import { useId, useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";
import {
  switchTwoFactorOff,
  type SecondStepAnswer,
  type TwoFactorSide,
  type TwoFactorState,
} from "@/lib/api";

import { readSecondStep, refusalOf } from "./secondStep";
import { SecondStepField } from "./SecondStepField";
import { errorsOf } from "./useRefusal";

type SwitchOffDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSwitchedOff: (state: TwoFactorState) => void;
  side: TwoFactorSide;
};

type Errors = { password?: string; number?: string; form?: string };
type Proof = { password: string } & SecondStepAnswer;

/** Switch two-step login off: my password and a number (or a recovery code, for a lost phone). */
export function SwitchOffDialog({ isOpen, onClose, onSwitchedOff, side }: SwitchOffDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const reading = readProof(new FormData(event.currentTarget), isRecoveryCode);
    setErrors("errors" in reading ? reading.errors : {});
    if ("errors" in reading) return;
    setIsSaving(true);
    try {
      onSwitchedOff(await switchTwoFactorOff(reading.proof, fetch, side));
      showToast(TEXT.switchedOff);
    } catch (error) {
      const refusal = refusalOf(error, isRecoveryCode);
      setErrors({ [refusal.field ?? "form"]: refusal.message });
    }
    setIsSaving(false);
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={TEXT.switchOffTitle}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{TEXT.cancel}</Button>
          <Button type="submit" form={formId} variant="danger" isLoading={isSaving}>
            {TEXT.switchOff}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <p>{TEXT.switchOffBody}</p>
        <TextField
          label={TEXT.password}
          name="password"
          type="password"
          autoComplete="current-password"
          errors={errorsOf(errors.password)}
        />
        <SecondStepField
          isRecoveryCode={isRecoveryCode}
          onSwitch={() => {
            setIsRecoveryCode(!isRecoveryCode);
            setErrors({});
          }}
          errors={errorsOf(errors.number)}
        />
        {errors.form !== undefined && <Banner tone="problem">{errors.form}</Banner>}
      </form>
    </Dialog>
  );
}

/** The password and second step the form holds, or what to fix first. */
function readProof(form: FormData, isRecoveryCode: boolean): { proof: Proof } | { errors: Errors } {
  const typed = form.get("password");
  const password = typeof typed === "string" ? typed : "";
  const reading = readSecondStep(form, isRecoveryCode);
  if (password !== "" && "answer" in reading) return { proof: { password, ...reading.answer } };
  return {
    errors: {
      ...("problem" in reading ? { number: reading.problem } : {}),
      ...missingPassword(password),
    },
  };
}

function missingPassword(password: string): Errors {
  return password === "" ? { password: TEXT.enterPassword } : {};
}
