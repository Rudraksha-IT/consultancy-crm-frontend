/**
 * A Student's Activity mixes several lists (Visits, messages, History), each paged by the API
 * newest first (spec 23c). Merged, an item is only shown once no unloaded page could hold
 * something newer, so the order never jumps when older pages arrive.
 */

/** Anything with a moment in time and a key unique across every source. */
export type Dated = { key: string; at: string };

/** One paged list as loaded so far: its items, how many it has in all, and the last page. */
export type ActivitySource<Item extends Dated> = {
  items: readonly Item[];
  count: number;
  page: number;
};

export type MergedActivity<Item extends Dated> = { items: Item[]; hasOlder: boolean };

/** Every source's items newest first, up to where a source still has pages to load. */
export function mergeActivity<Item extends Dated>(
  sources: readonly ActivitySource<Item>[],
): MergedActivity<Item> {
  const cutoff = loadedUntil(sources);
  const items = sources
    .flatMap((one) => one.items)
    .filter((item) => cutoff === null || time(item) >= cutoff)
    .sort((a, b) => time(b) - time(a) || a.key.localeCompare(b.key));
  return { items, hasOlder: sources.some(hasMore) };
}

/** Which sources (by index) to load the next page of, for "Show older". */
export function sourcesToLoadNext<Item extends Dated>(
  sources: readonly ActivitySource<Item>[],
): number[] {
  const cutoff = loadedUntil(sources);
  if (cutoff === null) return [];
  return sources.flatMap((one, index) => (hasMore(one) && oldest(one) >= cutoff ? [index] : []));
}

/** The moment every source is complete down to, or null when every source is fully loaded. */
function loadedUntil<Item extends Dated>(sources: readonly ActivitySource<Item>[]): number | null {
  const limits = sources.filter(hasMore).map(oldest);
  return limits.length === 0 ? null : Math.max(...limits);
}

function hasMore<Item extends Dated>(one: ActivitySource<Item>): boolean {
  return one.items.length < one.count;
}

function oldest<Item extends Dated>(one: ActivitySource<Item>): number {
  return Math.min(...one.items.map(time));
}

function time(item: Dated): number {
  return Date.parse(item.at);
}
