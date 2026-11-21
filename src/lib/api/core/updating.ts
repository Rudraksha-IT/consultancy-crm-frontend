import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";
import { SESSION_TEXT } from "@/constants/session";

import { ApiRequestError } from "./errors";

/**
 * While a new version is switched in, the Next.js server answers 503 with `code: "updating"`
 * (ticket 14). The app then says "The app is being updated" where it would show a generic error,
 * until the server answers anything else.
 */
const UpdatingAnswerSchema = z.object({ detail: z.string(), code: z.literal("updating") });

type UpdatingListener = () => void;

const listeners = new Set<UpdatingListener>();
let isUpdating = false;

/** Whether a failed answer says the app is being updated. */
export function isUpdatingAnswer(status: number | null, body: unknown): boolean {
  return status === HTTP_STATUS.serviceUnavailable && UpdatingAnswerSchema.safeParse(body).success;
}

/** Whether a failed call failed because the app is being updated. */
export function isUpdatingError(error: unknown): boolean {
  return error instanceof ApiRequestError && isUpdatingAnswer(error.status, error.body);
}

/**
 * What a failure message should say: "The app is being updated…" when that is why the call
 * failed, else the screen's own words. For toasts and dialogs, which Banner's swap doesn't reach.
 */
export function updatingOr(error: unknown, otherwise: string): string {
  return isUpdatingError(error) ? SESSION_TEXT.updating : otherwise;
}

/** The server answered: tell listeners whether the app is being updated, when that changes. */
export function reportServerAnswer(isUpdatingNow: boolean): void {
  if (isUpdating === isUpdatingNow) return;
  isUpdating = isUpdatingNow;
  for (const listener of listeners) listener();
}

/** Whether the latest answer said the app is being updated. */
export function isAppUpdating(): boolean {
  return isUpdating;
}

/** Listen for the app starting or stopping being updated; returns the function that stops. */
export function onUpdatingChange(listener: UpdatingListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
