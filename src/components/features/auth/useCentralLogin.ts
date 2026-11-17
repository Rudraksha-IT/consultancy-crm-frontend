"use client";

import { useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import { MESSAGES } from "@/constants/messages";
import { ApiRequestError, requestOfficeLinks } from "@/lib/api";

export type CentralLoginState = {
  /** True once the email was taken; the screen then shows the same confirmation for anyone. */
  isSent: boolean;
  isSubmitting: boolean;
  error: string | null;
  send: (email: string) => Promise<void>;
  startAgain: () => void;
};

/** The Central login (issue 44): one email field, then the same confirmation every time. */
export function useCentralLogin(): CentralLoginState {
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(typed: string): Promise<void> {
    const email = typed.trim();
    if (email === "") {
      setError(MESSAGES.enterEmail);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await requestOfficeLinks(email);
      setIsSent(true);
    } catch (caught) {
      setError(explain(caught));
    }
    setIsSubmitting(false);
  }

  function startAgain(): void {
    setError(null);
    setIsSent(false);
  }

  return { isSent, isSubmitting, error, send, startAgain };
}

function explain(caught: unknown): string {
  if (!(caught instanceof ApiRequestError)) return MESSAGES.tryAgainLater;
  if (caught.status === HTTP_STATUS.tooManyRequests) return MESSAGES.tooManyTries;
  if (caught.status === HTTP_STATUS.badRequest) return MESSAGES.enterValidEmail;
  return MESSAGES.tryAgainLater;
}
