"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { CodeField } from "@/components/ui/CodeField";
import { Panel } from "@/components/ui/Panel";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { MESSAGES } from "@/constants/messages";
import { PLATFORM_ACCOUNT_TEXT as TEXT } from "@/constants/platformAccount";
import { TWO_FACTOR_TEXT } from "@/constants/twoFactor";
import {
  changePlatformPassword,
  InvalidFieldsError,
  PasswordRulesNotMetError,
  TooManyPasswordTriesError,
  WrongCurrentPasswordError,
  WrongNumberError,
} from "@/lib/api";
import { describeMissingRules, unmetRules } from "@/lib/password";

import { readNumber, withNumber } from "@/components/features/twoFactor/secondStep";

const CURRENT = "currentPassword";
const NEW = "password";
const CONFIRMATION = "passwordConfirmation";

/**
 * Change my password on the Platform (issue 59): the current one, then the new one and its
 * confirmation, with the rules ticking off as I type. My other sessions are signed out.
 */
export function AccountPasswordForm({ needsNumber = false }: { needsNumber?: boolean }) {
  const { showToast } = useToast();
  // A new key empties the form (the password fields keep their own state) after a change.
  const [formKey, setFormKey] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function change(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const reading = readPasswordForm(new FormData(event.currentTarget), needsNumber);
    setProblem("problem" in reading ? reading.problem : null);
    if ("problem" in reading) return;
    setIsSaving(true);
    try {
      await changePlatformPassword(reading.change);
      showToast(TEXT.passwordChanged);
      setFormKey((key) => key + 1);
    } catch (error) {
      setProblem(explain(error));
    }
    setIsSaving(false);
  }

  return (
    <Panel isPadded>
      <form
        key={formKey}
        noValidate
        onSubmit={(event) => void change(event)}
        className="grid gap-5"
      >
        <TextField
          label={TEXT.currentPassword}
          name={CURRENT}
          type="password"
          autoComplete="current-password"
        />
        <PasswordField name={NEW} confirmationName={CONFIRMATION} />
        {needsNumber && (
          <CodeField
            label={TWO_FACTOR_TEXT.numberForChanges}
            hint={TWO_FACTOR_TEXT.numberForChangesHint}
            name="code"
          />
        )}
        {problem !== null && <Banner tone="problem">{problem}</Banner>}
        <div>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {TEXT.changePassword}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function read(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

type PasswordReading =
  { change: { currentPassword: string; newPassword: string; code?: string } } | { problem: string };

/** The change the form holds, or the first thing to fix before asking the server. */
function readPasswordForm(form: FormData, needsNumber: boolean): PasswordReading {
  const current = read(form, CURRENT);
  const next = read(form, NEW);
  const issue = problemWith(current, next, read(form, CONFIRMATION));
  if (issue !== null) return { problem: issue };
  const code = needsNumber ? readNumber(form) : undefined;
  if (code === null) return { problem: TWO_FACTOR_TEXT.enterNumber };
  return { change: withNumber({ currentPassword: current, newPassword: next }, code) };
}

function problemWith(current: string, next: string, confirmation: string): string | null {
  if (current === "") return TEXT.enterCurrentPassword;
  const unmet = unmetRules(next);
  if (unmet.length > 0) return MESSAGES.passwordStillNeeds(describeMissingRules(unmet));
  return next === confirmation ? null : MESSAGES.passwordsDiffer;
}

// Refusals explained in the same words wherever they come from.
const PLAIN_REFUSALS: readonly (readonly [new (...args: never[]) => Error, string])[] = [
  [WrongCurrentPasswordError, TEXT.wrongCurrentPassword],
  [TooManyPasswordTriesError, TEXT.tooManyTries],
  [WrongNumberError, TWO_FACTOR_TEXT.wrongNumber],
];

function explain(error: unknown): string {
  const plain = PLAIN_REFUSALS.find(([kind]) => error instanceof kind);
  if (plain !== undefined) return plain[1];
  if (error instanceof PasswordRulesNotMetError) {
    return MESSAGES.passwordStillNeeds(describeMissingRules(error.unmet));
  }
  return refusedNewPassword(error) ?? TEXT.saveFailed;
}

/** The server's reason for refusing the new password itself, e.g. it is the current one. */
function refusedNewPassword(error: unknown): string | null {
  if (!(error instanceof InvalidFieldsError)) return null;
  return error.fieldErrors.newPassword?.[0] ?? null;
}
