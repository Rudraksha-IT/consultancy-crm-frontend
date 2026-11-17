import { z } from "zod";

import { API_PATHS } from "@/constants/api";

import { postJson } from "../core/client";
import type { TwoFactorSide } from "./twoFactor";

/** What comes after the email (issue 66): the password, or joining with a Code. */
export type LoginNext = "password" | "join";

const LoginNextSchema = z
  .object({ next: z.enum(["password", "join"]) })
  .transform(({ next }): LoginNext => next);

const PATHS: Record<TwoFactorSide, string> = {
  staff: API_PATHS.loginNext,
  platform: API_PATHS.platformLoginNext,
};

/**
 * Email-first login: ask what comes after `email`. Someone invited and not joined yet gets
 * `join` (and a fresh Code by email); everyone else gets `password`, so it never says who has an
 * account.
 */
export function nextLoginStep(
  side: TwoFactorSide,
  email: string,
  fetchFn: typeof fetch = fetch,
): Promise<LoginNext> {
  return postJson(PATHS[side], { email }, LoginNextSchema, fetchFn);
}
