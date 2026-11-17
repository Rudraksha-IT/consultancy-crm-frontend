import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";
import {
  StartAgainError,
  TooManyTriesError,
  WrongCurrentPasswordError,
  WrongNumberError,
} from "@/lib/api";

const NUMBER = /^[0-9]{6}$/;
const RECOVERY_CODE = /^[a-z0-9]{4}-?[a-z0-9]{4}-?[a-z0-9]{4}$/;

/** The number as typed, without the spaces people put in the middle; null when not 6 digits. */
export function cleanNumber(typed: string): string | null {
  const number = typed.replaceAll(/\s/g, "");
  return NUMBER.test(number) ? number : null;
}

/** A recovery code as typed, lower case and trimmed; null when it can't be one. */
export function cleanRecoveryCode(typed: string): string | null {
  const code = typed.trim().toLowerCase().replaceAll(/\s+/g, "-");
  return RECOVERY_CODE.test(code) ? code : null;
}

/** What went wrong, in words, and which field it belongs to (null: the whole form). */
export type Refusal = { field: "number" | "password" | null; message: string };

/** Explain a refused second step. A StartAgainError is handled by the caller. */
export function refusalOf(error: unknown, isRecoveryCode: boolean): Refusal {
  if (error instanceof WrongNumberError) {
    return {
      field: "number",
      message: isRecoveryCode ? TEXT.wrongRecoveryCode : TEXT.wrongNumber,
    };
  }
  if (error instanceof WrongCurrentPasswordError) {
    return { field: "password", message: TEXT.wrongPassword };
  }
  if (error instanceof TooManyTriesError) return { field: null, message: TEXT.tooManyTries };
  return { field: null, message: TEXT.failed };
}

export function isStartAgain(error: unknown): boolean {
  return error instanceof StartAgainError;
}

export type SecondStepReading =
  { answer: { code: string } | { recoveryCode: string } } | { problem: string };

/** The number (or recovery code) a form holds, or what to fix first. */
export function readSecondStep(form: FormData, isRecoveryCode: boolean): SecondStepReading {
  return isRecoveryCode ? readRecoveryCode(form) : readNumberAnswer(form);
}

function readRecoveryCode(form: FormData): SecondStepReading {
  const code = cleanRecoveryCode(textOf(form, "recoveryCode"));
  return code === null ? { problem: TEXT.enterRecoveryCode } : { answer: { recoveryCode: code } };
}

function readNumberAnswer(form: FormData): SecondStepReading {
  const number = cleanNumber(textOf(form, "code"));
  return number === null ? { problem: TEXT.enterNumber } : { answer: { code: number } };
}

function textOf(form: FormData, name: string): string {
  const typed = form.get(name);
  return typeof typed === "string" ? typed : "";
}

/** The change with the number added, when there is one. */
export function withNumber<T extends object>(
  change: T,
  code: string | null | undefined,
): T & { code?: string } {
  return code === null || code === undefined ? change : { ...change, code };
}

/** The number a form's `code` field holds, or null when it isn't 6 digits. */
export function readNumber(form: FormData): string | null {
  return cleanNumber(textOf(form, "code"));
}
