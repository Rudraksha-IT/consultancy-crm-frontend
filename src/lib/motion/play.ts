/**
 * Movement that code starts itself (design system: Movement; UI revamp, ticket 22): it reads the
 * page and the device, asks the rules, and moves one thing. Everything here does nothing when
 * the device asks for less motion.
 */
import { canMove, type Place, type StartOffset } from "./rules";
import { MOVE } from "./timing";

const LESS_MOTION = "(prefers-reduced-motion: reduce)";
const LEAVING_ID = "leaving";
/** A copy is taken away a little after its fade has ended. */
const GHOST_MS = MOVE.ms.sink + 60;
/** What a copy must not keep: nothing a script, a label or a screen reader could find. */
const NOT_COPIED = /^(?:id|name|for|role|tabindex|data-move|data-print|aria-.*)$/;

/** Whether anything may move right now, on this device. */
export function movesNow(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return canMove({
    reducesMotion: window.matchMedia(LESS_MOTION).matches,
    canAnimate: typeof Element.prototype.animate === "function",
  });
}

/** Where `element` is drawn inside `holder`, wherever either has been scrolled to. */
export function placeIn(holder: Element, element: Element): Place {
  const outer = holder.getBoundingClientRect();
  const inner = element.getBoundingClientRect();
  return {
    left: inner.left - outer.left + holder.scrollLeft,
    top: inner.top - outer.top + holder.scrollTop,
    width: inner.width,
  };
}

/** Slides `element` to where it is now from where it was (`start`). */
export function slideFrom(element: Element, start: StartOffset, ms: number): void {
  if (!movesNow()) return;
  const { dx, dy, scaleX } = start;
  const from = `translate(${String(dx)}px, ${String(dy)}px) scaleX(${String(scaleX)})`;
  element.animate([{ transform: from }, { transform: "none" }], {
    duration: ms,
    easing: MOVE.arrive,
  });
}

/** Fades in what a tab or switch now shows; nothing else about it moves. */
export function fadeIn(element: Element): void {
  if (!movesNow()) return;
  element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOVE.ms.swap, easing: "ease-out" });
}

/** Marks `element` for a while (`data-<name>`), for a rule in the stylesheet, then clears it. */
export function markFor(element: HTMLElement, name: string, value: string, ms: number): void {
  if (!movesNow()) return;
  element.setAttribute(`data-${name}`, value);
  window.setTimeout(() => {
    if (element.getAttribute(`data-${name}`) === value) element.removeAttribute(`data-${name}`);
  }, ms);
}

export type LeavingKind = "dialog" | "pop" | "toast";

/** The layer for what is on its way out: over everything, never touched, heard or focused. */
function leavingLayer(): HTMLElement {
  const found = document.getElementById(LEAVING_ID);
  if (found !== null) return found;
  const layer = document.createElement("div");
  layer.id = LEAVING_ID;
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  return document.body.appendChild(layer);
}

function uncopy(element: Element): void {
  [...element.attributes]
    .filter((attribute) => NOT_COPIED.test(attribute.name))
    .forEach((attribute) => {
      element.removeAttribute(attribute.name);
    });
}

/**
 * A copy of something that is about to close, pinned where it stands, or null when nothing
 * moves. Take it while the thing is still on the page, then `leave()` it once it has gone.
 */
export function ghostOf(node: HTMLElement, kind: LeavingKind): HTMLElement | null {
  if (!movesNow()) return null;
  const at = node.getBoundingClientRect();
  if (at.width === 0) return null;
  const ghost = node.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) return null;
  [ghost, ...ghost.querySelectorAll("*")].forEach(uncopy);
  ghost.dataset.leaving = kind;
  Object.assign(ghost.style, {
    position: "fixed",
    inset: `${String(at.top)}px auto auto ${String(at.left)}px`,
    width: `${String(at.width)}px`,
    height: `${String(at.height)}px`,
    margin: "0",
  });
  return ghost;
}

/** Shows the copy fading out, then takes it (and the empty layer) away: nothing is left behind. */
export function leave(ghost: HTMLElement): void {
  const layer = leavingLayer();
  layer.appendChild(ghost);
  window.setTimeout(() => {
    ghost.remove();
    if (layer.childElementCount === 0) layer.remove();
  }, GHOST_MS);
}

/** Light or dark: one cross-fade of the whole screen where the browser can, else at once. */
export function crossFade(update: () => void): void {
  if (!movesNow() || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  const root = document.documentElement;
  const done = (): void => {
    root.removeAttribute("data-theme-fade");
  };
  root.setAttribute("data-theme-fade", "");
  document.startViewTransition(update).finished.then(done, done);
}
