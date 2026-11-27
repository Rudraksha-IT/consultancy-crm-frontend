import type { ReactNode } from "react";

import { MESSAGES } from "@/constants/messages";

type ErrorScreenProps = {
  /** A short code shown large and quiet above the title, such as "404". */
  code?: string;
  title: string;
  /** What to do about it, in a sentence. */
  help: string;
  /** What staff quote to us: Next.js's error digest. Shown only when there is one. */
  reference?: string | undefined;
  /** The title is news (a screen just failed), so screen readers are told at once. */
  isAlert?: boolean;
  /** The ways on: the main one first. */
  actions: ReactNode;
};

/**
 * One page for when the app can't show what was asked for (owner, 2026-11-27): an address that
 * doesn't exist, or a screen that failed. What happened, what to do, and the ways on, in the
 * middle of the window. It uses nothing that needs the session, so it shows logged out too.
 */
export function ErrorScreen({ code, title, help, reference, isAlert, actions }: ErrorScreenProps) {
  return (
    <main className="bg-canvas grid min-h-full place-items-center px-4 py-16">
      <div className="rounded-panel border-sheet-rule bg-paper shadow-raise max-phone:px-gutter grid w-full max-w-prose justify-items-center gap-3 border px-8 py-10 text-center">
        {code !== undefined && (
          <p aria-hidden="true" className="text-figure text-ink-3 font-medium tabular-nums">
            {code}
          </p>
        )}
        <div role={isAlert === true ? "alert" : undefined} className="grid gap-1.5">
          <h1 className="text-page-title-sm wide:text-page-title text-balance">{title}</h1>
          {reference !== undefined && (
            <p className="text-small text-ink-2">{MESSAGES.errorReference(reference)}</p>
          )}
        </div>
        <p className="text-ink-2 max-w-prose">{help}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </div>
    </main>
  );
}
