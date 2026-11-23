import "server-only";

import { answerTabIcon, onlyGet } from "@/lib/tabIcon";

/**
 * The browser tab's icon on every address (first live fixes, ticket 05): the product logo from
 * Platform → Settings, or the default emerald icon. Every layout links here.
 */
export function GET(request: Request): Promise<Response> {
  return answerTabIcon(request);
}

export const POST = onlyGet;
export const PUT = onlyGet;
export const PATCH = onlyGet;
export const DELETE = onlyGet;
export const HEAD = onlyGet;
export const OPTIONS = onlyGet;
