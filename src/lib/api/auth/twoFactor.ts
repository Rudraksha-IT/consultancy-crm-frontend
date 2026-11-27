import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { getJson, postJson } from "../core/client";
import { ApiRequestError, WrongCurrentPasswordError } from "../core/errors";
import { FieldErrorsSchema, PlatformAdminAnswerSchema, type PlatformAdmin } from "../core/types";

/**
 * Two-step login (issue 61). After the password, the Next.js server keeps a challenge in its own
 * sealed cookie and adds it to these calls; the browser only ever sends its own fields.
 */

export type TwoFactorStep = "setup" | "verify";
export type SecondStepAnswer = { code: string } | { recoveryCode: string };
/**
 * My own two-step login. `canSwitchOff` is false for a Staff member whose Admin requires it
 * (issue 62); a Platform Admin always may.
 */
export type TwoFactorState = {
  required: boolean;
  setUp: boolean;
  recoveryCodesLeft: number;
  canSwitchOff: boolean;
};
export type WrongNumberField = "code" | "recoveryCode";

/** The login has timed out, was used, or ended after wrong tries: log in again. */
export class StartAgainError extends Error {
  constructor() {
    super("Log in again");
    this.name = "StartAgainError";
  }
}

/** The number, or the recovery code (`field`), was refused. */
export class WrongNumberError extends Error {
  readonly field: WrongNumberField;

  constructor(field: WrongNumberField) {
    super("Wrong number or recovery code");
    this.name = "WrongNumberError";
    this.field = field;
  }
}

/** Too many wrong numbers or passwords lately; wait, then try again. */
export class TooManyTriesError extends Error {
  constructor() {
    super("Too many wrong tries");
    this.name = "TooManyTriesError";
  }
}

const MAX_URI_LENGTH = 1000;
const SECRET = /^[A-Z2-7]{16,64}$/;
const RECOVERY_CODE = /^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/;
const RECOVERY_CODE_COUNT = 10;

export const TwoFactorStepSchema = z.enum(["setup", "verify"]);
export const TwoFactorStepAnswerSchema = z
  .object({ two_factor: TwoFactorStepSchema })
  .transform(({ two_factor }) => two_factor);

const SetupSchema = z
  .object({ uri: z.string().max(MAX_URI_LENGTH).startsWith("otpauth://totp/") })
  .transform(({ uri }, context) => {
    const secret = URL.canParse(uri) ? new URL(uri).searchParams.get("secret") : null;
    if (secret === null || !SECRET.test(secret)) {
      context.addIssue({ code: "custom", message: "not a TOTP setup URI" });
      return z.NEVER;
    }
    return { uri, secret };
  });

const RecoveryCodesSchema = z.array(z.string().regex(RECOVERY_CODE)).length(RECOVERY_CODE_COUNT);

const StateSchema = z
  .object({
    required: z.boolean(),
    set_up: z.boolean(),
    recovery_codes_left: z.number().int().min(0).max(RECOVERY_CODE_COUNT),
  })
  .transform((state) => ({
    required: state.required,
    setUp: state.set_up,
    recoveryCodesLeft: state.recovery_codes_left,
    canSwitchOff: true,
  }));

const StaffStateSchema = z
  .object({
    required: z.boolean(),
    set_up: z.boolean(),
    recovery_codes_left: z.number().int().min(0).max(RECOVERY_CODE_COUNT),
    can_switch_off: z.boolean(),
  })
  .transform((state) => ({
    required: state.required,
    setUp: state.set_up,
    recoveryCodesLeft: state.recovery_codes_left,
    canSwitchOff: state.can_switch_off,
  }));

const STATE_SCHEMAS: Record<TwoFactorSide, z.ZodType<TwoFactorState>> = {
  platform: StateSchema,
  staff: StaffStateSchema,
};

const StartAgainSchema = z.looseObject({ start_again: z.literal(true) });

/**
 * Whose two-step login: a Platform Admin's on the Platform (issue 61), or a Staff member's on
 * their office's address (issue 62). The steps are the same; only the addresses differ.
 */
export type TwoFactorSide = "platform" | "staff";

const PATHS: Record<
  TwoFactorSide,
  { setup: string; confirm: string; verify: string; mine: string }
> = {
  platform: {
    setup: API_PATHS.platformTwoFactorSetup,
    confirm: API_PATHS.platformTwoFactorConfirm,
    verify: API_PATHS.platformTwoFactorVerify,
    mine: API_PATHS.platformMyTwoFactor,
  },
  staff: {
    setup: API_PATHS.twoFactorSetup,
    confirm: API_PATHS.twoFactorConfirm,
    verify: API_PATHS.twoFactorVerify,
    mine: API_PATHS.myTwoFactor,
  },
};

// A Staff login's answer: its context (checked by the screen that loads next).
const StaffLoginSchema = z.object({ context: z.looseObject({}) });

/** Show the new app's secret: its `otpauth://` URI (for the QR code) and the secret as text. */
export async function startTwoFactorSetup(
  fetchFn: typeof fetch = fetch,
  side: TwoFactorSide = "platform",
): Promise<{ uri: string; secret: string }> {
  return explained(() => postJson(PATHS[side].setup, {}, SetupSchema, fetchFn));
}

/** Confirm the new app with one number; logs in and returns the recovery codes, shown once. */
export async function confirmTwoFactorSetup(
  code: string,
  fetchFn: typeof fetch = fetch,
  side: TwoFactorSide = "platform",
): Promise<string[]> {
  const schema = z.object({ recovery_codes: RecoveryCodesSchema });
  const answer = await explained(() => postJson(PATHS[side].confirm, { code }, schema, fetchFn));
  return answer.recovery_codes;
}

/** The second step of a Platform Admin's login: a number from the app, or a recovery code. */
export async function verifyTwoFactor(
  answer: SecondStepAnswer,
  fetchFn: typeof fetch = fetch,
): Promise<PlatformAdmin> {
  return explained(() =>
    postJson(PATHS.platform.verify, apiAnswer(answer), PlatformAdminAnswerSchema, fetchFn),
  );
}

/** The second step of a Staff login (issue 62): a number from the app, or a recovery code. */
export async function verifyStaffTwoFactor(
  answer: SecondStepAnswer,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  await explained(() => postJson(PATHS.staff.verify, apiAnswer(answer), StaffLoginSchema, fetchFn));
}

/** My two-step login: the Platform's Account page, or My settings in an office (issue 62). */
export function fetchMyTwoFactor(
  fetchFn: typeof fetch = fetch,
  side: TwoFactorSide = "platform",
): Promise<TwoFactorState> {
  return getJson(PATHS[side].mine, STATE_SCHEMAS[side], fetchFn);
}

/** Switch two-step login on: this session ends and setup starts at once. */
export async function switchTwoFactorOn(
  fetchFn: typeof fetch = fetch,
  side: TwoFactorSide = "platform",
): Promise<void> {
  await explained(() =>
    postJson(PATHS[side].mine, { action: "on" }, TwoFactorStepAnswerSchema, fetchFn),
  );
}

/** Switch two-step login off, with my password and a number (or a recovery code). */
export async function switchTwoFactorOff(
  proof: { password: string } & SecondStepAnswer,
  fetchFn: typeof fetch = fetch,
  side: TwoFactorSide = "platform",
): Promise<TwoFactorState> {
  const schema = z.object({ two_factor: STATE_SCHEMAS[side] });
  const answer = await explained(() =>
    postJson(PATHS[side].mine, switchOffBody(proof), schema, fetchFn),
  );
  return answer.two_factor;
}

/** Make 10 new recovery codes with a number; the old ones stop working. Shown once. */
export async function makeNewRecoveryCodes(
  code: string,
  fetchFn: typeof fetch = fetch,
  side: TwoFactorSide = "platform",
): Promise<string[]> {
  const body = { action: "new_recovery_codes", code };
  const schema = z.object({ recovery_codes: RecoveryCodesSchema });
  const answer = await explained(() => postJson(PATHS[side].mine, body, schema, fetchFn));
  return answer.recovery_codes;
}

function switchOffBody(proof: { password: string } & SecondStepAnswer): Record<string, string> {
  return { action: "off", password: proof.password, ...apiAnswer(proof) };
}

function apiAnswer(answer: SecondStepAnswer): Record<string, string> {
  return "code" in answer ? { code: answer.code } : { recovery_code: answer.recoveryCode };
}

async function explained<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw explainRefusal(error) ?? error;
  }
}

/** The two-step refusal an API failure stands for, or null for any other failure. */
export function explainRefusal(error: unknown): Error | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status === HTTP_STATUS.tooManyRequests) return new TooManyTriesError();
  return error.status === HTTP_STATUS.badRequest ? explainBadRequest(error.body) : null;
}

// Which refused field stands for which error, in the order they are looked for.
const FIELD_REFUSALS: readonly (readonly [string, () => Error])[] = [
  ["password", () => new WrongCurrentPasswordError()],
  ["code", () => new WrongNumberError("code")],
  ["recovery_code", () => new WrongNumberError("recoveryCode")],
];

function explainBadRequest(body: unknown): Error | null {
  if (StartAgainSchema.safeParse(body).success) return new StartAgainError();
  const fields = FieldErrorsSchema.safeParse(body);
  if (!fields.success) return null;
  const found = FIELD_REFUSALS.find(([field]) => field in fields.data);
  return found === undefined ? null : found[1]();
}
