import type { ReactNode } from "react";

import { Banner } from "@/components/ui/Banner";
import { MESSAGES } from "@/constants/messages";

type UnexpectedErrorProps = {
  /** What staff quote to us: the server's correlation ID, or Next.js's error digest. */
  reference: string | undefined;
  action?: ReactNode;
};

/** The unexpected-error banner, with the reference to quote when there is one (issue 58). */
export function UnexpectedError({ reference, action }: UnexpectedErrorProps) {
  return (
    <Banner tone="problem" action={action}>
      {MESSAGES.unexpectedError}
      {reference !== undefined && (
        <span className="text-small block">{MESSAGES.errorReference(reference)}</span>
      )}
    </Banner>
  );
}
