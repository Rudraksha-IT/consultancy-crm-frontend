"use client";

import { useState } from "react";

import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import {
  checkJoinCode,
  checkPlatformJoinCode,
  completeJoin,
  completePlatformJoin,
  InvalidCodeError,
  PasswordRulesNotMetError,
  requestJoinCode,
  requestPlatformJoinCode,
  type PasswordReset,
  type ResetCode,
  type TwoFactorSide,
  type TwoFactorStep,
} from "@/lib/api";
import { isCompleteCode, normaliseCode } from "@/lib/codes";
import { describeMissingRules, unmetRules } from "@/lib/password";

/** Enter your code (0) -> Choose a password (1). */
export type JoinStep = 0 | 1;

export type JoinState = {
  step: JoinStep;
  email: string;
  isSubmitting: boolean;
  error: string | null;
  /** The password is saved, and two-step login comes next (issue 62): a Code never skips it. */
  twoFactorStep: TwoFactorStep | null;
  notice: string | null;
  checkCode: (email: string, typed: string) => Promise<void>;
  sendNewCode: (email: string) => Promise<void>;
  choosePassword: (password: string, confirmation: string) => Promise<void>;
};

type Progress = { step: JoinStep; email: string; code: string };

/** What happens once the password is saved. */
type Joined = { kind: "open"; path: string } | { kind: "twoFactor"; step: TwoFactorStep };

type JoinCalls = {
  requestCode: (email: string) => Promise<void>;
  checkCode: (code: ResetCode) => Promise<void>;
  choosePassword: (join: PasswordReset) => Promise<Joined>;
};

const CALLS: Record<TwoFactorSide, JoinCalls> = {
  staff: {
    requestCode: (email) => requestJoinCode(email),
    checkCode: (code) => checkJoinCode(code),
    // Staff are logged in at once, unless two-step login comes next (issue 62).
    choosePassword: async (join) => {
      const outcome = await completeJoin(join);
      return outcome.kind === "twoFactor" ? outcome : { kind: "open", path: ROUTES.home };
    },
  },
  platform: {
    requestCode: (email) => requestPlatformJoinCode(email),
    checkCode: (code) => checkPlatformJoinCode(code),
    // A Platform Admin then logs in, with two-step login as usual (issue 65).
    choosePassword: async (join) => {
      await completePlatformJoin(join);
      return { kind: "open", path: ROUTES.platformLoginAfterJoin };
    },
  },
};

/** The steps of joining with an Invite Code (spec 18b, 18c; the Platform's, issue 65). */
export function useJoin(
  side: TwoFactorSide = "staff",
  knownEmail = "",
  codeSent = false,
): JoinState {
  const calls = CALLS[side];
  const navigate = useFullPageNavigation();
  const [progress, setProgress] = useState<Progress>({ step: 0, email: knownEmail, code: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(codeSent ? MESSAGES.joinCodeEmailed : null);
  const [twoFactorStep, setTwoFactorStep] = useState<TwoFactorStep | null>(null);

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

  function checkCode(typedEmail: string, typedCode: string): Promise<void> {
    const email = typedEmail.trim();
    const code = normaliseCode(typedCode);
    if (email === "") return refuse(MESSAGES.enterEmail);
    if (!isCompleteCode(code)) return refuse(MESSAGES.enterCode);
    return run(async () => {
      await calls.checkCode({ email, code });
      setProgress({ step: 1, email, code });
    }, explainCodeFailure);
  }

  function sendNewCode(typedEmail: string): Promise<void> {
    const email = typedEmail.trim();
    if (email === "") return refuse(MESSAGES.enterEmail);
    return run(async () => {
      await calls.requestCode(email);
      setNotice(MESSAGES.newJoinCodeSent);
    }, unexpected);
  }

  function choosePassword(password: string, confirmation: string): Promise<void> {
    const problem = passwordProblem(password, confirmation);
    if (problem !== null) return refuse(problem);
    return run(async () => {
      const joined = await calls.choosePassword({
        email: progress.email,
        code: progress.code,
        password,
      });
      if (joined.kind === "twoFactor") setTwoFactorStep(joined.step);
      else navigate(joined.path);
    }, explainPasswordFailure);
  }

  function explainPasswordFailure(caught: unknown): string {
    if (caught instanceof PasswordRulesNotMetError) {
      return MESSAGES.passwordStillNeeds(describeMissingRules(caught.unmet));
    }
    if (caught instanceof InvalidCodeError) setProgress({ ...progress, step: 0, code: "" });
    return explainCodeFailure(caught);
  }

  return {
    step: progress.step,
    email: progress.email,
    isSubmitting,
    error,
    notice,
    twoFactorStep,
    checkCode,
    sendNewCode,
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
