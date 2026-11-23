import "server-only";

import { z } from "zod";

import { LABELS } from "@/constants/messages";
import { PRODUCT_NAME } from "@/constants/productName";

import { askPlatform } from "./askPlatform";

const BrandNameSchema = z.object({ name: z.string().trim().min(1).max(PRODUCT_NAME.maxLength) });

let kept: { name: string; until: number } | null = null;

/**
 * The product's name (first live fixes, ticket 15) for every page: asked of Django at most once a
 * minute. When Django can't say, the last name it gave, or the default before any.
 */
export async function getProductName(protocol: string, now = Date.now()): Promise<string> {
  return keptAt(now) ?? remember(await askName(protocol), now);
}

/** The name kept, while it is still fresh. */
function keptAt(now: number): string | null {
  return kept !== null && now < kept.until ? kept.name : null;
}

/** Keep a name Django gave for a minute; without one, the last name or the default. */
function remember(name: string | null, now: number): string {
  if (name === null) return kept?.name ?? LABELS.productName;
  kept = { name, until: now + PRODUCT_NAME.cacheMs };
  return name;
}

/** Forget the name kept; for tests. */
export function forgetProductName(): void {
  kept = null;
}

async function askName(protocol: string): Promise<string | null> {
  const answer = await askPlatform(PRODUCT_NAME.backendPath, protocol, PRODUCT_NAME.timeoutMs);
  if (answer === null) return null;
  try {
    const parsed = BrandNameSchema.safeParse(await answer.json());
    return parsed.success ? parsed.data.name : null;
  } catch {
    // silent: an answer that isn't JSON counts as no answer
    return null;
  }
}
