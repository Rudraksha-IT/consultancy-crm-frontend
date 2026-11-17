/**
 * Swiping the sidebar open and shut (design system, Gestures; issue 89). Pure rules only: the
 * shell's hook reads the events and the page, and these decide what happens.
 *
 * - Phones and tablets: one finger from the left edge pulls the slide-out menu open, a finger on
 *   the open menu pushes it shut; it follows the finger and settles on the nearer side.
 * - Laptops: one two-finger sideways swipe on the touchpad collapses the sidebar (left) or opens
 *   it (right), once per gesture. A mouse wheel never does (a best guess, so when unsure, nothing).
 */

import { isMouseNotch, isPixelOrLineStep, wheelPixels } from "./wheel";

/** How close to the left edge (px) a finger must start to pull the shut menu open. */
export const EDGE_ZONE = 24;

/** How far (px) a finger moves before its direction is decided. */
const DIRECTION_SLOP = 8;

/** How far (px) a touchpad gesture moves sideways before it switches the sidebar. */
export const TOUCHPAD_DISTANCE = 50;

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

/** One wheel event, with what the page knows when it arrives. */
export type WheelStep = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  /** Milliseconds, as on the event. */
  timeStamp: number;
  shiftKey: boolean;
  /** Set by browsers for pinch-to-zoom on a touchpad. */
  ctrlKey: boolean;
  isNarrow: boolean;
  startsInSidewaysScroller: boolean;
  isDialogOpen: boolean;
};

/** The touchpad gesture so far. */
export type TouchpadSwipe = {
  /** Sideways distance so far (px; to the left is positive, as wheel events report it). */
  total: number;
  lastAt: number;
  /** The sidebar has already been switched in this gesture. */
  isDone: boolean;
  /** The gesture is not for the sidebar (it began in a wide table, over a dialog, or a mouse). */
  isIgnored: boolean;
};

export const NO_TOUCHPAD_SWIPE: TouchpadSwipe = {
  total: 0,
  lastAt: Number.NEGATIVE_INFINITY,
  isDone: false,
  isIgnored: false,
};

export type TouchpadAnswer = {
  swipe: TouchpadSwipe;
  /** true: collapse to the icon strip; false: open it; null: leave it. */
  collapse: boolean | null;
  /** Stop the browser's own swipe back/forward for this step. */
  blocksBrowser: boolean;
};

function isSidewaysTouchpadStep(step: WheelStep): boolean {
  if (step.isNarrow || step.ctrlKey) return false;
  return Math.abs(step.deltaX) > Math.abs(step.deltaY);
}

function looksLikeMouseWheel(step: WheelStep): boolean {
  // Shift turns a mouse wheel sideways; a touchpad sends no Shift.
  return step.shiftKey || isMouseNotch(step.deltaX, step.deltaMode);
}

function isIgnoredGesture(step: WheelStep): boolean {
  const isPageStep = !isPixelOrLineStep(step.deltaMode);
  return (
    step.startsInSidewaysScroller || step.isDialogOpen || isPageStep || looksLikeMouseWheel(step)
  );
}

function continueGesture(swipe: TouchpadSwipe, step: WheelStep): TouchpadSwipe {
  if (step.timeStamp - swipe.lastAt <= GESTURE_GAP_MS) return { ...swipe, lastAt: step.timeStamp };
  return { total: 0, lastAt: step.timeStamp, isDone: false, isIgnored: isIgnoredGesture(step) };
}

/**
 * Reads one wheel step of a touchpad gesture. The gesture's first step decides whether it is for
 * the sidebar at all; once it has switched the sidebar, the rest of the gesture does nothing more.
 */
export function readTouchpadStep(swipe: TouchpadSwipe, step: WheelStep): TouchpadAnswer {
  if (!isSidewaysTouchpadStep(step)) return { swipe, collapse: null, blocksBrowser: false };
  const current = continueGesture(swipe, step);
  if (current.isIgnored) return { swipe: current, collapse: null, blocksBrowser: false };
  if (current.isDone) return { swipe: current, collapse: null, blocksBrowser: true };
  const total = current.total + wheelPixels(step.deltaX, step.deltaMode);
  const isDone = Math.abs(total) > TOUCHPAD_DISTANCE;
  return {
    swipe: { ...current, total, isDone },
    collapse: isDone ? total > 0 : null,
    blocksBrowser: true,
  };
}
