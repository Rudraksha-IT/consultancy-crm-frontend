"use client";

import { useEffect, useRef, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { ROUTES } from "@/constants/routes";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { enterSupportVisit, isEntryCode } from "@/lib/api";

type SupportEnterProps = {
  /** Swaps the code for a login; the API by default. */
  enter?: (code: string) => Promise<unknown>;
};

/**
 * On the office's own address: the Platform sends a Platform Admin here with a one-time code
 * after the "#". The code is taken off the address at once (it never reaches a server log or the
 * history), swapped for a login, and the office's Home opens.
 */
export function SupportEnter({ enter = enterSupportVisit }: SupportEnterProps) {
  const navigate = useFullPageNavigation();
  const [hasFailed, setHasFailed] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    // The code works once, so it is read and used once, however often this runs.
    if (hasStarted.current) return;
    hasStarted.current = true;
    const code = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    const attempt = isEntryCode(code) ? enter(code) : Promise.reject(new Error("No entry code"));
    attempt.then(
      () => {
        navigate(ROUTES.home);
      },
      () => {
        setHasFailed(true);
      },
    );
  }, [enter, navigate]);

  return (
    <main className="grid min-h-full place-items-center p-6">
      {hasFailed ? (
        <Banner tone="problem">{SUPPORT_TEXT.enterFailed}</Banner>
      ) : (
        <p className="text-ink-2">{SUPPORT_TEXT.entering}</p>
      )}
    </main>
  );
}
