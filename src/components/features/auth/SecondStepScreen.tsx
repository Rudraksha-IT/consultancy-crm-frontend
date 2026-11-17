"use client";

import type { ReactNode } from "react";

import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import type { TwoFactorStep } from "@/lib/api";

import { AuthLayout } from "./AuthLayout";
import { StaffSecondStep } from "./StaffSecondStep";

type SecondStepScreenProps = {
  brand: ReactNode;
  step: TwoFactorStep;
};

/**
 * After joining or a reset by Code, the password is saved, and two-step login still comes next
 * (issue 62). Starting again goes to the login page: the Code is used up.
 */
export function SecondStepScreen({ brand, step }: SecondStepScreenProps) {
  const navigate = useFullPageNavigation();
  return (
    <AuthLayout brand={brand} title={LABELS.twoStepLogin} intro={MESSAGES.passwordSavedTwoStepNext}>
      <StaffSecondStep
        step={step}
        onStartAgain={() => {
          navigate(ROUTES.login);
        }}
      />
    </AuthLayout>
  );
}
