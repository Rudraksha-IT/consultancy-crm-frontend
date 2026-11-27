/** The least a box that fills the window is tall, however short the window (prototype: 380). */
export const FIT_LEAST_PX = 380;

/**
 * The room left between the box and the bottom of the window, or the phone tab bar: 24, so the
 * sheet clearly ends above the edge of the screen (owner, 2026-11-27; was 16).
 */
export const FIT_GAP_PX = 24;

type FitMeasures = {
  /** The window's inner height. */
  windowHeight: number;
  /** Where the box starts, from the top of the page (not of the window). */
  top: number;
  /** The phone tab bar's height; 0 where there is none. */
  tabBarHeight: number;
};

/**
 * How tall a box is so that it reaches the bottom of the window, above the phone tab bar (UI
 * revamp 14, the Inbox): what is left under its top, less a small gap, in whole pixels, and
 * never under its least height.
 */
export function fitHeight({ windowHeight, top, tabBarHeight }: FitMeasures): number {
  const room = Math.floor(windowHeight - top - tabBarHeight - FIT_GAP_PX);
  return Number.isFinite(room) ? Math.max(FIT_LEAST_PX, room) : FIT_LEAST_PX;
}
