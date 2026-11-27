"use client";

import { useEffect, useRef, type RefObject } from "react";

import {
  canStartFingerSwipe,
  drawerOpensOnRelease,
  drawerShownWidth,
  fingerDirection,
  isDialogOpen,
  isInSidewaysScroller,
  isNarrowScreen,
  type FingerDirection,
} from "@/lib/gestures";

import type { SidebarState } from "./useSidebar";

type LatestSidebar = RefObject<SidebarState>;
type MenuRef = RefObject<HTMLElement | null>;

/**
 * The gesture for the side menu (design system, Gestures; issue 89): a finger swipe opens and
 * closes the slide-out menu. It only presses the same switches as the buttons, which stay for the
 * keyboard and screen readers. The side menu above 1024px has nothing to collapse since the UI
 * revamp (ticket 05), so a touchpad swipe does nothing there.
 */
export function useSidebarSwipe(sidebar: SidebarState, menuRef: MenuRef): void {
  const latest = useRef(sidebar);
  useEffect(() => {
    latest.current = sidebar;
  });
  useFingerSwipe(latest, menuRef);
}

type Drag = {
  menu: HTMLElement;
  startX: number;
  startY: number;
  width: number;
  wasOpen: boolean;
  direction: FingerDirection;
  dx: number;
};

/** The menu follows the finger: no slide while it moves, and the dialog shadow on it. */
function showDrag(drag: Drag): void {
  const shown = drawerShownWidth(drag);
  drag.menu.dataset.dragging = "";
  drag.menu.style.translate = `${String(shown - drag.width)}px`;
}

/** Gives the menu back to its classes, which slide it to where it settles. */
function endDrag(drag: Drag): void {
  delete drag.menu.dataset.dragging;
  drag.menu.style.translate = "";
}

function startDrag(event: TouchEvent, menu: HTMLElement, isOpen: boolean): Drag | null {
  const touch = event.touches[0];
  if (touch === undefined) return null;
  const isAllowed = canStartFingerSwipe({
    x: touch.clientX,
    fingers: event.touches.length,
    isNarrow: isNarrowScreen(),
    isDrawerOpen: isOpen,
    startsOnSidebar: event.target instanceof Node && menu.contains(event.target),
    startsInSidewaysScroller: isInSidewaysScroller(event.target),
    isDialogOpen: isDialogOpen(),
  });
  if (!isAllowed) return null;
  const start = { startX: touch.clientX, startY: touch.clientY, dx: 0 };
  return { menu, ...start, width: menu.offsetWidth, wasOpen: isOpen, direction: "undecided" };
}

/** The drag after the finger moves, or null once it turns out to be scrolling up or down. */
function moveDrag(drag: Drag, touch: Touch): Drag | null {
  const dx = touch.clientX - drag.startX;
  const direction =
    drag.direction === "undecided"
      ? fingerDirection(dx, touch.clientY - drag.startY)
      : drag.direction;
  if (direction === "upDown") return null;
  const moved = { ...drag, dx, direction };
  if (direction === "sideways") showDrag(moved);
  return moved;
}

/**
 * Whether the menu is open once the finger lifts, judged where it lifted: the browser may not
 * have sent its last move. Anything but a sideways swipe leaves the menu as it was.
 */
function openAfterRelease(drag: Drag, lifted: Touch | undefined): boolean {
  const last = lifted === undefined ? drag : moveDrag(drag, lifted);
  if (last?.direction !== "sideways") return drag.wasOpen;
  return drawerOpensOnRelease(last);
}

function useFingerSwipe(latest: LatestSidebar, menuRef: MenuRef): void {
  useEffect(() => {
    let drag: Drag | null = null;

    function handleStart(event: TouchEvent): void {
      const menu = menuRef.current;
      drag = menu === null ? null : startDrag(event, menu, latest.current.isDrawerOpen);
    }
    function handleMove(event: TouchEvent): void {
      const touch = event.touches[0];
      if (drag === null || touch === undefined) return;
      drag = moveDrag(drag, touch);
    }
    function handleEnd(event: TouchEvent): void {
      if (drag === null) return;
      const isOpen = openAfterRelease(drag, event.changedTouches[0]);
      endDrag(drag);
      if (isOpen !== drag.wasOpen) setDrawer(latest.current, isOpen);
      drag = null;
    }
    function handleCancel(): void {
      if (drag !== null) endDrag(drag);
      drag = null;
    }

    const passive = { passive: true };
    document.addEventListener("touchstart", handleStart, passive);
    document.addEventListener("touchmove", handleMove, passive);
    document.addEventListener("touchend", handleEnd);
    document.addEventListener("touchcancel", handleCancel);
    return () => {
      document.removeEventListener("touchstart", handleStart);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
      document.removeEventListener("touchcancel", handleCancel);
    };
  }, [latest, menuRef]);
}

function setDrawer(sidebar: SidebarState, isOpen: boolean): void {
  if (isOpen) sidebar.openDrawer();
  else sidebar.closeDrawer();
}
