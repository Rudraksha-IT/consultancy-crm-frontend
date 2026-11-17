import { z } from "zod";

import { TwoFactorStepAnswerSchema, type TwoFactorStep } from "./twoFactor";
import { LoginAnswerSchema, type StaffContext } from "./types";

/**
 * What a Staff login, joining or a reset by Code gives: the new login's context, or, with
 * two-step login on (issue 62), the step that comes next. The Next.js server keeps the tokens or
 * the challenge in its sealed cookies; neither is ever in this answer.
 */
export type StaffLoginOutcome =
  { kind: "loggedIn"; context: StaffContext } | { kind: "twoFactor"; step: TwoFactorStep };

export const StaffLoginOutcomeSchema: z.ZodType<StaffLoginOutcome> = z.union([
  LoginAnswerSchema.transform(({ context }) => ({ kind: "loggedIn" as const, context })),
  TwoFactorStepAnswerSchema.transform((step) => ({ kind: "twoFactor" as const, step })),
]);
