"use client";

import Link from "next/link";
import type { ReactNode, SubmitEvent } from "react";

import { Button } from "@/components/ui/Button";
import { CodeField } from "@/components/ui/CodeField";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";

import { AuthLayout } from "./AuthLayout";
import { AuthMessages } from "./AuthMessages";
import { AuthSteps } from "./AuthSteps";
import { EmailShownAbove } from "./EmailShownAbove";
import { SecondStepScreen } from "./SecondStepScreen";
import {
  usePasswordReset,
  type PasswordResetState,
  type ResetSide,
  type ResetStep,
} from "./usePasswordReset";

const TITLES: Record<ResetStep, string> = {
  0: LABELS.resetPassword,
  1: LABELS.checkYourEmail,
  2: LABELS.chooseYourPassword,
};

type ForgotPasswordProps = {
  /** The office's (or the Platform's) brand, large and centred above the steps. */
  brand?: ReactNode;
  /** A Staff member on their office (default), or a Platform Admin on the Platform (issue 63). */
  side?: ResetSide;
  /** The email from the login's password step (issue 66): shown as text, not asked again. */
  knownEmail?: string;
};

const LOGIN_PATHS: Record<ResetSide, string> = {
  staff: ROUTES.login,
  platform: ROUTES.platformLogin,
};

/** Reset a forgotten password: Your email -> Enter your code -> Choose a password (spec 16). */
export function ForgotPassword({ brand, side = "staff", knownEmail = "" }: ForgotPasswordProps) {
  const reset = usePasswordReset(side);
  if (reset.twoFactorStep !== null) {
    return <SecondStepScreen brand={brand} step={reset.twoFactorStep} />;
  }
  return (
    <AuthLayout
      brand={brand}
      title={TITLES[reset.step]}
      intro={<StepIntro step={reset.step} email={reset.email} />}
      steps={<AuthSteps steps={LABELS.resetSteps} current={reset.step} />}
    >
      <StepForm
        key={reset.step}
        reset={reset}
        knownEmail={knownEmail}
        loginPath={LOGIN_PATHS[side]}
      />
      <AuthMessages error={reset.error} notice={reset.notice} />
      <Link href={LOGIN_PATHS[side]} className="text-accent min-h-control grid place-items-center">
        {LABELS.backToLogIn}
      </Link>
    </AuthLayout>
  );
}

function StepIntro({ step, email }: { step: ResetStep; email: string }) {
  if (step === 0) return MESSAGES.resetIntro;
  if (step === 2) return MESSAGES.choosePasswordIntro(email);
  return (
    <>
      {MESSAGES.codeSentBefore}
      <b className="text-ink">{email}</b>
      {MESSAGES.codeSentAfter}
    </>
  );
}

type StepFormProps = { reset: PasswordResetState; knownEmail: string; loginPath: string };

function StepForm({ reset, knownEmail, loginPath }: StepFormProps) {
  if (reset.step === 0) {
    return <EmailStep reset={reset} knownEmail={knownEmail} loginPath={loginPath} />;
  }
  if (reset.step === 1) return <CodeStep reset={reset} />;
  return <PasswordStep reset={reset} />;
}

/** Read the form's fields and hand them on; the server checks everything again. */
function onSubmitFields(names: readonly string[], use: (values: string[]) => Promise<void>) {
  return (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void use(names.map((name) => readField(form, name)));
  };
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

type EmailStepProps = { reset: PasswordResetState; knownEmail: string; loginPath: string };

function EmailStep({ reset, knownEmail, loginPath }: EmailStepProps) {
  const submit = onSubmitFields(["email"], ([email = ""]) => reset.sendCode(email));
  return (
    <form className="grid gap-5.5" noValidate onSubmit={submit}>
      {knownEmail === "" ? (
        <TextField label={LABELS.email} name="email" type="email" autoComplete="username" />
      ) : (
        <>
          <input type="hidden" name="email" value={knownEmail} />
          <EmailShownAbove
            label={LABELS.resettingFor}
            email={knownEmail}
            action={
              <Link href={loginPath} className="text-accent min-h-control inline-flex items-center">
                {LABELS.useDifferentEmail}
              </Link>
            }
          />
        </>
      )}
      <SubmitButton reset={reset} label={LABELS.sendTheCode} busyLabel={LABELS.sending} />
    </form>
  );
}

function CodeStep({ reset }: { reset: PasswordResetState }) {
  const submit = onSubmitFields(["code"], ([code = ""]) => reset.checkCode(code));
  return (
    <form className="grid gap-5.5" noValidate onSubmit={submit}>
      <CodeField label={LABELS.code} name="code" />
      <SubmitButton reset={reset} label={LABELS.checkTheCode} busyLabel={LABELS.checking} />
      <Button
        variant="ghost"
        isDisabled={reset.isSubmitting}
        onClick={() => void reset.resendCode()}
      >
        {LABELS.sendNewCode}
      </Button>
    </form>
  );
}

function PasswordStep({ reset }: { reset: PasswordResetState }) {
  const submit = onSubmitFields(["password", "passwordConfirmation"], ([pw = "", again = ""]) =>
    reset.choosePassword(pw, again),
  );
  return (
    <form className="grid gap-5.5" noValidate onSubmit={submit}>
      {/* Lets password managers save the new password under the right account. */}
      <input type="hidden" name="username" autoComplete="username" value={reset.email} />
      <PasswordField />
      <SubmitButton reset={reset} label={LABELS.savePasswordAndLogIn} busyLabel={LABELS.saving} />
    </form>
  );
}

type SubmitButtonProps = { reset: PasswordResetState; label: string; busyLabel: string };

function SubmitButton({ reset, label, busyLabel }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      isLoading={reset.isSubmitting}
      loadingLabel={busyLabel}
    >
      {label}
    </Button>
  );
}
