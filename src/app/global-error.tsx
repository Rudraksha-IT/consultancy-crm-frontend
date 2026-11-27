"use client";

import { FailedScreen } from "@/components/features/errors/FailedScreen";
import { TAB_ICON } from "@/constants/tabIcon";

import "./globals.css";

type GlobalErrorProps = {
  /** `digest` is Next.js's reference for a server error; the server log has the same one. */
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The root layout itself failed, so this replaces the whole document: the same page and
 * reference as the error page (issue 58).
 */
export default function GlobalError({ error }: GlobalErrorProps) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href={TAB_ICON.path} />
      </head>
      <body className="bg-canvas text-ink min-h-full">
        <FailedScreen reference={error.digest} />
      </body>
    </html>
  );
}
