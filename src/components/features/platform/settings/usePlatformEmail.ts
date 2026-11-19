"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/useToast";
import { PLATFORM_EMAIL_TEXT as TEXT } from "@/constants/platformTeam";
import {
  fetchPlatformEmail,
  sendTestEmail,
  TooManyTestEmailsError,
  type PlatformEmail,
} from "@/lib/api";

/**
 * The Platform's email status and "Send a test email" (spec 2026-11-18 stories 3-4). The status
 * is updated in place after a test, so the page never moves (design-system rule 8).
 */
export function usePlatformEmail() {
  const { showToast } = useToast();
  const [email, setEmail] = useState<PlatformEmail | null>(null);
  const [isLoadFailed, setIsLoadFailed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    fetchPlatformEmail().then(
      (found) => {
        if (isCurrent) setEmail(found);
      },
      () => {
        // The page still offers the test; it answers the status again.
        if (isCurrent) setIsLoadFailed(true);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);

  async function sendTest(): Promise<void> {
    setProblem(null);
    setIsSending(true);
    try {
      const shown = await sendTestEmail();
      setEmail(shown);
      setIsLoadFailed(false);
      showToast(shown.state === "working" ? TEXT.sent(shown.sentTo) : TEXT.sendFailed);
    } catch (error) {
      setProblem(error instanceof TooManyTestEmailsError ? TEXT.tooMany : TEXT.notStarted);
    } finally {
      setIsSending(false);
    }
  }

  return { email, isLoadFailed, isSending, problem, sendTest };
}
