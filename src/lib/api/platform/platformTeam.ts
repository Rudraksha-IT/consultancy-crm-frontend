import { z } from "zod";

import { API_PATHS } from "@/constants/api";

import { getJson, postForm, postJson, sendWithoutBody } from "../core/client";
import { checkCodeAt, explainPasswordRefusal, requestCodeAt } from "../auth/codeSteps";
import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { toFieldErrors } from "../core/fieldErrors";
import {
  DetailAnswerSchema,
  type OfficeLogo,
  type PasswordReset,
  type ResetCode,
} from "../core/types";
import { RecordIdSchema, type RecordId } from "@/lib/recordId";

/**
 * The Platform's own team and brand (issue 65): the Platform Admins tab (list, invite by Code,
 * send the Code again, deactivate), joining the Platform with the Code, and the product's logo.
 */

export const PLATFORM_ADMIN_STATUSES = ["invited", "active", "deactivated"] as const;
export type PlatformAdminStatus = (typeof PLATFORM_ADMIN_STATUSES)[number];

const PlatformAdminRowSchema = z
  .object({
    id: RecordIdSchema,
    name: z.string(),
    email: z.string(),
    status: z.enum(PLATFORM_ADMIN_STATUSES),
    two_factor_required: z.boolean(),
    two_factor_set_up: z.boolean(),
    is_me: z.boolean(),
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    twoFactorRequired: row.two_factor_required,
    twoFactorSetUp: row.two_factor_set_up,
    isMe: row.is_me,
  }));

export type PlatformAdminRow = z.infer<typeof PlatformAdminRowSchema>;
export type NewPlatformAdmin = { name: string; email: string };
export type PlatformTeamField = "name" | "email" | "detail";

const TEAM_FIELDS = { name: "name", email: "email" } as const;
const DetailRefusalSchema = z.object({ detail: z.string() });

/** Every Platform Admin, oldest first. */
export function fetchPlatformAdmins(fetchFn: typeof fetch = fetch): Promise<PlatformAdminRow[]> {
  return getJson(API_PATHS.platformAdmins, z.array(PlatformAdminRowSchema), fetchFn);
}

/** Invite a Platform Admin by Code. Rejects with InvalidFieldsError naming refused fields. */
export async function invitePlatformAdmin(
  admin: NewPlatformAdmin,
  fetchFn: typeof fetch = fetch,
): Promise<PlatformAdminRow> {
  try {
    return await postJson(API_PATHS.platformAdmins, admin, PlatformAdminRowSchema, fetchFn);
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** Email a new join Code to someone still invited. Rejects with InvalidFieldsError (`detail`). */
export async function resendPlatformAdminCode(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  try {
    await postJson(API_PATHS.platformAdminResend(id), {}, DetailAnswerSchema, fetchFn);
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** Deactivate a Platform Admin (or cancel an invite). Rejects with InvalidFieldsError (`detail`). */
export async function deactivatePlatformAdmin(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<PlatformAdminRow> {
  try {
    return await postJson(
      API_PATHS.platformAdminDeactivate(id),
      {},
      PlatformAdminRowSchema,
      fetchFn,
    );
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** Bring a deactivated Platform Admin back; a cancelled invite is invited again with a new Code. */
export async function reactivatePlatformAdmin(
  id: RecordId,
  fetchFn: typeof fetch = fetch,
): Promise<PlatformAdminRow> {
  try {
    return await postJson(
      API_PATHS.platformAdminReactivate(id),
      {},
      PlatformAdminRowSchema,
      fetchFn,
    );
  } catch (error) {
    throw refusalOf(error) ?? error;
  }
}

/** A refusal with a reason for the whole change (`detail`) or for named fields. */
function refusalOf(error: unknown): InvalidFieldsError<PlatformTeamField> | null {
  if (error instanceof ApiRequestError && error.status === 400) {
    const whole = DetailRefusalSchema.safeParse(error.body);
    if (whole.success) return new InvalidFieldsError({ detail: [whole.data.detail] });
  }
  return toFieldErrors(error, TEAM_FIELDS);
}

/** The Join page's "Send me a new code"; the answer is the same for every email. */
export function requestPlatformJoinCode(email: string, fetchFn: typeof fetch = fetch) {
  return requestCodeAt(API_PATHS.platformJoin, email, fetchFn);
}

/** Check a join Code without using it up. Rejects with InvalidCodeError when it's refused. */
export function checkPlatformJoinCode(code: ResetCode, fetchFn: typeof fetch = fetch) {
  return checkCodeAt(API_PATHS.platformJoinVerify, code, fetchFn);
}

/** Choose the password; then log in. Rejects with PasswordRulesNotMetError or InvalidCodeError. */
export async function completePlatformJoin(
  { email, code, password }: PasswordReset,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const body = { email, code, new_password: password };
  try {
    await postJson(API_PATHS.platformJoinComplete, body, DetailAnswerSchema, fetchFn);
  } catch (error) {
    throw explainPasswordRefusal(error);
  }
}

const PRODUCT_LOGO_URL = /^\/api\/platform\/brand\/logo\/[0-9]{1,10}\/$/;
// Shown like an office logo, the product's name always beside it.
const ProductLogoSchema = z
  .object({ url: z.string().regex(PRODUCT_LOGO_URL) })
  .transform(({ url }): OfficeLogo => ({ url, showName: true }));
const ProductBrandSchema = z
  .object({ logo: ProductLogoSchema.nullable().catch(null) })
  .transform(({ logo }) => logo);
const UploadAnswerSchema = z.object({ logo: ProductLogoSchema }).transform(({ logo }) => logo);
const LOGO_FIELDS = { file: "file" } as const;

/** The product's logo for the login screens and the Platform header, or null (initials). */
export function fetchProductLogo(fetchFn: typeof fetch = fetch): Promise<OfficeLogo | null> {
  return getJson(API_PATHS.productBrand, ProductBrandSchema, fetchFn);
}

/** Upload or change the product's logo. Rejects with InvalidFieldsError on `file`. */
export async function uploadProductLogo(
  file: File,
  fetchFn: typeof fetch = fetch,
): Promise<OfficeLogo> {
  const form = new FormData();
  form.append(LOGO_FIELDS.file, file);
  try {
    return await postForm(API_PATHS.productLogo, form, UploadAnswerSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, LOGO_FIELDS) ?? error;
  }
}

/** Remove the product's logo; the initials show again. */
export function removeProductLogo(fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.productLogo, fetchFn);
}
