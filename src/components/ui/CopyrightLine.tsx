"use client";

import { useSyncExternalStore } from "react";

import { FIRST_YEAR, copyrightLine, yearInNepal } from "@/lib/brand/copyright";

const noChanges = (): (() => void) => () => undefined;
const yearOnServer = (): number => FIRST_YEAR;

/**
 * The copyright line, small and quiet (owner, 2026-11-27): under the login panel and at the end
 * of every page (`PageFooter`). A page built ahead of time can't read the date (Next.js), so it is drawn with the
 * first year and the browser puts in this year as it starts.
 */
export function CopyrightLine() {
  const year = useSyncExternalStore(noChanges, yearInNepal, yearOnServer);
  return <p className="text-small text-ink-3 text-center">{copyrightLine(year)}</p>;
}

/**
 * The end of every page, inside it: the copyright line, after the content and at least 64 below
 * it, at the bottom of the window on a short page. It scrolls with the page and never stays on
 * screen. A page that fills the window (the Inbox) has none (globals.css).
 */
export function PageFooter() {
  return (
    <footer data-page-footer="" className="max-w-content mx-auto mt-auto w-full pt-16">
      <CopyrightLine />
    </footer>
  );
}
