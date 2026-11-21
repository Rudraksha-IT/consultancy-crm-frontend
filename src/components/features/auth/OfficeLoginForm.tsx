"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { LOGIN_RETURN_PARAMS } from "@/constants/session";
import { ROUTES } from "@/constants/routes";
import type { TwoFactorStep } from "@/lib/api";
import { emailFromAddress } from "@/lib/centralLogin";
import { isLoginEndedAddress, safeNextPath } from "@/lib/loginReturn";

import { LoginForm } from "./LoginForm";
import { StaffSecondStep } from "./StaffSecondStep";

/**
 * The office's login form, with the email filled in from `?email=` when a Central login link
 * opened it (issue 44). The value only fills the field; it is checked like anything typed. With
 * two-step login on (issue 62), the number from the app (or its setup) comes after the password.
 * After a login ended (ticket 14), `?session=ended` says so and `?next=` is the page to go back to.
 */
export function OfficeLoginForm() {
  const params = useSearchParams();
  const [step, setStep] = useState<TwoFactorStep | null>(null);
  const homePath = safeNextPath(params.get(LOGIN_RETURN_PARAMS.next)) ?? ROUTES.home;
  if (step !== null) {
    return (
      <StaffSecondStep
        step={step}
        homePath={homePath}
        onStartAgain={() => {
          setStep(null);
        }}
      />
    );
  }
  return (
    <LoginForm
      initialEmail={emailFromAddress(params.get("email"))}
      homePath={homePath}
      hasLoginEnded={isLoginEndedAddress(params)}
      onTwoFactor={setStep}
    />
  );
}
