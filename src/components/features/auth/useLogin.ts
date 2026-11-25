"use client";

import { useState } from "react";
import { z } from "zod";

import { MESSAGES } from "@/constants/messages";
import { SESSION_TEXT } from "@/constants/session";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import {
  InvalidCredentialsError,
  isUpdatingError,
  logIn,
  restrictionOfError,
  TooManyPasswordTriesError,
  type Credentials,
  type TwoFactorStep,
} from "@/lib/api";

export type LoginState = {
  isSubmitting: boolean;
  error: string | null;
  submit: (credentials: Credentials) => Promise<void>;
};

export type LogInFn = (credentials: Credentials) => Promise<unknown>;

/**
 * Log in (as Staff unless another `logInFn` is given), then load `homePath` afresh;
 * keep a user-facing error when it fails. When the login answers that two-step login comes
 * next (issue 61), `onTwoFactor` is told instead.
 */
export function useLogin(
  logInFn: LogInFn = logIn,
  homePath: string = ROUTES.home,
  onTwoFactor?: (step: TwoFactorStep) => void,
): LoginState {
  const navigate = useFullPageNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(credentials: Credentials): Promise<void> {
    setIsSubmitting(true);
    setError(null);
    try {
      const outcome = await logInFn(credentials);
      const step = twoFactorStepOf(outcome);
      if (step !== null && onTwoFactor !== undefined) {
        setIsSubmitting(false);
        onTwoFactor(step);
        return;
      }
      navigate(homePath);
    } catch (caught) {
      setError(loginErrorMessage(caught));
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, error, submit };
}

/** The login's own refusals: wrong credentials, or wrong passwords used up (security 01). */
const REFUSAL_MESSAGES: readonly (readonly [new () => Error, string])[] = [
  [InvalidCredentialsError, MESSAGES.invalidCredentials],
  [TooManyPasswordTriesError, MESSAGES.tooManyWrongPasswords],
];

/**
 * Wrong credentials, the office's Status in the server's words (issue 42), the app being updated
 * (ticket 14), or a general failure.
 */
function loginErrorMessage(error: unknown): string {
  const refused = REFUSAL_MESSAGES.find(([kind]) => error instanceof kind);
  if (refused !== undefined) return refused[1];
  if (isUpdatingError(error)) return SESSION_TEXT.updating;
  return restrictionOfError(error)?.message ?? MESSAGES.loginFailed;
}

const TwoFactorOutcomeSchema = z.object({
  kind: z.literal("twoFactor"),
  step: z.enum(["setup", "verify"]),
});

/** The two-step login step a login's outcome asks for, or null when it logged in. */
function twoFactorStepOf(outcome: unknown): TwoFactorStep | null {
  const parsed = TwoFactorOutcomeSchema.safeParse(outcome);
  return parsed.success ? parsed.data.step : null;
}
