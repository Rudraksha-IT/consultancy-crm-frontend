import { z } from "zod";

import { API_PATHS, HTTP_STATUS } from "@/constants/api";

import { getJson, postJson } from "./client";
import { ApiRequestError, InvalidFieldsError } from "./errors";
import { FieldErrorsSchema } from "./types";

/**
 * Admins are added to a Consultancy from the Platform once it is set up, never while creating it
 * (issue 64). The address is typed as its front part only; the rest is the backend's
 * PRODUCT_DOMAIN.
 */

/** A host name such as `crm.example.com`: letters, digits, hyphens and dots, nothing else. */
const ProductDomainSchema = z.object({
  product_domain: z
    .string()
    .max(253)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/),
});

/** The product domain every office's address ends in, as the backend is set up. */
export async function fetchProductDomain(fetchFn: typeof fetch = fetch): Promise<string> {
  const answer = await getJson(API_PATHS.platformProductDomain, ProductDomainSchema, fetchFn);
  return answer.product_domain;
}

export type NewOfficeAdmin = { name: string; email: string };
export type OfficeAdminField = keyof NewOfficeAdmin | "detail";

const InvitedAdminSchema = z.object({
  name: z.string(),
  email: z.string(),
  status: z.literal("invited"),
});
export type InvitedAdmin = z.infer<typeof InvitedAdminSchema>;

const DetailRefusalSchema = z.object({ detail: z.string() });

/**
 * Invite an Admin into one Consultancy by Code. Rejects with `InvalidFieldsError` naming the
 * refused fields, or `detail` when the office can't take an Admin now.
 */
export async function addConsultancyAdmin(
  consultancyId: number,
  admin: NewOfficeAdmin,
  fetchFn: typeof fetch = fetch,
): Promise<InvitedAdmin> {
  try {
    return await postJson(
      API_PATHS.platformConsultancyAdmins(consultancyId),
      admin,
      InvitedAdminSchema,
      fetchFn,
    );
  } catch (error) {
    throw toAdminFieldErrors(error) ?? error;
  }
}

const FIELDS: readonly OfficeAdminField[] = ["name", "email"];

function toAdminFieldErrors(error: unknown): InvalidFieldsError<OfficeAdminField> | null {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) return null;
  const refusal = DetailRefusalSchema.safeParse(error.body);
  if (refusal.success) return new InvalidFieldsError({ detail: [refusal.data.detail] });
  const fields = FieldErrorsSchema.safeParse(error.body);
  if (!fields.success) return null;
  const found = Object.fromEntries(
    FIELDS.flatMap((field) => {
      const messages = fields.data[field];
      return messages === undefined ? [] : [[field, messages]];
    }),
  );
  return new InvalidFieldsError<OfficeAdminField>(found);
}
