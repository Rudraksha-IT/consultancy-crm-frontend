"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";
import { verifyStaffTwoFactor, verifyTwoFactor, type TwoFactorSide } from "@/lib/api";

import { isStartAgain, readSecondStep } from "./secondStep";
import { SecondStepField } from "./SecondStepField";
import { StartAgain } from "./StartAgain";
import { errorsOf, useRefusal } from "./useRefusal";

type TwoFactorVerifyFormProps = {
  /** The second step passed: the Next.js server now holds the login tokens. */
  onPassed: () => void;
  /** Back to the password, after the sign-in has timed out or was used. */
  onStartAgain: () => void;
  /** A Platform Admin's login (61), or a Staff member's on their office's address (62). */
  side?: TwoFactorSide;
};

/** The second step of a login (issue 61): the number from the app, or a recovery code. */
export function TwoFactorVerifyForm({
  onPassed,
  onStartAgain,
  side = "platform",
}: TwoFactorVerifyFormProps) {
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [mustStartAgain, setMustStartAgain] = useState(false);
  const refusal = useRefusal();

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    refusal.clear();
    const reading = readSecondStep(new FormData(event.currentTarget), isRecoveryCode);
    if ("problem" in reading) {
      refusal.setFieldError(reading.problem);
      return;
    }
    setIsChecking(true);
    try {
      await (side === "staff" ? verifyStaffTwoFactor : verifyTwoFactor)(reading.answer);
      onPassed();
    } catch (error) {
      setIsChecking(false);
      if (isStartAgain(error)) setMustStartAgain(true);
      else refusal.show(error, isRecoveryCode);
    }
  }

  if (mustStartAgain) return <StartAgain onStartAgain={onStartAgain} />;

  return (
    <form noValidate className="grid gap-5" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-2">
        <h2 className="text-section-title">{TEXT.verifyTitle}</h2>
        <p className="text-ink-2">{isRecoveryCode ? TEXT.recoveryIntro : TEXT.verifyIntro}</p>
      </div>
      <SecondStepField
        isRecoveryCode={isRecoveryCode}
        onSwitch={() => {
          setIsRecoveryCode(!isRecoveryCode);
          refusal.clear();
        }}
        errors={errorsOf(refusal.fieldError)}
      />
      {refusal.problem !== null && <Banner tone="problem">{refusal.problem}</Banner>}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isChecking}
        loadingLabel={TEXT.checking}
      >
        {TEXT.continue}
      </Button>
    </form>
  );
}
