import { z } from "zod";

import { HTTP_STATUS } from "@/constants/api";

/**
 * An unexpected server error (issue 58): Django answers 5xx with `{detail, reference}`, the
 * reference being the request's correlation ID. The app shell shows it so staff can quote it.
 */
const UnexpectedErrorSchema = z.object({
  detail: z.string(),
  reference: z.uuid(),
});

type UnexpectedErrorListener = (reference: string) => void;

const listeners = new Set<UnexpectedErrorListener>();

/** The reference in a failed answer, or null when it isn't an unexpected server error. */
export function unexpectedErrorOf(status: number | null, body: unknown): string | null {
  if (status === null || status < HTTP_STATUS.serverError) return null;
  const parsed = UnexpectedErrorSchema.safeParse(body);
  return parsed.success ? parsed.data.reference.toLowerCase() : null;
}

/** Tell every listener (the app shell) the reference of an unexpected server error. */
export function reportUnexpectedError(reference: string): void {
  for (const listener of listeners) listener(reference);
}

/** Listen for unexpected server errors; returns the function that stops listening. */
export function onUnexpectedError(listener: UnexpectedErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
