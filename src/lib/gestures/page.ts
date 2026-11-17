/** What the gesture rules need to know about the page, read from the DOM. */

/** 1024 px and below: the sidebar is a slide-out menu (the `wide` breakpoint starts above it). */
export const NARROW_SCREEN_QUERY = "(width < 64.0625rem)";

/** Allowance (px) for rounding before an element counts as wider than its box. */
const ROUNDING = 2;
const SCROLLS = /auto|scroll/;

/** Things that take typing or a choice; a ticked box or a button does not. */
const FIELD = [
  "input:not([type=checkbox], [type=radio], [type=button], [type=submit], [type=reset])",
  "textarea",
  "select",
  '[contenteditable]:not([contenteditable="false"])',
].join(", ");

export function isNarrowScreen(): boolean {
  return window.matchMedia(NARROW_SCREEN_QUERY).matches;
}

function scrollsSideways(element: Element): boolean {
  if (element.scrollWidth <= element.clientWidth + ROUNDING) return false;
  return SCROLLS.test(window.getComputedStyle(element).overflowX);
}

/** Whether `target` sits inside something that scrolls sideways, such as a wide table. */
export function isInSidewaysScroller(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;
  while (element !== null && element !== document.body) {
    if (scrollsSideways(element)) return true;
    element = element.parentElement;
  }
  return false;
}

/** Whether a dialog is open over the page. */
export function isDialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

function scrollsUpAndDown(element: Element): boolean {
  if (element.scrollHeight <= element.clientHeight + ROUNDING) return false;
  return SCROLLS.test(window.getComputedStyle(element).overflowY);
}

/** The page's own scrolling, which the pull gestures read separately. */
function isPageItself(element: Element): boolean {
  return element === document.body || element === document.documentElement;
}

/** Whether `target` sits inside a box of its own that scrolls up and down (not the page itself). */
export function isInUpDownScroller(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;
  while (element !== null && !isPageItself(element)) {
    if (scrollsUpAndDown(element)) return true;
    element = element.parentElement;
  }
  return false;
}

/** Whether a field that takes typing or a choice has focus. */
export function hasFocusedField(): boolean {
  const focused = document.activeElement;
  return focused instanceof HTMLElement && focused.matches(FIELD);
}
