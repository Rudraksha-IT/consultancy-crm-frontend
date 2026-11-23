import { z } from "zod";

/**
 * "Not now" on the Admin's office-network dialog, remembered on this device for good (first live
 * fixes, ticket 03). Only a SHA-256 hash of the network is kept, never the network itself (ADR
 * 0004). Blocked storage or missing hashing only means the dialog may show again.
 */

export const NOT_NOW_KEY = "crm.office-network-not-now";

/** Enough for home, the office and a few address changes; the oldest drop off. */
const MOST_KEPT = 20;

const StoredSchema = z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(MOST_KEPT);

async function hashOf(network: string): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(network));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function readHashes(): string[] {
  try {
    const raw = window.localStorage.getItem(NOT_NOW_KEY);
    if (raw === null) return [];
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Whether Not now was pressed for this network on this device. */
export async function isNotNow(network: string): Promise<boolean> {
  const hash = await hashOf(network);
  return hash !== null && readHashes().includes(hash);
}

/** Remember Not now for this network on this device. */
export async function rememberNotNow(network: string): Promise<void> {
  const hash = await hashOf(network);
  if (hash === null) return;
  const kept = [...readHashes().filter((known) => known !== hash), hash].slice(-MOST_KEPT);
  try {
    window.localStorage.setItem(NOT_NOW_KEY, JSON.stringify(kept));
  } catch {
    // Storage is refused (a private window): the dialog may show again.
  }
}
