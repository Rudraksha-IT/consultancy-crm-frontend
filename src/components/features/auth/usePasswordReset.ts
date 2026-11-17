"use client";

import { useState } from "react";

import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import {
  checkPlatformResetCode,
  checkResetCode,
  completePasswordReset,
  completePlatformPasswordReset,
  InvalidCodeError,
  PasswordRulesNotMetError,
  requestPlatformResetCode,
  requestResetCode,
  type PasswordReset,
  type ResetCode,
  type TwoFactorSide,
  type TwoFactorStep,
} from "@/lib/api";
import { isCompleteCode, normaliseCode } from "@/lib/codes";
import { describeMissingRules, unmetRules } from "@/lib/password";

/** Your email (0) -> Enter your code (1) -> Choose a password (2). */
export type ResetStep = 0 | 1 | 2;

export type PasswordResetState = {
  step: ResetStep;
  email: string;
  isSubmitting: boolean;
  error: string | null;
  /** The password is saved, and two-step login comes next (issue 62): a Code never skips it. */
  twoFactorStep: TwoFactorStep | null;
  /** Good news shown as a status, e.g. that a new Code was sent. */
  notice: string | null;
  sendCode: (email: string) => Promise<void>;
  resendCode: () => Promise<void>;
  checkCode: (typed: string) => Promise<void>;
  choosePassword: (password: string, confirmation: string) => Promise<void>;
};

type Progress = { step: ResetStep; email: string; code: string };

/** Whose password is reset: a Staff member's on their office, or a Platform Admin's (issue 63). */
export type ResetSide = TwoFactorSide;

/** What happens once the password is saved. */
type Saved = { kind: "open"; path: string } | { kind: "twoFactor"; step: TwoFactorStep };

type ResetCalls = {
  requestCode: (email: string) => Promise<void>;
  checkCode: (code: ResetCode) => Promise<void>;
  choosePassword: (reset: PasswordReset) => Promise<Saved>;
};

const CALLS: Record<ResetSide, ResetCalls> = {
  staff: {
    requestCode: (email) => requestResetCode(email),
    checkCode: (code) => checkResetCode(code),
    // Staff are logged in at once, unless two-step login comes next (issue 62).
    choosePassword: async (reset) => {
      const outcome = await completePasswordReset(reset);
      return outcome.kind === "twoFactor" ? outcome : { kind: "open", path: ROUTES.home };
    },
  },
  platform: {
    requestCode: (email) => requestPlatformResetCode(email),
    checkCode: (code) => checkPlatformResetCode(code),
    // Every Platform session ends: log in again, with two-step login if it is on.
    choosePassword: async (reset) => {
      await completePlatformPasswordReset(reset);
      return { kind: "open", path: ROUTES.platformLoginAfterReset };
    },
  },
};

/** The steps of resetting a forgotten password with an emailed Code (spec 16, issue 63). */
export function usePasswordReset(side: ResetSide = "staff"): PasswordResetState {
  const calls = CALLS[side];
  const navigate = useFullPageNavigation();
  const [progress, setProgress] = useState<Progress>({ step: 0, email: "", code: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [twoFactorStep, setTwoFactorStep] = useState<TwoFactorStep | null>(null);

  /** Run one call: show it's busy, clear old messages, and turn a failure into a message. */
  async function run(task: () => Promise<void>, explain: (caught: unknown) => string) {
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await task();
    } catch (caught) {
      setError(explain(caught));
    }
    setIsSubmitting(false);
  }

  function refuse(message: string): Promise<void> {
    setNotice(null);
    setError(message);
    return Promise.resolve();
  }

  function sendCode(typed: string): Promise<void> {
    const email = typed.trim();
    if (email === "") return refuse(MESSAGES.enterEmail);
    return run(async () => {
      await calls.requestCode(email);
      setProgress({ step: 1, email, code: "" });
    }, unexpected);
  }

  function resendCode(): Promise<void> {
    return run(async () => {
      await calls.requestCode(progress.email);
      setNotice(MESSAGES.newCodeSent);
    }, unexpected);
  }

  function checkCode(typed: string): Promise<void> {
    const code = normaliseCode(typed);
    if (!isCompleteCode(code)) return refuse(MESSAGES.enterCode);
    return run(async () => {
      await calls.checkCode({ email: progress.email, code });
      setProgress({ ...progress, step: 2, code });
    }, explainCodeFailure);
  }

  function choosePassword(password: string, confirmation: string): Promise<void> {
    const problem = passwordProblem(password, confirmation);
    if (problem !== null) return refuse(problem);
    return run(async () => {
      const saved = await calls.choosePassword({
        email: progress.email,
        code: progress.code,
        password,
      });
      if (saved.kind === "twoFactor") setTwoFactorStep(saved.step);
      else navigate(saved.path);
    }, explainPasswordFailure);
  }

  function explainPasswordFailure(caught: unknown): string {
    if (caught instanceof PasswordRulesNotMetError) {
      return MESSAGES.passwordStillNeeds(describeMissingRules(caught.unmet));
    }
    if (caught instanceof InvalidCodeError) setProgress({ ...progress, step: 1, code: "" });
    return explainCodeFailure(caught);
  }

  return {
    step: progress.step,
    email: progress.email,
    isSubmitting,
    error,
    notice,
    twoFactorStep,
    sendCode,
    resendCode,
    checkCode,
    choosePassword,
  };
}

function passwordProblem(password: string, confirmation: string): string | null {
  const unmet = unmetRules(password);
  if (unmet.length > 0) return MESSAGES.passwordStillNeeds(describeMissingRules(unmet));
  return password === confirmation ? null : MESSAGES.passwordsDiffer;
}

function explainCodeFailure(caught: unknown): string {
  return caught instanceof InvalidCodeError ? MESSAGES.codeRefused : unexpected();
}

function unexpected(): string {
  return MESSAGES.tryAgainLater;
}
