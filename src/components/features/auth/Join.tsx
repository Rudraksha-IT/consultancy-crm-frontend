"use client";

import Link from "next/link";
import { useRef, type ReactNode, type SubmitEvent } from "react";

import { useCurrentConsultancy } from "@/components/features/consultancy/useCurrentConsultancy";
import { Button } from "@/components/ui/Button";
import { CodeField } from "@/components/ui/CodeField";
import { PasswordField } from "@/components/ui/PasswordField";
import { TextField } from "@/components/ui/TextField";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import type { TwoFactorSide } from "@/lib/api";

import { AuthLayout } from "./AuthLayout";
import { AuthMessages } from "./AuthMessages";
import { AuthSteps } from "./AuthSteps";
import { EmailShownAbove } from "./EmailShownAbove";
import { SecondStepScreen } from "./SecondStepScreen";
import { useJoin, type JoinState } from "./useJoin";

type JoinProps = {
  /** The office's (or the Platform's) brand, large and centred above the steps. */
  brand?: ReactNode;
  /** A Staff member joining their office (default), or a Platform Admin the Platform (65). */
  side?: TwoFactorSide;
  /** The email typed on the login (issue 66): shown above, so only the code is asked for. */
  knownEmail?: string;
  /** The login just emailed a new code (issue 66). */
  codeSent?: boolean;
};

/** Someone invited joins: work email and Code, then their own password (spec 18b, 18c). */
export function Join({ brand, side = "staff", knownEmail = "", codeSent = false }: JoinProps) {
  const known = { knownEmail, codeSent };
  return side === "platform" ? (
    <JoinSteps
      brand={brand}
      side={side}
      title={platformTitle}
      loginPath={ROUTES.platformLogin}
      {...known}
    />
  ) : (
    <JoinSteps
      brand={brand}
      side={side}
      title={useStaffJoinTitle}
      loginPath={ROUTES.login}
      {...known}
    />
  );
}

type JoinStepsProps = {
  brand: ReactNode;
  side: TwoFactorSide;
  /** The screen's title for a step (a hook for Staff: it names the office). */
  title: (step: JoinState["step"]) => string;
  loginPath: string;
  knownEmail: string;
  codeSent: boolean;
};

function JoinSteps(props: JoinStepsProps) {
  const { brand, side, title: titleFor, loginPath, knownEmail, codeSent } = props;
  const join = useJoin(side, knownEmail, codeSent);
  const title = titleFor(join.step);
  if (join.twoFactorStep !== null) {
    return <SecondStepScreen brand={brand} step={join.twoFactorStep} />;
  }
  return (
    <AuthLayout
      brand={brand}
      title={title}
      intro={join.step === 0 ? MESSAGES.joinIntro : MESSAGES.choosePasswordIntro(join.email)}
      steps={<AuthSteps steps={LABELS.joinSteps} current={join.step} />}
    >
      {join.step === 0 ? (
        <CodeStep join={join} knownEmail={knownEmail} loginPath={loginPath} />
      ) : (
        <PasswordStep join={join} />
      )}
      <AuthMessages error={join.error} notice={join.notice} />
      <Link href={loginPath} className="text-accent min-h-control grid place-items-center">
        {LABELS.backToLogIn}
      </Link>
    </AuthLayout>
  );
}

/** "Join <product>" on the Platform's first step. */
function platformTitle(step: JoinState["step"]): string {
  return step === 1 ? LABELS.chooseYourPassword : LABELS.joinOffice(LABELS.productName);
}

/** "Join <office>" on the first step, once the office is known. */
function useStaffJoinTitle(step: JoinState["step"]): string {
  const consultancy = useCurrentConsultancy();
  if (step === 1) return LABELS.chooseYourPassword;
  return consultancy.status === "loaded"
    ? LABELS.joinOffice(consultancy.consultancy.name)
    : LABELS.join;
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

type CodeStepProps = { join: JoinState; knownEmail: string; loginPath: string };

function CodeStep({ join, knownEmail, loginPath }: CodeStepProps) {
  const formRef = useRef<HTMLFormElement>(null);
  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void join.checkCode(readField(form, "email"), readField(form, "code"));
  }
  function sendNewCode(): void {
    const form = formRef.current === null ? null : new FormData(formRef.current);
    void join.sendNewCode(form === null ? "" : readField(form, "email"));
  }
  return (
    <form ref={formRef} className="grid gap-5.5" noValidate onSubmit={submit}>
      <JoinEmail join={join} knownEmail={knownEmail} loginPath={loginPath} />
      <CodeField label={LABELS.code} name="code" hint={MESSAGES.joinCodeHint} />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={join.isSubmitting}
        loadingLabel={LABELS.checking}
      >
        {LABELS.checkTheCode}
      </Button>
      <Button variant="ghost" isDisabled={join.isSubmitting} onClick={sendNewCode}>
        {LABELS.sendNewCode}
      </Button>
    </form>
  );
}

/** The email: shown above when the login gave it (issue 66), otherwise a field to type it in. */
function JoinEmail({ join, knownEmail, loginPath }: CodeStepProps) {
  if (knownEmail === "") {
    return (
      <TextField
        label={LABELS.email}
        name="email"
        type="email"
        autoComplete="username"
        defaultValue={join.email}
      />
    );
  }
  return (
    <>
      <input type="hidden" name="email" value={knownEmail} />
      <EmailShownAbove
        label={LABELS.joiningAs}
        email={knownEmail}
        action={
          <Link href={loginPath} className="text-accent min-h-control inline-flex items-center">
            {LABELS.useDifferentEmail}
          </Link>
        }
      />
    </>
  );
}

function PasswordStep({ join }: { join: JoinState }) {
  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void join.choosePassword(readField(form, "password"), readField(form, "passwordConfirmation"));
  }
  return (
    <form className="grid gap-5.5" noValidate onSubmit={submit}>
      {/* Lets password managers save the new password under the right account. */}
      <input type="hidden" name="username" autoComplete="username" value={join.email} />
      <PasswordField />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={join.isSubmitting}
        loadingLabel={LABELS.saving}
      >
        {LABELS.savePasswordAndLogIn}
      </Button>
    </form>
  );
}
