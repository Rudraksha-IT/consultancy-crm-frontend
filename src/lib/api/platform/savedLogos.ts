import { z } from "zod";

import { API_PATHS } from "@/constants/api";
import { RecordIdSchema, type RecordId } from "@/lib/recordId";

import { getJson, putJson, sendWithoutBody } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";
import type { OfficeLogo } from "../core/types";
import { ProductLogoSchema } from "./platformTeam";

/**
 * Saved product logos (first live fixes, ticket 07): every upload is kept, at most `limit`; one
 * of them, or none (the app's own logo), is in use. Platform Admins only.
 */

const SavedLogoSchema = z
  .object({
    id: RecordIdSchema,
    file_url: z.string(),
    uploaded_at: z.iso.datetime({ offset: true }),
    in_use: z.boolean(),
  })
  // The file is this logo's own, on this server, never anywhere else.
  .refine((row) => row.file_url === API_PATHS.savedLogoFile(row.id))
  .transform((row) => ({
    id: row.id,
    fileUrl: row.file_url,
    uploadedAt: row.uploaded_at,
    inUse: row.in_use,
  }));

const SavedLogosSchema = z.object({
  logos: z.array(SavedLogoSchema),
  limit: z.number().int().positive(),
});

const InUseAnswerSchema = z
  .object({ logo: ProductLogoSchema.nullable() })
  .transform(({ logo }) => logo);

export type SavedLogo = z.infer<typeof SavedLogoSchema>;
export type SavedLogos = z.infer<typeof SavedLogosSchema>;

const IN_USE_FIELDS = { logo: "logo" } as const;

/** Every saved logo, newest first, and how many may be kept. */
export function fetchSavedLogos(fetchFn: typeof fetch = fetch): Promise<SavedLogos> {
  return getJson(API_PATHS.savedLogos, SavedLogosSchema, fetchFn);
}

/**
 * Use a saved logo, or the app's own logo (null). Answers the logo now shown on the login
 * screens, or null. Rejects with InvalidFieldsError on `logo` for a logo no longer saved.
 */
export async function pickSavedLogo(
  id: RecordId | null,
  fetchFn: typeof fetch = fetch,
): Promise<OfficeLogo | null> {
  try {
    return await putJson(API_PATHS.savedLogoInUse, { logo: id }, InUseAnswerSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, IN_USE_FIELDS) ?? error;
  }
}

/** Remove a saved logo and its file; if it was in use, the app's own logo is used. */
export function removeSavedLogo(id: RecordId, fetchFn: typeof fetch = fetch): Promise<void> {
  return sendWithoutBody("DELETE", API_PATHS.savedLogo(id), fetchFn);
}
