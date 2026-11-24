import "server-only";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import { z } from "zod";

import { LABELS } from "@/constants/messages";
import { PRODUCT_NAME } from "@/constants/productName";

import { askPlatform } from "./askPlatform";

const BrandNameSchema = z.object({ name: z.string().trim().min(1).max(PRODUCT_NAME.maxLength) });

let lastGood: string | null = null;

/**
 * The product's name (first live fixes, ticket 15) for every page. Kept by Next.js for a minute,
 * so Django is asked at most once a minute and offices see a change within one; the pages can
 * still be built ahead without a request.
 */
export async function getProductName(): Promise<string> {
  "use cache";
  cacheLife({
    stale: PRODUCT_NAME.cacheSeconds,
    revalidate: PRODUCT_NAME.cacheSeconds,
    expire: PRODUCT_NAME.expireSeconds,
  });
  cacheTag(PRODUCT_NAME.cacheTag);
  return askProductName();
}

/** Ask Django now; when it can't say, the last name it gave, or the default before any. */
export async function askProductName(): Promise<string> {
  const name = await askName();
  if (name !== null) lastGood = name;
  return name ?? lastGood ?? LABELS.productName;
}

/**
 * After a call forwarded to Django: when it was a name change Django accepted, drop the kept
 * name and every page built with it, so the next page anyone opens has the new one (list
 * tidy-ups 05). Only the Platform's address can change it; Django refuses it anywhere else.
 */
export function dropProductNameIfChanged(request: Request, answer: Response): void {
  const path = new URL(request.url).pathname;
  const isChange = request.method === "PUT" && path === PRODUCT_NAME.changePath;
  if (isChange && answer.ok) revalidateTag(PRODUCT_NAME.cacheTag, { expire: 0 });
}

/** Forget the last name; for tests. */
export function forgetProductName(): void {
  lastGood = null;
}

async function askName(): Promise<string | null> {
  // Asked by this server over the internal address; "https" so Django never redirects it.
  const answer = await askPlatform(PRODUCT_NAME.backendPath, "https", PRODUCT_NAME.timeoutMs);
  if (answer === null) return null;
  try {
    const parsed = BrandNameSchema.safeParse(await answer.json());
    return parsed.success ? parsed.data.name : null;
  } catch {
    // silent: an answer that isn't JSON counts as no answer
    return null;
  }
}
