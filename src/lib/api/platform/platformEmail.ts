import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { getJson, postJson } from "../core/client";
import { ApiRequestError } from "../core/errors";

/**
 * Platform → Settings: is the product's email working? (spec 2026-11-18 stories 3-4, ADR 0023).
 * The SMTP details are never sent to the browser: only the address emails go out from and how
 * the last test email went.
 */

/** What the last test email showed. */
export type EmailState = "working" | "failed" | "untested";

export type PlatformEmail = {
  state: EmailState;
  /** When the last test was sent, from the API; null when never. */
  testedAt: string | null;
  /** A failed test's reference to quote (never the mail server's words). */
  reference: string | null;
  fromAddress: string;
  productName: string;
  /** The signed-in Platform Admin's address, where a test email goes. */
  sentTo: string;
};

/** Too many test emails in the last hour. */
export class TooManyTestEmailsError extends Error {
  constructor() {
    super("Too many test emails");
    this.name = "TooManyTestEmailsError";
  }
}

// The sender, shown as text: one "@" between a name and a host, no spaces or markup. A host
// without a dot is allowed, as a local copy sends from no-reply@localhost (list tidy-ups 11).
const SENDER = z
  .string()
  .max(254)
  .regex(/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$/);

// A correlation ID: letters, digits and dashes only; anything else is dropped.
const REFERENCE = /^[A-Za-z0-9-]{1,64}$/;

const PlatformEmailSchema = z
  .object({
    email: z.object({
      state: z.enum(["working", "failed", "untested"]),
      tested_at: z.iso.datetime({ offset: true }).nullable(),
      reference: z.string().regex(REFERENCE).nullable().catch(null),
    }),
    from_address: SENDER,
    product_name: z.string().min(1).max(100),
    sent_to: z.email(),
  })
  .transform(({ email, from_address, product_name, sent_to }): PlatformEmail => ({
    state: email.state,
    testedAt: email.tested_at,
    reference: email.reference,
    fromAddress: from_address,
    productName: product_name,
    sentTo: sent_to,
  }));

/** The email status and where a test email would go. */
export function fetchPlatformEmail(fetchFn: typeof fetch = fetch): Promise<PlatformEmail> {
  return getJson(API_PATHS.platformEmail, PlatformEmailSchema, fetchFn);
}

/**
 * Send the signed-in Platform Admin the test email and read how it went (sent or failed).
 * Rejects with TooManyTestEmailsError past the hourly limit.
 */
export async function sendTestEmail(fetchFn: typeof fetch = fetch): Promise<PlatformEmail> {
  try {
    return await postJson(API_PATHS.platformTestEmail, {}, PlatformEmailSchema, fetchFn);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === HTTP_STATUS.tooManyRequests) {
      throw new TooManyTestEmailsError();
    }
    throw error;
  }
}
