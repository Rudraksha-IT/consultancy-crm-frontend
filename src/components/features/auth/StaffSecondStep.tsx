"use client";

import { TwoFactorSetup } from "@/components/features/twoFactor/TwoFactorSetup";
import { TwoFactorVerifyForm } from "@/components/features/twoFactor/TwoFactorVerifyForm";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import type { TwoFactorStep } from "@/lib/api";

type StaffSecondStepProps = {
  step: TwoFactorStep;
  /** Where to go once it passes: Home, or the page the person was on (ticket 14). */
  homePath?: string;
  /** Back to the password (or the login page), after the login has timed out or was used. */
  onStartAgain: () => void;
};

/**
 * The second step of a Staff login on the office's address (issue 62): the number from the app,
 * or setting the app up first. It follows the password, joining with an Invite Code and a reset
 * by Code alike, and opens Home once it passes.
 */
export function StaffSecondStep({
  step,
  homePath = ROUTES.home,
  onStartAgain,
}: StaffSecondStepProps) {
  const navigate = useFullPageNavigation();

  function openHome(): void {
    navigate(homePath);
  }

  if (step === "verify") {
    return <TwoFactorVerifyForm side="staff" onPassed={openHome} onStartAgain={onStartAgain} />;
  }
  // The login screens have no app shell: setup brings its own toasts ("Key copied").
  return (
    <ToastProvider>
      <TwoFactorSetup side="staff" onDone={openHome} onStartAgain={onStartAgain} />
    </ToastProvider>
  );
}
