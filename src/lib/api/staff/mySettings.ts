import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";
import {
  COLOUR_MODE_CHOICES,
  NOTIFICATION_CHOICES,
  type ColourModeChoice,
  type NotificationChoice,
} from "@/constants/mySettings";
import { ROLES } from "@/constants/roles";

import { getJson, patchJson, postJson } from "../core/client";
import {
  ApiRequestError,
  PasswordRulesNotMetError,
  WrongCurrentPasswordError,
} from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import { FieldErrorsSchema, UnmetRulesAnswerSchema } from "../core/types";

/** A person's own Settings (spec 22c-22g; issue 38). Everything here is about the caller only. */

const MyDetailsSchema = z
  .object({
    name: z.string(),
    mobile: z.string(),
    email: z.string(),
    job_title: z.string(),
    role: z.enum(ROLES),
    joined_on: z.string(),
    colour_mode: z.enum(COLOUR_MODE_CHOICES),
    page_swipe: z.boolean(),
    notifications: z.object({
      task_given: z.boolean(),
      task_due_tomorrow: z.boolean(),
      morning_summary: z.boolean(),
    }),
  })
  .transform((me) => ({
    name: me.name,
    mobile: me.mobile,
    email: me.email,
    jobTitle: me.job_title,
    role: me.role,
    joinedOn: me.joined_on,
    colourMode: me.colour_mode,
    pageSwipe: me.page_swipe,
    notifications: {
      taskGiven: me.notifications.task_given,
      taskDueTomorrow: me.notifications.task_due_tomorrow,
      morningSummary: me.notifications.morning_summary,
    } satisfies Record<NotificationChoice, boolean>,
  }));

export type MyDetails = z.infer<typeof MyDetailsSchema>;

export type MyDetailsChange = { name: string; mobile: string };
export type MyDetailsField = keyof MyDetailsChange;
export type PasswordChange = { currentPassword: string; newPassword: string };

// The longest device name Django makes ("Samsung Internet on Unknown system", issue 71).
const MAX_DEVICE_NAME_LENGTH = 60;

const SignedInDeviceSchema = z
  .object({
    name: z.string().min(1).max(MAX_DEVICE_NAME_LENGTH),
    signed_in_at: z.string(),
    last_used_at: z.string(),
    logged_out_at: z.string().nullable(),
    is_current: z.boolean(),
  })
  .transform((device) => ({
    name: device.name,
    signedInAt: device.signed_in_at,
    lastUsedAt: device.last_used_at,
    loggedOutAt: device.logged_out_at,
    isCurrent: device.is_current,
  }));

export type SignedInDevice = z.infer<typeof SignedInDeviceSchema>;

// The Next.js server keeps the new tokens a password change or sign-out gives this device
// (ADR 0003); the browser gets nothing else.
const NoTokensSchema = z.object({});

const NOTIFICATION_API_FIELDS: Record<NotificationChoice, string> = {
  taskGiven: "task_given",
  taskDueTomorrow: "task_due_tomorrow",
  morningSummary: "morning_summary",
};

const DETAILS_API_FIELDS: Record<MyDetailsField, string> = { name: "name", mobile: "mobile" };

/** My details, light/dark and email choices. */
export function fetchMyDetails(fetchFn: typeof fetch = fetch): Promise<MyDetails> {
  return getJson(API_PATHS.me, MyDetailsSchema, fetchFn);
}

/** Save my name and mobile; rejects with InvalidFieldsError naming what was refused. */
export async function saveMyDetails(
  change: MyDetailsChange,
  fetchFn: typeof fetch = fetch,
): Promise<MyDetails> {
  try {
    return await patchJson(API_PATHS.me, change, MyDetailsSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, DETAILS_API_FIELDS) ?? error;
  }
}

/** Save some of my email choices; the rest stay as they are. */
export function saveNotificationChoices(
  choices: Partial<Record<NotificationChoice, boolean>>,
  fetchFn: typeof fetch = fetch,
): Promise<MyDetails> {
  const notifications = Object.fromEntries(
    NOTIFICATION_CHOICES.filter((choice) => choices[choice] !== undefined).map((choice) => [
      NOTIFICATION_API_FIELDS[choice],
      choices[choice],
    ]),
  );
  return patchJson(API_PATHS.me, { notifications }, MyDetailsSchema, fetchFn);
}

/** Remember my light or dark choice, for me on every device. */
export function saveColourMode(
  colourMode: ColourModeChoice,
  fetchFn: typeof fetch = fetch,
): Promise<MyDetails> {
  return patchJson(API_PATHS.me, { colour_mode: colourMode }, MyDetailsSchema, fetchFn);
}

/** Switch Swipe between pages on or off, for me only (asked 2026-11-17). */
export function savePageSwipe(isOn: boolean, fetchFn: typeof fetch = fetch): Promise<MyDetails> {
  return patchJson(API_PATHS.me, { page_swipe: isOn }, MyDetailsSchema, fetchFn);
}

/**
 * Change my password. Every other device is signed out at once; this one stays logged in.
 * Rejects with PasswordRulesNotMetError or WrongCurrentPasswordError.
 */
export async function changeMyPassword(
  change: PasswordChange,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const body = { current_password: change.currentPassword, new_password: change.newPassword };
  try {
    await postJson(API_PATHS.myPassword, body, NoTokensSchema, fetchFn);
  } catch (error) {
    throw explainPasswordRefusal(error);
  }
}

/**
 * My Signed-in devices (issue 71): this browser first, then others still logged in, then the
 * few most recently logged out.
 */
export function fetchSignedInDevices(fetchFn: typeof fetch = fetch): Promise<SignedInDevice[]> {
  return getJson(API_PATHS.myDevices, z.array(SignedInDeviceSchema), fetchFn);
}

/** Sign every other device out at once; this one stays logged in. */
export async function signOutOtherDevices(fetchFn: typeof fetch = fetch): Promise<void> {
  await postJson(API_PATHS.signOutOtherDevices, {}, NoTokensSchema, fetchFn);
}

function explainPasswordRefusal(error: unknown): unknown {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return error;
  const rules = UnmetRulesAnswerSchema.safeParse(error.body);
  if (rules.success) return new PasswordRulesNotMetError(rules.data.unmet_rules);
  return refusesCurrentPassword(error.body) ? new WrongCurrentPasswordError() : error;
}

function refusesCurrentPassword(body: unknown): boolean {
  const fields = FieldErrorsSchema.safeParse(body);
  return fields.success && fields.data.current_password !== undefined;
}
