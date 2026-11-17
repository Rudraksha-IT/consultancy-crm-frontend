import { API_PATHS } from "@/constants/api";

import { postJson } from "./client";
import { DetailAnswerSchema } from "./types";

/**
 * Ask for the login links of the offices `email` belongs to, sent by email (issue 44). The answer
 * is the same whether or not the email belongs to anyone, so it tells this screen nothing.
 */
export async function requestOfficeLinks(
  email: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  await postJson(API_PATHS.centralLogin, { email }, DetailAnswerSchema, fetchFn);
}
