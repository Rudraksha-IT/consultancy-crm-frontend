/**
 * Swiping between pages (design system, Gestures; issue 90). Pure rules only: the shell's hook
 * reads the events and the page, and these decide what happens.
 *
 * Pulling past the top of a main sidebar page goes to the previous page in that person's sidebar,
 * and past the bottom to the next one. Nothing happens until the pull is let go, and it works only
 * on purpose: the page must already be resting at that end before the gesture starts, so a scroll
 * (or its momentum) that runs into the end never changes the page. A mouse wheel never pulls (a
 * best guess, so when unsure, nothing). There is no pull to reload.
 */

import { GESTURE_GAP_MS, fingerDirection, type FingerDirection } from "./sidebarSwipe";
import { isMouseNotch, isPixelOrLineStep, wheelPixels } from "./wheel";

/**
 * How far (px of pull) before letting go changes the page: 360 of touchpad scrolling or 480 of
 * finger travel, so an ordinary scroll never changes it (raised from 120 on 2026-11-16, and from
 * 200 on 2026-11-17 because pages still changed by mistake).
 */
export const PULL_DISTANCE = 360;

/** The furthest (px) the page moves, however far it is pulled. */
export const MAX_SHIFT = 300;

/** How long (ms) the page must rest at an end before a gesture there may pull (was 500). */
export const REST_MS = 800;

/** A finger pulls three quarters of its own movement (480 of travel to be ready). */
const FINGER_FACTOR = 0.75;

/** A touchpad pulls as far as it scrolls, so a short two-finger flick is never enough. */
const TOUCHPAD_FACTOR = 1;

/** Which end of the page is pulled: the top goes to the previous page, the bottom to the next. */
export type PageEdge = "top" | "bottom";

export type PagePull = { edge: PageEdge; distance: number };

export type SidebarPage = { href: string; label: string };

export type Neighbours<Page> = { previous: Page | null; next: Page | null };

function withoutTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * The pages before and after the open one in the person's own sidebar, or null when the open page
 * is not one of them (a detail page such as one Student, or an edit page).
 */
export function neighbourPages<Page extends SidebarPage>(
  pages: readonly Page[],
  pathname: string,
): Neighbours<Page> | null {
  const index = pages.findIndex((page) => page.href === withoutTrailingSlash(pathname));
  if (index === -1) return null;
  return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}

/** What the page knows when a gesture starts. */
export type PullContext = {
  isMainPage: boolean;
  isDialogOpen: boolean;
  /** A text box, select or other field has focus. */
  hasFocusedField: boolean;
  hasUnsavedChanges: boolean;
  isDrawerOpen: boolean;
  /** The gesture started inside a box of its own that scrolls up and down (a list in a panel). */
  startsInUpDownScroller: boolean;
};

/** Pulls are off while anything is being edited, and off detail pages. Filter bars don't count. */
export function canPullPages(context: PullContext): boolean {
  const isBusy = [
    context.isDialogOpen,
    context.hasFocusedField,
    context.hasUnsavedChanges,
    context.isDrawerOpen,
    context.startsInUpDownScroller,
  ].some(Boolean);
  return context.isMainPage && !isBusy;
}

export type ScrollPosition = {
  isAtTop: boolean;
  isAtBottom: boolean;
  /** Milliseconds since the page last scrolled. */
  msSinceScroll: number;
};

export type RestingEdges = { top: boolean; bottom: boolean };

const NO_EDGES: RestingEdges = { top: false, bottom: false };

/** The ends the page is resting at; both on a page too short to scroll, none just after a scroll. */
export function restingEdges(position: ScrollPosition): RestingEdges {
  if (position.msSinceScroll < REST_MS) return NO_EDGES;
  return { top: position.isAtTop, bottom: position.isAtBottom };
}

function hasEdge(edges: RestingEdges): boolean {
  return edges.top || edges.bottom;
}

/**
 * Once a gesture has pulled one end it keeps to it: on a short page (resting at both ends) going
 * back past the start cancels instead of pulling the other end, so one gesture changes one page.
 */
function keepToPulledEdge(edges: RestingEdges, pull: PagePull | null): RestingEdges {
  if (pull === null) return edges;
  return { top: pull.edge === "top", bottom: pull.edge === "bottom" };
}

/** One finger's pull, from where it touched down. */
export type FingerTrack = {
  startX: number;
  startY: number;
  edges: RestingEdges;
  direction: FingerDirection;
};

export type FingerPullStart = {
  x: number;
  y: number;
  fingers: number;
  position: ScrollPosition;
  canPull: boolean;
};

/** A finger may pull only when it touches down on a page already resting at an end. */
export function startFingerPull(start: FingerPullStart): FingerTrack | null {
  if (start.fingers !== 1 || !start.canPull) return null;
  const edges = restingEdges(start.position);
  if (!hasEdge(edges)) return null;
  return { startX: start.x, startY: start.y, edges, direction: "undecided" };
}

export type FingerMove = { track: FingerTrack | null; pull: PagePull | null };

/** The pull after the finger moves: no track once it turns out to be a sideways swipe. */
export function moveFingerPull(track: FingerTrack, x: number, y: number): FingerMove {
  const dy = y - track.startY;
  const direction =
    track.direction === "undecided" ? fingerDirection(x - track.startX, dy) : track.direction;
  if (direction === "sideways") return { track: null, pull: null };
  if (direction === "undecided") return { track, pull: null };
  const pull = pullFromEnd(track.edges, dy * FINGER_FACTOR);
  const moved = { ...track, direction, edges: keepToPulledEdge(track.edges, pull) };
  return { track: moved, pull };
}

/** Moving down (positive) pulls the top; moving up pulls the bottom; else no pull. */
function pullFromEnd(edges: RestingEdges, movement: number): PagePull | null {
  if (movement > 0 && edges.top) return { edge: "top", distance: movement };
  if (movement < 0 && edges.bottom) return { edge: "bottom", distance: -movement };
  return null;
}

/** One wheel event, with what the page knows when it arrives. */
export type PageWheelStep = {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  /** Milliseconds, as on the event. */
  timeStamp: number;
  /** Set by browsers for pinch-to-zoom on a touchpad. */
  ctrlKey: boolean;
  shiftKey: boolean;
  position: ScrollPosition;
  canPull: boolean;
};

/** The touchpad gesture so far: one burst of wheel steps with no long pause. */
export type WheelPull = {
  /** The ends the page was resting at when the burst began. */
  edges: RestingEdges;
  lastAt: number;
  /** The burst is not a pull: it looked like a mouse wheel, a pinch or Shift. */
  isIgnored: boolean;
  pull: PagePull | null;
};

export const NO_WHEEL_PULL: WheelPull = {
  edges: NO_EDGES,
  lastAt: Number.NEGATIVE_INFINITY,
  isIgnored: false,
  pull: null,
};

function isUpDown(step: PageWheelStep): boolean {
  return Math.abs(step.deltaY) > Math.abs(step.deltaX);
}

function isNotAPull(step: PageWheelStep): boolean {
  const isMouse = step.shiftKey || isMouseNotch(step.deltaY, step.deltaMode);
  return isMouse || step.ctrlKey || !isPixelOrLineStep(step.deltaMode);
}

function continueBurst(state: WheelPull, step: PageWheelStep): WheelPull {
  if (step.timeStamp - state.lastAt <= GESTURE_GAP_MS) return { ...state, lastAt: step.timeStamp };
  return { ...NO_WHEEL_PULL, edges: restingEdges(step.position), lastAt: step.timeStamp };
}

/** Grows the pull at the edge the burst began at while the page is still there. */
function grow(state: WheelPull, step: PageWheelStep): PagePull | null {
  const movement = -wheelPixels(step.deltaY, step.deltaMode) * TOUCHPAD_FACTOR;
  const added = isStillAtEnd(step.position, movement) ? pullFromEnd(state.edges, movement) : null;
  if (added === null) return null;
  return { edge: added.edge, distance: pulledSoFar(state.pull, added.edge) + added.distance };
}

/** Pulling the top needs the page still at its top, and the bottom at its bottom. */
function isStillAtEnd(position: ScrollPosition, movement: number): boolean {
  return movement > 0 ? position.isAtTop : position.isAtBottom;
}

function pulledSoFar(pull: PagePull | null, edge: PageEdge): number {
  return pull?.edge === edge ? pull.distance : 0;
}

/**
 * Reads one wheel step of a touchpad gesture. Only a burst that began with the page resting at an
 * end can pull, so momentum never does; pushing back cancels; sideways steps are the sidebar's.
 */
export function readPageWheelStep(state: WheelPull, step: PageWheelStep): WheelPull {
  const current = continueBurst(state, step);
  if (!isUpDown(step)) return current;
  const isIgnored = current.isIgnored || isNotAPull(step);
  if (isIgnored || !step.canPull) return { ...current, isIgnored, pull: null };
  const pull = grow(current, step);
  return { ...current, edges: keepToPulledEdge(current.edges, pull), pull };
}

/** How far (px) the page moves for a pull: a rubber band, easy at first and firmer further out. */
export function pullShift(distance: number): number {
  return MAX_SHIFT * (1 - Math.exp(-distance / MAX_SHIFT));
}

export type PullHint<Page> = {
  edge: PageEdge;
  /** Where letting go will go. */
  page: Page;
  isReady: boolean;
  /** How full the bar is, 0 to 1. */
  progress: number;
  /** How far (px) the page has moved. */
  shift: number;
};

/** What the gap shows for a pull, or null when that end has no page to go to. */
export function pullHint<Page>(
  pull: PagePull | null,
  neighbours: Neighbours<Page>,
): PullHint<Page> | null {
  if (pull === null) return null;
  const page = pull.edge === "top" ? neighbours.previous : neighbours.next;
  if (page === null) return null;
  return {
    edge: pull.edge,
    page,
    isReady: pull.distance >= PULL_DISTANCE,
    progress: Math.min(1, pull.distance / PULL_DISTANCE),
    shift: pullShift(pull.distance),
  };
}
