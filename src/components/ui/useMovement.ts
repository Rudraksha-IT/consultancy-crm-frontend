"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import {
  ARRIVAL_MS,
  changedRows,
  fadeIn,
  ghostOf,
  hasArrived,
  leave,
  markFor,
  MOVE,
  movesNow,
  placeIn,
  slideFrom,
  startOffset,
  type LeavingKind,
  type Place,
} from "@/lib/motion";

type ElementRef = RefObject<HTMLElement | null>;

/** The one marker inside a strip or menu: the underline, pill or shade of the chosen one. */
const MARKER = "[data-marker]";
/** A row of a list, wherever it is drawn. */
const ROWS = "tbody > tr, [data-row]";
/** A row is known by its words (the start of them is enough). */
const ROW_WORDS = 160;

/**
 * The marker of where you are slides from its old place to its new one when `chosen` changes
 * (design system: Movement). `holderRef` is on what holds the choices; the chosen one draws an
 * element marked `data-marker`. Nothing slides the first time, or while the marker is not shown.
 */
export function useMarkerSlide(holderRef: ElementRef, chosen: string): void {
  const last = useRef<Place | null>(null);
  useLayoutEffect(() => {
    const marker = holderRef.current?.querySelector(MARKER) ?? null;
    const now = markerPlace(holderRef.current, marker);
    const start = startOffset(last.current, now);
    last.current = now;
    if (start !== null && marker !== null) slideFrom(marker, start, MOVE.ms.marker);
  }, [holderRef, chosen]);
}

function markerPlace(holder: Element | null, marker: Element | null): Place | null {
  return holder === null || marker === null ? null : placeIn(holder, marker);
}

/**
 * What a tab or switch shows fades in when `chosen` changes; the strip and everything above it
 * stay still, and nothing fades the first time. `shown` names what to fade.
 */
export function useSwapFade(shown: () => readonly Element[], chosen: string): void {
  const last = useRef(chosen);
  const latest = useRef(shown);
  useEffect(() => {
    latest.current = shown;
  });
  useEffect(() => {
    if (last.current === chosen) return;
    last.current = chosen;
    latest.current().forEach(fadeIn);
  }, [chosen]);
}

/** What comes after a strip (or the bar that holds it): the content its choice shows. */
export function whatFollows(strip: Element | null): Element[] {
  const top = strip?.closest("[data-swap-bar]") ?? strip;
  const following: Element[] = [];
  for (let next = top?.nextElementSibling; next; next = next.nextElementSibling) {
    following.push(next);
  }
  return following;
}

/**
 * When what `ref` is on closes, a copy of it fades out where it stood while the page under it is
 * already usable; the copy is then taken away. `onLeft` hears about the copy before it is shown
 * and may keep it back (a dialog whose place another one takes only cross-fades).
 */
export function useLeaving(
  ref: ElementRef,
  kind: LeavingKind,
  shouldShow: () => boolean = always,
): void {
  useLayoutEffect(() => {
    const node = ref.current;
    return () => {
      if (node === null) return;
      const ghost = ghostOf(node, kind);
      if (ghost === null) return;
      // Still on the page a moment later: it never closed (React's double run while developing).
      queueMicrotask(() => {
        if (!node.isConnected && shouldShow()) leave(ghost);
      });
    };
  }, [ref, kind, shouldShow]);
}

function always(): boolean {
  return true;
}

/**
 * Marks the page as arriving (`data-arrive` on `ref`, for the stylesheet) when it first opens and
 * when another page opens, for as long as its blocks and rows take to come in. The same page
 * never arrives twice: a tab, a filter or any action on it leaves the mark alone.
 */
export function useArrival(ref: ElementRef, path: string): void {
  const last = useRef<string | null>(null);
  useLayoutEffect(() => {
    const page = ref.current;
    const isArriving = hasArrived(last.current, path);
    last.current = path;
    if (page === null || !isArriving || !movesNow()) return undefined;
    page.setAttribute("data-arrive", "");
    const timer = window.setTimeout(() => {
      page.removeAttribute("data-arrive");
    }, ARRIVAL_MS);
    return () => {
      window.clearTimeout(timer);
      page.removeAttribute("data-arrive");
    };
  }, [ref, path]);
}

function wordsOf(row: Element): string {
  return row.textContent.replace(/\s+/g, " ").trim().slice(0, ROW_WORDS);
}

/** The lists inside `page`, each with its rows in order. */
function listsIn(page: Element): Map<Element, HTMLElement[]> {
  const lists = new Map<Element, HTMLElement[]>();
  page.querySelectorAll<HTMLElement>(ROWS).forEach((row) => {
    const list = row.parentElement;
    if (list !== null) lists.set(list, [...(lists.get(list) ?? []), row]);
  });
  return lists;
}

/**
 * On the same page, a row that is new or changed fades in under a soft wash (design system:
 * Movement). Each time the page's content changes, every list is compared with how it was last
 * drawn; a list seen for the first time, one redrawn whole, or a page still arriving shows
 * nothing.
 */
export function useRowWash(ref: ElementRef): void {
  useEffect(() => {
    const page = ref.current;
    if (page === null || typeof MutationObserver === "undefined") return undefined;
    const drawn = new WeakMap<Element, string[]>();

    function look(): void {
      if (page === null) return;
      const isQuiet = !movesNow() || page.hasAttribute("data-arrive");
      listsIn(page).forEach((rows, list) => {
        const words = rows.map(wordsOf);
        const before = drawn.get(list);
        drawn.set(list, words);
        if (isQuiet || before === undefined) return;
        changedRows(before, words).forEach((index) => {
          const row = rows[index];
          if (row !== undefined) markFor(row, "move", "new", MOVE.ms.wash + 100);
        });
      });
    }

    look();
    const observer = new MutationObserver(look);
    observer.observe(page, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
    };
  }, [ref]);
}
