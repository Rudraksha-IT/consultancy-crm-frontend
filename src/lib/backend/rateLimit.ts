import "server-only";

import { createHash } from "node:crypto";

export type RateLimitSettings = {
  /** Calls allowed per key in each window. */
  limit: number;
  windowMs: number;
  /** Keys remembered at once; the oldest are forgotten first. */
  maxKeys: number;
};

export type RateLimiter = {
  /** Count one call for `key`; false once its window's calls are used up. */
  take: (key: string, now?: number) => boolean;
};

type Window = { startedAt: number; count: number };

/**
 * A fixed-window counter in this server's memory (one Next.js process, issue 31). Keys are kept
 * only as a SHA-256 hash, so the raw value (e.g. an address) is never held.
 */
export function createRateLimiter(settings: RateLimitSettings): RateLimiter {
  const windows = new Map<string, Window>();

  function forgetOld(now: number): void {
    for (const [key, window] of windows) {
      if (now - window.startedAt >= settings.windowMs) windows.delete(key);
    }
    while (windows.size >= settings.maxKeys) {
      const oldest = windows.keys().next();
      if (oldest.done === true) break;
      windows.delete(oldest.value);
    }
  }

  function startWindow(hashed: string, now: number): void {
    windows.delete(hashed);
    if (windows.size >= settings.maxKeys) forgetOld(now);
    windows.set(hashed, { startedAt: now, count: 1 });
  }

  return {
    take(key, now = Date.now()) {
      const hashed = createHash("sha256").update(key).digest("hex");
      const current = windows.get(hashed);
      if (current === undefined || now - current.startedAt >= settings.windowMs) {
        startWindow(hashed, now);
        return true;
      }
      if (current.count >= settings.limit) return false;
      current.count += 1;
      return true;
    },
  };
}
