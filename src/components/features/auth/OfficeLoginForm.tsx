"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import type { TwoFactorStep } from "@/lib/api";
import { emailFromAddress } from "@/lib/centralLogin";

import { LoginForm } from "./LoginForm";
import { StaffSecondStep } from "./StaffSecondStep";

/**
 * The office's login form, with the email filled in from `?email=` when a Central login link
 * opened it (issue 44). The value only fills the field; it is checked like anything typed. With
 * two-step login on (issue 62), the number from the app (or its setup) comes after the password.
 */
export function OfficeLoginForm() {
  const params = useSearchParams();
  const [step, setStep] = useState<TwoFactorStep | null>(null);
  if (step !== null) {
    return (
      <StaffSecondStep
        step={step}
        onStartAgain={() => {
          setStep(null);
        }}
      />
    );
  }
  return <LoginForm initialEmail={emailFromAddress(params.get("email"))} onTwoFactor={setStep} />;
}
