"use client";

import { CodeField } from "@/components/ui/CodeField";
import { TextField } from "@/components/ui/TextField";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";

type SecondStepFieldProps = {
  isRecoveryCode: boolean;
  onSwitch: () => void;
  errors?: readonly string[] | undefined;
  /** The number field's label; a dialog may name it differently from the login step. */
  numberLabel?: string;
};

/**
 * The number from the authenticator app (6 digits, the number keypad, one-time-code autofill),
 * or a recovery code instead, with a link button to switch between them.
 */
export function SecondStepField({
  isRecoveryCode,
  onSwitch,
  errors,
  numberLabel = TEXT.numberLabel,
}: SecondStepFieldProps) {
  return (
    <div className="grid gap-2">
      {isRecoveryCode ? (
        <TextField
          key="recoveryCode"
          label={TEXT.recoveryCodeLabel}
          name="recoveryCode"
          autoComplete="off"
          placeholder="abcd-efgh-jkmn"
          errors={errors}
        />
      ) : (
        <CodeField key="code" label={numberLabel} name="code" errors={errors} />
      )}
      <button
        type="button"
        onClick={onSwitch}
        className="text-accent min-h-control justify-self-start font-semibold"
      >
        {isRecoveryCode ? TEXT.useNumber : TEXT.useRecoveryCode}
      </button>
    </div>
  );
}
