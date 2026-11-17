"use client";

import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionMenu, useSectionChoice } from "@/components/ui/SectionMenu";
import { LABELS } from "@/constants/messages";
import { PLATFORM_ACCOUNT_TEXT as TEXT } from "@/constants/platformAccount";
import { ROUTES } from "@/constants/routes";
import { TWO_FACTOR_TEXT } from "@/constants/twoFactor";

import { AccountDetailsForm } from "./AccountDetailsForm";
import { AccountPasswordForm } from "./AccountPasswordForm";
import { SecuritySection } from "@/components/features/twoFactor/SecuritySection";
import { useMyTwoFactor } from "@/components/features/twoFactor/useMyTwoFactor";

/**
 * The Platform Admin's own Account (issue 59), in the style of a person's Settings, one section
 * at a time (issue 96): my name and email, my password, then two-step login (issue 61). Every change needs the current password,
 * and a number from the app once two-step login is set up.
 */
export function PlatformAccountPage() {
  const { twoFactor, set } = useMyTwoFactor();
  const choice = useSectionChoice("details");
  const needsNumber = twoFactor.kind === "loaded" && twoFactor.state.setUp;
  return (
    <div className="grid gap-8">
      <PageHeader
        title={TEXT.title}
        subtitle={TEXT.intro}
        crumbs={
          <Link
            href={ROUTES.platformHome}
            className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
          >
            <Icon name="left" />
            {LABELS.consultancies}
          </Link>
        }
      />
      <SectionMenu
        label={TEXT.title}
        backLabel={TEXT.backLabel}
        sections={[
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
        ]}
        choice={choice}
      />
    </div>
  );
}
