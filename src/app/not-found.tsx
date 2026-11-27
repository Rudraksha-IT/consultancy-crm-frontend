"use client";

import { usePathname, useRouter } from "next/navigation";

import { ErrorScreen } from "@/components/features/errors/ErrorScreen";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";

/**
 * An address that doesn't exist: a page that says so, with the way home (the Platform for
 * `/platform/...`) and the way back (owner, 2026-11-27; until then it took the person to Home by
 * itself, issue 66). Home sends someone logged out to their login page.
 */
export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const isPlatform =
    pathname === ROUTES.platformHome || pathname.startsWith(`${ROUTES.platformHome}/`);

  return (
    <ErrorScreen
      code={MESSAGES.notFoundCode}
      title={MESSAGES.notFoundTitle}
      help={MESSAGES.notFoundHelp}
      actions={
        <>
          <ButtonLink
            variant="primary"
            icon="home"
            href={isPlatform ? ROUTES.platformHome : ROUTES.home}
          >
            {isPlatform ? MESSAGES.goToPlatform : LABELS.goHome}
          </ButtonLink>
          <Button
            icon="left"
            onClick={() => {
              router.back();
            }}
          >
            {MESSAGES.goBack}
          </Button>
        </>
      }
    />
  );
}
