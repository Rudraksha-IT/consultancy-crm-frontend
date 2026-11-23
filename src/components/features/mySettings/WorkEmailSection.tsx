"use client";

import { useEffect, useRef, useState, type RefObject, type SubmitEvent } from "react";

import { readSecondStep } from "@/components/features/twoFactor/secondStep";
import { SecondStepField } from "@/components/features/twoFactor/SecondStepField";
import { useMyTwoFactor } from "@/components/features/twoFactor/useMyTwoFactor";
import { errorsOf } from "@/components/features/twoFactor/useRefusal";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { CodeField } from "@/components/ui/CodeField";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { LABELS } from "@/constants/messages";
import { MY_SETTINGS_TEXT as TEXT } from "@/constants/mySettings";
import {
  askForEmailChange,
  confirmEmailChange,
  WorkEmailRefusedError,
  type EmailChangeRequest,
  type WorkEmailField,
} from "@/lib/api";

// The longest address email allows; the server checks it properly.
const EMAIL_MAX_LENGTH = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_SHAPE = /^[0-9]{6}$/;

type Step =
  | { kind: "closed" }
  | { kind: "details"; email: string; again: boolean }
  | { kind: "code"; email: string };

type Errors = Partial<Record<WorkEmailField, string>> & { form?: string };

type WorkEmailSectionProps = {
  email: string;
  onChanged: (email: string) => void;
};

/**
 * My email (first live fixes, ticket 04): shown with Change, which opens two short steps:
 * the new email and my password (and the number from my app when two-step login is on), then
 * the Code sent to the new email. Focus moves into each step and back to Change after.
 */
export function WorkEmailSection({ email, onChanged }: WorkEmailSectionProps) {
  const [step, setStep] = useState<Step>({ kind: "closed" });
  const area = useRef<HTMLDivElement>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  useFocusOnStep(step, area, changeButton);

  function close(): void {
    setStep({ kind: "closed" });
  }

  return (
    <Panel isPadded>
      <div ref={area} className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 font-semibold wrap-anywhere">{email}</p>
          {step.kind === "closed" && (
            <Button
              ref={changeButton}
              onClick={() => {
                setStep(details(""));
              }}
            >
              {TEXT.change}
            </Button>
          )}
        </div>
        {step.kind === "details" && (
          <DetailsStep
            current={email}
            step={step}
            onSent={(sentTo) => {
              setStep({ kind: "code", email: sentTo });
            }}
            onCancel={close}
          />
        )}
        {step.kind === "code" && (
          <CodeStep
            email={step.email}
            onChanged={(changed) => {
              onChanged(changed);
              close();
            }}
            onNewCode={() => {
              setStep({ kind: "details", email: step.email, again: true });
            }}
            onCancel={close}
          />
        )}
      </div>
    </Panel>
  );
}

function details(email: string): Step {
  return { kind: "details", email, again: false };
}

// The field each step starts on; asking again for a new code starts on the password.
const FIRST_FIELD = { details: "email", again: "password", code: "emailCode" } as const;

/** After a step opens or closes (never on first drawing), focus its first control (rule 8). */
function useFocusOnStep(
  step: Step,
  area: RefObject<HTMLDivElement | null>,
  changeButton: RefObject<HTMLButtonElement | null>,
): void {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    firstControlOf(step, area.current, changeButton.current)?.focus();
  }, [step, area, changeButton]);
}

function firstControlOf(
  step: Step,
  area: HTMLElement | null,
  changeButton: HTMLButtonElement | null,
): HTMLElement | null {
  if (step.kind === "closed") return changeButton;
  return area?.querySelector<HTMLElement>(`input[name="${FIRST_FIELD[openedAs(step)]}"]`) ?? null;
}

function openedAs(step: Exclude<Step, { kind: "closed" }>): keyof typeof FIRST_FIELD {
  return step.kind === "details" && step.again ? "again" : step.kind;
}

/** After a refused submit, focus the first field in error, else the submit button. */
function useFocusAfterRefusal(attempt: number, form: RefObject<HTMLFormElement | null>): void {
  useEffect(() => {
    if (attempt > 0) focusFirstProblem(form.current);
  }, [attempt, form]);
}

function focusFirstProblem(form: HTMLFormElement | null): void {
  if (form === null) return;
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  (invalid ?? form.querySelector<HTMLElement>('button[type="submit"]'))?.focus();
}

type DetailsStepProps = {
  current: string;
  step: Extract<Step, { kind: "details" }>;
  onSent: (email: string) => void;
  onCancel: () => void;
};

function DetailsStep({ current, step, onSent, onCancel }: DetailsStepProps) {
  const { needsNumber, numberAsked } = useNeedsNumber();
  const [email, setEmail] = useState(step.email);
  const [isRecoveryCode, setIsRecoveryCode] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useFocusAfterRefusal(attempt, form);

  function refuse(found: Errors): void {
    setErrors(found);
    setAttempt((count) => count + 1);
  }

  async function send(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const reading = readRequest(new FormData(event.currentTarget), {
      current,
      needsNumber,
      isRecoveryCode,
    });
    if ("errors" in reading) {
      refuse(reading.errors);
      return;
    }
    setIsSending(true);
    try {
      await askForEmailChange(reading.request);
      onSent(reading.request.email);
    } catch (error) {
      const found = refusalOf(error);
      if (found.number !== undefined) numberAsked();
      refuse(found);
      setIsSending(false);
    }
  }

  return (
    <form ref={form} noValidate className="grid gap-5" onSubmit={(event) => void send(event)}>
      <p className="text-ink-2">{introOf(step)}</p>
      <TextField
        label={TEXT.newWorkEmail}
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        errors={errorsOf(errors.email)}
      />
      <TextField
        label={TEXT.currentPassword}
        name="password"
        type="password"
        autoComplete="current-password"
        errors={errorsOf(errors.password)}
      />
      {needsNumber ? (
        <SecondStepField
          isRecoveryCode={isRecoveryCode}
          onSwitch={() => {
            setIsRecoveryCode(!isRecoveryCode);
            setErrors({});
          }}
          errors={errorsOf(errors.number)}
        />
      ) : null}
      <FormProblem message={errors.form} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button onClick={onCancel}>{LABELS.cancel}</Button>
        <Button type="submit" variant="primary" isLoading={isSending}>
          {TEXT.sendTheCode}
        </Button>
      </div>
    </form>
  );
}

type Reading = { request: EmailChangeRequest } | { errors: Errors };
type ReadingRules = { current: string; needsNumber: boolean; isRecoveryCode: boolean };

/** What the first step's form holds, or what to fix first (nothing is sent until it's right). */
function readRequest(form: FormData, rules: ReadingRules): Reading {
  const email = textOf(form, "email").trim();
  const password = textOf(form, "password");
  const number = readNumberPart(form, rules);
  const errors: Errors = {
    ...emailProblem(email, rules.current),
    ...(password === "" ? { password: TEXT.enterCurrentPassword } : {}),
    ...number.errors,
  };
  if (Object.keys(errors).length > 0) return { errors };
  return { request: { email, password, ...number.answer } };
}

type NumberPart = { answer: Partial<Record<"code" | "recoveryCode", string>>; errors: Errors };

/** The number (or recovery code) when two-step login asks for one. */
function readNumberPart(form: FormData, rules: ReadingRules): NumberPart {
  if (!rules.needsNumber) return { answer: {}, errors: {} };
  const reading = readSecondStep(form, rules.isRecoveryCode);
  return "answer" in reading
    ? { answer: reading.answer, errors: {} }
    : { answer: {}, errors: { number: reading.problem } };
}

function emailProblem(email: string, current: string): Errors {
  if (email === "") return { email: TEXT.enterNewEmail };
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_SHAPE.test(email)) {
    return { email: TEXT.wholeEmail };
  }
  return email.toLowerCase() === current.toLowerCase() ? { email: TEXT.sameEmail } : {};
}

function introOf(step: Extract<Step, { kind: "details" }>): string {
  return step.again ? TEXT.enterPasswordAgain : TEXT.workEmailIntro;
}

/** The number field shows when my two-step login is set up, or once the server asks for it. */
function useNeedsNumber(): { needsNumber: boolean; numberAsked: () => void } {
  const { twoFactor } = useMyTwoFactor("staff");
  const [isAsked, setIsAsked] = useState(false);
  const isSetUp = twoFactor.kind === "loaded" && twoFactor.state.setUp;
  return {
    needsNumber: isAsked || isSetUp,
    numberAsked: () => {
      setIsAsked(true);
    },
  };
}

function FormProblem({ message }: { message: string | undefined }) {
  return message === undefined ? null : <Banner tone="problem">{message}</Banner>;
}

function textOf(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** The server's refusal, on the field it belongs to; anything else as a short problem. */
function refusalOf(error: unknown): Errors {
  if (!(error instanceof WorkEmailRefusedError)) return { form: TEXT.saveFailed };
  return {
    ...error.fieldErrors,
    ...(error.problem === null ? {} : { form: error.problem }),
  };
}

type CodeStepProps = {
  email: string;
  onChanged: (email: string) => void;
  onNewCode: () => void;
  onCancel: () => void;
};

function CodeStep({ email, onChanged, onNewCode, onCancel }: CodeStepProps) {
  const { showToast } = useToast();
  const [errors, setErrors] = useState<Errors>({});
  const [attempt, setAttempt] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useFocusAfterRefusal(attempt, form);

  async function change(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const code = textOf(new FormData(event.currentTarget), "emailCode");
    if (!CODE_SHAPE.test(code)) {
      setErrors({ code: TEXT.enterCode });
      setAttempt((count) => count + 1);
      return;
    }
    setIsChanging(true);
    try {
      const changed = await confirmEmailChange(email, code);
      showToast(TEXT.emailChanged);
      onChanged(changed);
    } catch (error) {
      setErrors(refusalOf(error));
      setAttempt((count) => count + 1);
      setIsChanging(false);
    }
  }

  return (
    <form ref={form} noValidate className="grid gap-5" onSubmit={(event) => void change(event)}>
      <p className="text-ink-2 wrap-anywhere">{TEXT.codeSentTo(email)}</p>
      <CodeField label={LABELS.code} name="emailCode" errors={errorsOf(errors.code)} />
      <FormProblem message={errors.form} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" isDisabled={isChanging} onClick={onNewCode}>
          {TEXT.sendNewCode}
        </Button>
        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel}>{LABELS.cancel}</Button>
          <Button type="submit" variant="primary" isLoading={isChanging}>
            {TEXT.changeEmail}
          </Button>
        </div>
      </div>
    </form>
  );
}
