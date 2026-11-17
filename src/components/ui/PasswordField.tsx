"use client";

import { useState } from "react";

import { LABELS, MESSAGES } from "@/constants/messages";
import { PASSWORD_RULES_HINT } from "@/lib/password";

import { PasswordRules } from "./PasswordRules";
import { TextField } from "./TextField";

type PasswordFieldProps = {
  label?: string;
  name?: string;
  confirmationName?: string;
};

/**
 * A new password and its confirmation. The rules show as one line, then become a checklist that
 * ticks off while typing; the confirmation says when both match (spec 18c).
 */
export function PasswordField({
  label = LABELS.newPassword,
  name = "password",
  confirmationName = "passwordConfirmation",
}: PasswordFieldProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <TextField
          label={label}
          name={name}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <div aria-live="polite">
          {password === "" ? (
            <p className="text-small text-ink-3">{PASSWORD_RULES_HINT}</p>
          ) : (
            <PasswordRules password={password} />
          )}
        </div>
      </div>
      <TextField
        label={LABELS.confirm(label)}
        name={confirmationName}
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={setConfirmation}
        {...matchHint(password, confirmation)}
      />
    </div>
  );
}

/** Nothing until the confirmation is typed; then whether both match, ticked when they do. */
function matchHint(
  password: string,
  confirmation: string,
): { hint?: string; isHintGood?: boolean } {
  if (confirmation === "") return {};
  const isMatch = password === confirmation;
  return {
    hint: isMatch ? MESSAGES.passwordsMatch : MESSAGES.passwordsDontMatch,
    isHintGood: isMatch,
  };
}
