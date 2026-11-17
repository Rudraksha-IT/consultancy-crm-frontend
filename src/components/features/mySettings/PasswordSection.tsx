"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { MESSAGES } from "@/constants/messages";
import { MY_SETTINGS_TEXT as TEXT } from "@/constants/mySettings";
import { changeMyPassword, PasswordRulesNotMetError, WrongCurrentPasswordError } from "@/lib/api";
import { describeMissingRules, unmetRules } from "@/lib/password";

const CURRENT = "currentPassword";
const NEW = "password";
const CONFIRMATION = "passwordConfirmation";

/**
 * Change my password (spec 22e, 18c): the current one, then the new one and its confirmation with
 * the same live checklist as joining. Every other device is signed out at once.
 */
export function PasswordSection() {
  const { showToast } = useToast();
  // A new key empties the form (the password fields keep their own state) after a change.
  const [formKey, setFormKey] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function change(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const current = read(form, CURRENT);
    const next = read(form, NEW);
    const issue = problemWith(current, next, read(form, CONFIRMATION));
    setProblem(issue);
    if (issue !== null) return;
    setIsSaving(true);
    try {
      await changeMyPassword({ currentPassword: current, newPassword: next });
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
        {problem !== null && <Banner tone="problem">{problem}</Banner>}
        <div>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {TEXT.changePassword}
          </Button>
        </div>
        <p className="text-small text-ink-2">{TEXT.forgotIt}</p>
      </form>
    </Panel>
  );
}

function read(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function problemWith(current: string, next: string, confirmation: string): string | null {
  if (current === "") return TEXT.enterCurrentPassword;
  const unmet = unmetRules(next);
  if (unmet.length > 0) return MESSAGES.passwordStillNeeds(describeMissingRules(unmet));
  return next === confirmation ? null : MESSAGES.passwordsDiffer;
}

function explain(error: unknown): string {
  if (error instanceof WrongCurrentPasswordError) return TEXT.wrongCurrentPassword;
  if (error instanceof PasswordRulesNotMetError) {
    return MESSAGES.passwordStillNeeds(describeMissingRules(error.unmet));
  }
  return TEXT.saveFailed;
}
