"use client";

import { useSyncExternalStore } from "react";

import { FIRST_YEAR, copyrightLine, yearInNepal } from "@/lib/brand/copyright";

const noChanges = (): (() => void) => () => undefined;
const yearOnServer = (): number => FIRST_YEAR;

/**
 * The copyright line, small and quiet (owner, 2026-11-27): under the login panel and at the foot
 * of Settings. A page built ahead of time can't read the date (Next.js), so it is drawn with the
 * first year and the browser puts in this year as it starts.
 */
export function CopyrightLine() {
  const year = useSyncExternalStore(noChanges, yearInNepal, yearOnServer);
  return <p className="text-small text-ink-3 text-center">{copyrightLine(year)}</p>;
}
