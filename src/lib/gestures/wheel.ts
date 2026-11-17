/** Wheel event units, shared by the touchpad gestures (issues 89 and 90). */

/** WheelEvent.deltaMode values. */
export const DELTA_PIXELS = 0;
export const DELTA_LINES = 1;

/** One line of a line-mode wheel step, in px (Firefox may send lines). */
const LINE_HEIGHT = 16;

/** A mouse wheel notch: one round step this big or bigger (px), or this many whole lines. */
const NOTCH_PIXELS = 100;
const NOTCH_LINES = 3;

/** Whether the step is in pixels or lines; page steps are rare and never a touchpad. */
export function isPixelOrLineStep(deltaMode: number): boolean {
  return deltaMode === DELTA_PIXELS || deltaMode === DELTA_LINES;
}

/**
 * Whether one wheel step looks like a mouse wheel notch rather than a touchpad: a touchpad sends
 * many small, often fractional steps. A best guess, so callers do nothing when it says yes.
 */
export function isMouseNotch(delta: number, deltaMode: number): boolean {
  const size = Math.abs(delta);
  if (!Number.isInteger(size)) return false;
  if (deltaMode === DELTA_PIXELS) return size >= NOTCH_PIXELS;
  return deltaMode === DELTA_LINES && size >= NOTCH_LINES;
}

/** A pixel or line step's distance in px. */
export function wheelPixels(delta: number, deltaMode: number): number {
  return deltaMode === DELTA_LINES ? delta * LINE_HEIGHT : delta;
}
