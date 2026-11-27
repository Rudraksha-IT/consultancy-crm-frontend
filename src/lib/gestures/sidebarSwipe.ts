/**
 * Swiping the sidebar open and shut (design system, Gestures; issue 89). Pure rules only: the
 * shell's hook reads the events and the page, and these decide what happens.
 *
 * - Phones and tablets: one finger from the left edge pulls the slide-out menu open, a finger on
 *   the open menu pushes it shut; it follows the finger and settles on the nearer side.
 * - Computers (above 1024 px): nothing. A sideways touchpad swipe is the browser's own back and
 *   forward, and the app never takes it (UI revamp, ticket 19).
 */

/** How close to the left edge (px) a finger must start to pull the shut menu open. */
export const EDGE_ZONE = 24;

/** How far (px) a finger moves before its direction is decided. */
const DIRECTION_SLOP = 8;

/** A pause (ms) between wheel steps longer than this ends one touchpad gesture. */
export const GESTURE_GAP_MS = 250;

export type FingerStart = {
  /** Where the finger touched, from the left of the window (px). */
  x: number;
  fingers: number;
  /** 1024 px wide or less, where the sidebar is a slide-out menu. */
  isNarrow: boolean;
  isDrawerOpen: boolean;
  startsOnSidebar: boolean;
  /** The finger landed on something that scrolls sideways, such as a wide table. */
  startsInSidewaysScroller: boolean;
  isDialogOpen: boolean;
};

/** Whether a finger touching down may start moving the slide-out menu. */
export function canStartFingerSwipe(start: FingerStart): boolean {
  const isOneFingerOnPhone = start.isNarrow && start.fingers === 1;
  if (!isOneFingerOnPhone || isLeftToOthers(start)) return false;
  return start.isDrawerOpen ? start.startsOnSidebar : start.x < EDGE_ZONE;
}

/** A wide table scrolls instead, and an open dialog keeps every gesture. */
function isLeftToOthers(start: FingerStart): boolean {
  return start.startsInSidewaysScroller || start.isDialogOpen;
}

export type FingerDirection = "undecided" | "sideways" | "upDown";

/** Which way a finger has moved so far; up-down leaves the page to scroll. */
export function fingerDirection(dx: number, dy: number): FingerDirection {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_SLOP) return "undecided";
  return Math.abs(dx) > Math.abs(dy) ? "sideways" : "upDown";
}

export type DrawerDrag = {
  /** The menu's full width (px). */
  width: number;
  wasOpen: boolean;
  /** How far the finger has moved sideways since it touched down (px; right is positive). */
  dx: number;
};

/** How much of the menu (px) is on screen while the finger moves it. */
export function drawerShownWidth({ width, wasOpen, dx }: DrawerDrag): number {
  const start = wasOpen ? width : 0;
  return Math.min(width, Math.max(0, start + dx));
}

/** Whether the menu ends up open when the finger lets go: past halfway it goes, else it snaps back. */
export function drawerOpensOnRelease(drag: DrawerDrag): boolean {
  return drawerShownWidth(drag) > drag.width / 2;
}
