"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import {
  GESTURE_GAP_MS,
  NO_WHEEL_PULL,
  canPullPages,
  hasFocusedField,
  isDialogOpen,
  isInUpDownScroller,
  moveFingerPull,
  neighbourPages,
  pullHint,
  readPageWheelStep,
  startFingerPull,
  type FingerTrack,
  type Neighbours,
  type PageEdge,
  type PagePull,
  type PullHint,
  type ScrollPosition,
} from "@/lib/gestures";
import type { NavItem } from "@/lib/navigation";
import { hasUnsavedChanges } from "@/lib/unsavedChanges";

/** A touchpad pull is let go once its wheel steps stop for a little longer than one gesture's gap. */
const WHEEL_END_MS = GESTURE_GAP_MS + 10;

/** The old page slides away for this long before the new one opens; the new one slides in. */
const LEAVE_MS = 200;
const ENTER_MS = 300;

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Allowance (px) for rounding when deciding whether the page is scrolled to its bottom. */
const ROUNDING = 2;

/** How the page is moving: sliding away after a pull, or the new page sliding in. */
export type PageMove = "out-down" | "out-up" | "in-from-top" | "in-from-bottom";

export type PagePullView = {
  /** What the gap the pull opens says, and how far the page has moved; null when not pulled. */
  hint: PullHint<NavItem> | null;
  move: PageMove | null;
};

type PagePullOptions = {
  /** The person's own sidebar pages, in order. */
  pages: readonly NavItem[];
  pathname: string;
  isDrawerOpen: boolean;
  navigate: (href: string) => void;
};

/** A pull, on the page it was made on. */
type ShownPull = PagePull & { on: string };

/** The page left after a pull, from which end; the new page comes in from the same side. */
type Motion = { edge: PageEdge; from: string };

type Latest = {
  neighbours: Neighbours<NavItem> | null;
  isDrawerOpen: boolean;
  pathname: string;
  navigate: (href: string) => void;
  /** A page is sliding away or in: gestures wait until it is done. */
  isMoving: boolean;
};

/**
 * Swiping between pages (design system, Gestures; issue 90): pulling past the top or bottom of a
 * main sidebar page moves the page and, when let go far enough, opens the previous or next page in
 * the person's sidebar. Fingers and touchpads only; the sidebar links stay for everyone else.
 */
export function usePagePull(options: PagePullOptions): PagePullView {
  const { pages, pathname } = options;
  const neighbours = neighbourPages(pages, pathname);
  const [pull, setPull] = useState<ShownPull | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const isMoving = motion !== null;
  const latest = useRef<Latest>({ ...options, neighbours, isMoving });
  useEffect(() => {
    latest.current = { ...options, neighbours, isMoving };
  });
  const shownPull = useRef<ShownPull | null>(null);

  useArrival(motion, pathname, () => {
    setMotion(null);
    setPull(null);
  });
  useGestures(latest, shownPull, { setPull, setMotion });

  const isOnPullPage = pull !== null && pull.on === pathname && neighbours !== null;
  return {
    hint: isOnPullPage ? pullHint(pull, neighbours) : null,
    move: pageMove(motion, pathname),
  };
}

function pageMove(motion: Motion | null, pathname: string): PageMove | null {
  if (motion === null) return null;
  const isTop = motion.edge === "top";
  if (pathname === motion.from) return isTop ? "out-down" : "out-up";
  return isTop ? "in-from-top" : "in-from-bottom";
}

/** Once the new page has arrived and slid in, the move is over. */
function useArrival(motion: Motion | null, pathname: string, finish: () => void): void {
  const latestFinish = useRef(finish);
  useEffect(() => {
    latestFinish.current = finish;
  });
  const hasArrived = motion !== null && motion.from !== pathname;
  useEffect(() => {
    if (!hasArrived) return undefined;
    const timer = setTimeout(() => {
      latestFinish.current();
    }, ENTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [hasArrived]);
}

type Setters = {
  setPull: (pull: ShownPull | null) => void;
  setMotion: (motion: Motion) => void;
};

function scrollPosition(lastScrollAt: number): ScrollPosition {
  const bottom = document.documentElement.scrollHeight - ROUNDING;
  return {
    isAtTop: window.scrollY <= 0,
    isAtBottom: window.innerHeight + window.scrollY >= bottom,
    msSinceScroll: performance.now() - lastScrollAt,
  };
}

function mayPull(latest: Latest, target: EventTarget | null): boolean {
  return canPullPages({
    isMainPage: latest.neighbours !== null,
    isDialogOpen: isDialogOpen(),
    hasFocusedField: hasFocusedField(),
    hasUnsavedChanges: hasUnsavedChanges(),
    isDrawerOpen: latest.isDrawerOpen,
    startsInUpDownScroller: isInUpDownScroller(target),
  });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCE_MOTION_QUERY).matches;
}

function useGestures(
  latest: RefObject<Latest>,
  shownPull: RefObject<ShownPull | null>,
  setters: Setters,
): void {
  const { setPull, setMotion } = setters;
  useEffect(() => {
    let lastScrollAt = Number.NEGATIVE_INFINITY;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    function show(pull: PagePull | null): void {
      const shown = pull === null ? null : { ...pull, on: latest.current.pathname };
      shownPull.current = shown;
      setPull(shown);
    }

    function later(run: () => void, ms: number): ReturnType<typeof setTimeout> {
      const timer = setTimeout(() => {
        timers.delete(timer);
        run();
      }, ms);
      timers.add(timer);
      return timer;
    }

    /** Letting go: past the threshold the page slides away and the next one opens. */
    function release(): void {
      const { neighbours, navigate, pathname } = latest.current;
      const hint = neighbours === null ? null : pullHint(shownPull.current, neighbours);
      if (!hint?.isReady) {
        show(null);
        return;
      }
      if (prefersReducedMotion()) {
        show(null);
        navigate(hint.page.href);
        return;
      }
      setMotion({ edge: hint.edge, from: pathname });
      later(() => {
        navigate(hint.page.href);
      }, LEAVE_MS);
    }

    const handleScroll = (): void => {
      lastScrollAt = performance.now();
    };
    const finger = fingerHandlers({ latest, show, release, now: () => lastScrollAt });
    const wheel = wheelHandler({ latest, show, release, later, now: () => lastScrollAt });

    const passive = { passive: true };
    window.addEventListener("scroll", handleScroll, passive);
    window.addEventListener("wheel", wheel.handleWheel, passive);
    document.addEventListener("touchstart", finger.handleStart, passive);
    document.addEventListener("touchmove", finger.handleMove, passive);
    document.addEventListener("touchend", finger.handleEnd);
    document.addEventListener("touchcancel", finger.handleCancel);
    return () => {
      timers.forEach((timer) => {
        clearTimeout(timer);
      });
      wheel.stop();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", wheel.handleWheel);
      document.removeEventListener("touchstart", finger.handleStart);
      document.removeEventListener("touchmove", finger.handleMove);
      document.removeEventListener("touchend", finger.handleEnd);
      document.removeEventListener("touchcancel", finger.handleCancel);
    };
  }, [latest, shownPull, setPull, setMotion]);
}

type HandlerParts = {
  latest: RefObject<Latest>;
  show: (pull: PagePull | null) => void;
  release: () => void;
  /** When the page last scrolled (performance.now()). */
  now: () => number;
};

function fingerHandlers({ latest, show, release, now }: HandlerParts) {
  let track: FingerTrack | null = null;

  function move(touch: Touch | undefined): void {
    if (track === null || touch === undefined) return;
    const moved = moveFingerPull(track, touch.clientX, touch.clientY);
    track = moved.track;
    show(moved.pull);
  }

  return {
    handleStart: (event: TouchEvent): void => {
      const touch = event.touches[0];
      track =
        touch === undefined || latest.current.isMoving
          ? null
          : startFingerPull({
              x: touch.clientX,
              y: touch.clientY,
              fingers: event.touches.length,
              position: scrollPosition(now()),
              canPull: mayPull(latest.current, event.target),
            });
    },
    handleMove: (event: TouchEvent): void => {
      move(event.touches[0]);
    },
    /** Judged where the finger lifted: the browser may not have sent its last move. */
    handleEnd: (event: TouchEvent): void => {
      if (track === null) return;
      move(event.changedTouches[0]);
      track = null;
      release();
    },
    handleCancel: (): void => {
      track = null;
      show(null);
    },
  };
}

type WheelParts = HandlerParts & {
  later: (run: () => void, ms: number) => ReturnType<typeof setTimeout>;
};

function wheelHandler({ latest, show, release, later, now }: WheelParts) {
  let state = NO_WHEEL_PULL;
  let ending: ReturnType<typeof setTimeout> | undefined;

  function stop(): void {
    clearTimeout(ending);
  }

  return {
    stop,
    handleWheel: (event: WheelEvent): void => {
      if (latest.current.isMoving) return;
      const position = scrollPosition(now());
      // Away from both ends nothing can pull, so the page is not read for every scroll step.
      const isAtEnd = position.isAtTop || position.isAtBottom;
      state = readPageWheelStep(state, {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        timeStamp: event.timeStamp,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        position,
        canPull: isAtEnd && mayPull(latest.current, event.target),
      });
      show(state.pull);
      stop();
      if (state.pull !== null) ending = later(release, WHEEL_END_MS);
    },
  };
}
