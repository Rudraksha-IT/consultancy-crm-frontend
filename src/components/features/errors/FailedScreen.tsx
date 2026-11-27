"use client";

import { ErrorScreen } from "@/components/features/errors/ErrorScreen";
import { Button } from "@/components/ui/Button";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Icon } from "@/components/ui/Icon";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { reloadPage } from "@/lib/browser";

type FailedScreenProps = {
  /** Next.js's reference for the error; the server log has the same one. */
  reference: string | undefined;
};

/**
 * A screen failed (owner, 2026-11-27): say so, with the reference staff can quote (issue 58).
 * The main way on is a full reload, which is what clears a failed screen; Home is a plain link,
 * so it too opens with a full load and nothing broken is kept.
 */
export function FailedScreen({ reference }: FailedScreenProps) {
  return (
    <ErrorScreen
      isAlert
      title={MESSAGES.unexpectedError}
      help={MESSAGES.errorHelp}
      reference={reference}
      actions={
        <>
          <Button variant="primary" onClick={reloadPage}>
            {MESSAGES.reloadPage}
          </Button>
          <a
            href={ROUTES.home}
            data-variant="secondary"
            className={buttonClasses("secondary", "md")}
          >
            <Icon name="home" size="sm" />
            {LABELS.goHome}
          </a>
        </>
      }
    />
  );
}
