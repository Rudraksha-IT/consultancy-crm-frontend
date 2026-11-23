import { z } from "zod";

import { API_PATHS } from "@/constants/api";

import { putJson } from "../core/client";
import { toFieldErrors } from "../core/fieldErrors";

const NameAnswerSchema = z.object({ name: z.string().min(1) }).transform(({ name }) => name);

/**
 * Change the product's name (first live fixes, ticket 15); resolves with the name as kept.
 * Rejects with InvalidFieldsError on `name` when the server refuses it.
 */
export async function saveProductName(
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  try {
    return await putJson(API_PATHS.productName, { name }, NameAnswerSchema, fetchFn);
  } catch (error) {
    throw toFieldErrors(error, { name: "name" }) ?? error;
  }
}
