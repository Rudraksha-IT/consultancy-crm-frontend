"use client";

import type { MenuSection } from "@/components/ui/SectionMenu";
import { PLATFORM_ACCOUNT_TEXT as TEXT } from "@/constants/platformAccount";
import { TWO_FACTOR_TEXT } from "@/constants/twoFactor";
import { SecuritySection } from "@/components/features/twoFactor/SecuritySection";
import { useMyTwoFactor } from "@/components/features/twoFactor/useMyTwoFactor";

import { AccountDetailsForm } from "./AccountDetailsForm";
import { AccountPasswordForm } from "./AccountPasswordForm";

/**
 * The Platform Admin's own account (issue 59) as sections of the Platform's Settings (list
 * tidy-ups 04): my name and email, my password, then two-step login (issue 61). Every change
 * needs the current password, and a number from the app once two-step login is set up.
 */
export function usePlatformAccountSections(): MenuSection[] {
  const { twoFactor, set } = useMyTwoFactor();
  const needsNumber = twoFactor.kind === "loaded" && twoFactor.state.setUp;
  return [
    {
      id: "details",
      title: TEXT.details.title,
      description: TEXT.details.help,
      content: <AccountDetailsForm />,
    },
    {
      id: "password",
      title: TEXT.password.title,
      description: TEXT.password.help,
      content: <AccountPasswordForm needsNumber={needsNumber} />,
    },
    {
      id: "security",
      title: TWO_FACTOR_TEXT.securityTitle,
      description: TWO_FACTOR_TEXT.securityHelp,
      content: <SecuritySection twoFactor={twoFactor} onChanged={set} />,
    },
  ];
}
