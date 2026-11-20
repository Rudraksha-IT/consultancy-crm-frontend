"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { LABELS, MESSAGES } from "@/constants/messages";
import { SESSION_TEXT } from "@/constants/session";
import { ROUTES } from "@/constants/routes";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { HTTP_STATUS } from "@/constants/api";
import { ApiRequestError, nextLoginStep, type TwoFactorSide, type TwoFactorStep } from "@/lib/api";

import { EmailShownAbove } from "./EmailShownAbove";
import { useLogin, type LogInFn } from "./useLogin";

type LoginFormProps = {
  /** Logs in with the entered credentials; Staff login on this subdomain by default. */
  logIn?: LogInFn;
  /** Where to go once logged in; the Staff home screen by default. */
  homePath?: string;
  /** Where "Forgot your password?" leads; null shows no such link. */
  forgotPasswordPath?: string | null;
  /** The email field's starting value, e.g. from a Central login link (issue 44). */
  initialEmail?: string;
  /** Good news shown above the fields, e.g. that the password was just changed (issue 63). */
  notice?: string | null;
  /** The person's login ended (ticket 14): an info banner says they were logged out. */
  hasLoginEnded?: boolean;
  /** Two-step login is on (issue 61): show its step instead of opening `homePath`. */
  onTwoFactor?: (step: TwoFactorStep) => void;
  /** A Staff member on their office (default), or a Platform Admin on the Platform (66). */
  side?: TwoFactorSide;
};

const JOIN_PATHS: Record<TwoFactorSide, string> = {
  staff: ROUTES.join,
  platform: ROUTES.platformJoin,
};

/**
 * Email-first login (issue 66): the email, then (with it shown above) only the password. Someone
 * invited and not joined yet goes to the Join page instead, their email filled in.
 */
export function LoginForm({
  logIn,
  homePath,
  forgotPasswordPath = ROUTES.forgotPassword,
  initialEmail = "",
  notice,
  hasLoginEnded,
  onTwoFactor,
  side = "staff",
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isPasswordStep, setIsPasswordStep] = useState(false);

  return (
    <div className="grid gap-5.5">
      <LoginEndedNotice isShown={hasLoginEnded} />
      <LoginNotice text={notice} />
      {isPasswordStep ? (
        <PasswordStep
          email={email}
          logIn={logIn}
          homePath={homePath}
          onTwoFactor={onTwoFactor}
          forgotPasswordPath={forgotPasswordPath}
          onChangeEmail={() => {
            setIsPasswordStep(false);
          }}
        />
      ) : (
        <EmailStep
          email={email}
          side={side}
          onChange={setEmail}
          onPassword={() => {
            setIsPasswordStep(true);
          }}
        />
      )}
    </div>
  );
}

type EmailStepProps = {
  email: string;
  side: TwoFactorSide;
  onChange: (email: string) => void;
  onPassword: () => void;
};

/** Step 1: the email alone; the server says what comes next without saying who has an account. */
function EmailStep({ email, side, onChange, onPassword }: EmailStepProps) {
  const navigate = useFullPageNavigation();
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const typed = email.trim();
    if (typed === "") {
      setError(MESSAGES.enterEmail);
      return;
    }
    setError(null);
    setIsChecking(true);
    onChange(typed);
    const next = await nextLoginStep(side, typed).catch(stepAfterFailure);
    if (next === "invalid") {
      setIsChecking(false);
      setError(MESSAGES.enterValidEmail);
      return;
    }
    if (next === "join") {
      navigate(
        `${JOIN_PATHS[side]}?${new URLSearchParams({ email: typed, sent: "1" }).toString()}`,
      );
      return;
    }
    setIsChecking(false);
    onPassword();
  }

  return (
    <form
      aria-label={LABELS.logIn}
      noValidate
      className="grid gap-5.5"
      onSubmit={(e) => void submit(e)}
    >
      <TextField
        label={LABELS.email}
        name="email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={onChange}
      />
      {error !== null && (
        <p role="alert" className="text-bad font-semibold">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isChecking}
        loadingLabel={LABELS.checking}
      >
        {LABELS.continueLabel}
      </Button>
    </form>
  );
}

type PasswordStepProps = {
  email: string;
  logIn: LogInFn | undefined;
  homePath: string | undefined;
  onTwoFactor: ((step: TwoFactorStep) => void) | undefined;
  forgotPasswordPath: string | null;
  onChangeEmail: () => void;
};

/** Step 2: the email shown above as text, and only the password box. */
function PasswordStep({
  email,
  logIn,
  homePath,
  onTwoFactor,
  forgotPasswordPath,
  onChangeEmail,
}: PasswordStepProps) {
  const { isSubmitting, error, submit } = useLogin(logIn, homePath, onTwoFactor);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("password");
    void submit({ email, password: typeof value === "string" ? value : "" });
  }

  return (
    <form aria-label={LABELS.logIn} className="grid gap-5.5" onSubmit={handleSubmit}>
      <EmailShownAbove
        label={LABELS.loggingInAs}
        email={email}
        action={
          <Button variant="ghost" size="sm" onClick={onChangeEmail}>
            {LABELS.changeEmail}
          </Button>
        }
      />
      {/* Lets password managers save the password under the right account. */}
      <input type="hidden" name="username" autoComplete="username" value={email} />
      <TextField
        label={LABELS.password}
        name="password"
        type="password"
        autoComplete="current-password"
      />
      {error !== null && (
        <p role="alert" className="text-bad font-semibold">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isSubmitting}
        loadingLabel={LABELS.loggingIn}
      >
        {LABELS.logIn}
      </Button>
      {forgotPasswordPath !== null && (
        <Link
          href={`${forgotPasswordPath}?${new URLSearchParams({ email }).toString()}`}
          className="text-accent min-h-control grid place-items-center"
        >
          {LABELS.forgotPassword}
        </Link>
      )}
    </form>
  );
}

/**
 * When the email step can't answer: a refused email is said so; anything else (the server
 * unreachable) still offers the password, so logging in is never blocked by this step.
 */
function stepAfterFailure(error: unknown): "invalid" | "password" {
  return error instanceof ApiRequestError && error.status === HTTP_STATUS.badRequest
    ? "invalid"
    : "password";
}

/** "You've been logged out" (ticket 14), as an info banner; nothing unless the login ended. */
function LoginEndedNotice({ isShown }: { isShown: boolean | undefined }) {
  if (isShown !== true) return null;
  return (
    <Banner tone="info" icon="info">
      {SESSION_TEXT.loggedOut}
    </Banner>
  );
}

/** Good news above the fields (a status, so screen readers announce it); nothing without it. */
function LoginNotice({ text }: { text: string | null | undefined }) {
  if (text === null || text === undefined) return null;
  return (
    <p role="status" className="text-good font-semibold">
      {text}
    </p>
  );
}
