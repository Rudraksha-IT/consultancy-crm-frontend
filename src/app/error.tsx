"use client";

import { UnexpectedError } from "@/components/features/errors/UnexpectedError";
import { Button } from "@/components/ui/Button";
import { MESSAGES } from "@/constants/messages";

type ErrorPageProps = {
  /** `digest` is Next.js's reference for a server error; the server log has the same one. */
  error: Error & { digest?: string };
  reset: () => void;
};

/** A screen failed: the unexpected-error banner, with the reference staff can quote (issue 58). */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="max-w-content mx-auto grid w-full content-center gap-4 px-4 py-16">
      <UnexpectedError
        reference={error.digest}
        action={<Button onClick={reset}>{MESSAGES.tryAgain}</Button>}
      />
    </main>
  );
}
