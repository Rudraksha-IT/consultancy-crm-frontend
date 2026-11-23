import "server-only";

import { answerTabIconVersion, onlyGet } from "@/lib/tabIcon";

/** One version of the product logo as the tab icon (first live fixes, ticket 05). */
export async function GET(
  request: Request,
  context: RouteContext<"/tab-icon/[version]">,
): Promise<Response> {
  const { version } = await context.params;
  return answerTabIconVersion(request, version);
}

export const POST = onlyGet;
export const PUT = onlyGet;
export const PATCH = onlyGet;
export const DELETE = onlyGet;
export const HEAD = onlyGet;
export const OPTIONS = onlyGet;
