/**
 * Movement (design system: Movement; UI revamp, ticket 22). Pure rules only, like the gestures:
 * the components read the page and these decide whether and from where something moves.
 *
 * - A page arrives only when another page opens; an action on the same page never replays it.
 * - On the same page only a row that is new or changed is shown up, and only a few at once.
 * - The marker of where you are slides from its old place to its new one.
 * - With "reduce motion" on, nothing moves.
 */

/** More new rows than this at once is a list redrawn, which never flashes. */
export const MAX_CHANGED_ROWS = 6;

/** Closer than this (px) is the same place. */
const SAME_PLACE = 2;

export type Device = {
  /** The device asks for less motion. */
  reducesMotion: boolean;
  /** The browser can run an animation started from code. */
  canAnimate: boolean;
};

/** Whether anything may move at all. */
export function canMove(device: Device): boolean {
  return device.canAnimate && !device.reducesMotion;
}

/** The page of an address: without what it shows (`?tab=`), where on it (`#`) or a last slash. */
function pageOf(path: string): string {
  const page = path.split(/[?#]/)[0] ?? "";
  return page.length > 1 ? page.replace(/\/+$/, "") : page;
}

/**
 * Whether a page has arrived: the first page, or a page other than the one before. A tab, a
 * filter or a page of a list noted in the address is the same page.
 */
export function hasArrived(previous: string | null, path: string): boolean {
  return previous === null || pageOf(previous) !== pageOf(path);
}

/**
 * Which rows of a list are new or changed since it was last drawn, by their words: the indexes
 * in `after`. None for a list drawn for the first time, for one redrawn whole (nothing of it
 * stayed) or when more than six changed at once.
 */
export function changedRows(before: readonly string[], after: readonly string[]): number[] {
  if (before.length === 0) return [];
  const left = new Map<string, number>();
  before.forEach((row) => left.set(row, (left.get(row) ?? 0) + 1));
  const changed = after.flatMap((row, index) => {
    const copies = left.get(row) ?? 0;
    if (copies === 0) return [index];
    left.set(row, copies - 1);
    return [];
  });
  const isRedrawn = changed.length === after.length || changed.length > MAX_CHANGED_ROWS;
  return isRedrawn ? [] : changed;
}

/** Where something is drawn, measured inside whatever holds it. */
export type Place = { left: number; top: number; width: number };

/** Where a move starts, as seen from where it ends. */
export type StartOffset = { dx: number; dy: number; scaleX: number };

/**
 * Where a marker (or a board card) starts so that it seems to come from its old place: shifted
 * back by how far it has come and as wide as it was. Null when it has not moved, or was not (or
 * is not) on screen.
 */
export function startOffset(old: Place | null, now: Place | null): StartOffset | null {
  if (!isShown(old) || !isShown(now)) return null;
  const dx = old.left - now.left;
  const dy = old.top - now.top;
  const hasMoved = Math.abs(dx) >= SAME_PLACE || Math.abs(dy) >= SAME_PLACE;
  return hasMoved ? { dx, dy, scaleX: old.width / now.width } : null;
}

/** Drawn on screen: something hidden has no width. */
function isShown(place: Place | null): place is Place {
  return place !== null && place.width > 0;
}
