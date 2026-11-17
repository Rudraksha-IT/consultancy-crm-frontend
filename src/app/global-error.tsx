"use client";

import { UnexpectedError } from "@/components/features/errors/UnexpectedError";
import { Button } from "@/components/ui/Button";
import { MESSAGES } from "@/constants/messages";

import "./globals.css";

type GlobalErrorProps = {
  /** `digest` is Next.js's reference for a server error; the server log has the same one. */
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The root layout itself failed, so this replaces the whole document: the same banner and
 * reference as the error page (issue 58).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-canvas text-ink min-h-full">
        <main className="max-w-content mx-auto grid w-full content-center gap-4 px-4 py-16">
          <UnexpectedError
            reference={error.digest}
            action={<Button onClick={reset}>{MESSAGES.tryAgain}</Button>}
          />
        </main>
      </body>
    </html>
  );
}
