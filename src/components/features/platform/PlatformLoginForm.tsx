"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { logInToPlatform, type TwoFactorStep } from "@/lib/api";

import { LoginForm } from "@/components/features/auth/LoginForm";
import { TwoFactorSetup } from "@/components/features/twoFactor/TwoFactorSetup";
import { TwoFactorVerifyForm } from "@/components/features/twoFactor/TwoFactorVerifyForm";

/**
 * `?password=changed`: a forgotten password was just reset (issue 63); `?password=set`: someone
 * just joined (issue 65). Any other value is ignored.
 */
const NOTICES: Record<string, string> = {
  changed: MESSAGES.passwordChangedLogIn,
  set: MESSAGES.passwordSetLogIn,
};

/**
 * The login form on the Platform subdomain: logs a Platform Admin in, then opens the list. With
 * two-step login on (issue 61), the number from the app (or its setup) comes after the password.
 * "Forgot your password?" opens the Platform's own reset by Code (issue 63).
 */
export function PlatformLoginForm() {
  const params = useSearchParams();
  const navigate = useFullPageNavigation();
  const [step, setStep] = useState<TwoFactorStep | null>(null);

  function openPlatform(): void {
    navigate(ROUTES.platformHome);
  }

  function startAgain(): void {
    setStep(null);
  }

  if (step === "verify") {
    return <TwoFactorVerifyForm onPassed={openPlatform} onStartAgain={startAgain} />;
  }
  if (step === "setup") {
    // The login page has no app shell: setup brings its own toasts ("Key copied").
    return (
      <ToastProvider>
        <TwoFactorSetup onDone={openPlatform} onStartAgain={startAgain} />
      </ToastProvider>
    );
  }
  return (
    <LoginForm
      logIn={logInToPlatform}
      homePath={ROUTES.platformHome}
      forgotPasswordPath={ROUTES.platformForgotPassword}
      side="platform"
      notice={noticeFor(params.get("password"))}
      onTwoFactor={setStep}
    />
  );
}

function noticeFor(value: string | null): string | null {
  return value !== null && Object.hasOwn(NOTICES, value) ? (NOTICES[value] ?? null) : null;
}
