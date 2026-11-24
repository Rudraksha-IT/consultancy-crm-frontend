"use client";

import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

import { buttonClasses } from "./buttonStyles";

/**
 * Where each filter row was left, sideways, by the bar's name and the row's place. Kept for the
 * page's life, so a row drawn again (a list loading again) comes back where the person left it.
 */
const keptScroll = new Map<string, number>();

/**
 * A pill on a phone: a 44 tall target with a 36 tall rounded box drawn inside it (design system:
 * Phones, filters). Above 640 it is invisible to the layout.
 */
export const PILL_CLASSES =
  "max-phone:relative max-phone:isolate max-phone:inline-flex max-phone:min-h-control max-phone:shrink-0 max-phone:items-center max-phone:before:absolute max-phone:before:inset-x-0 max-phone:before:inset-y-1 max-phone:before:-z-1 max-phone:before:rounded-pill max-phone:before:border max-phone:before:border-rule-2 max-phone:before:bg-paper max-phone:has-[select:focus-visible]:before:border-accent max-phone:has-[select:focus-visible]:before:outline-3 max-phone:has-[select:focus-visible]:before:outline-tint";

/** A filter row: one line that scrolls sideways on a phone; above 640, part of the bar's flow. */
const ROW_CLASSES =
  "max-phone:-mx-3 max-phone:flex max-phone:flex-nowrap max-phone:gap-2 max-phone:overflow-x-auto max-phone:px-3 max-phone:after:block max-phone:after:w-px max-phone:after:shrink-0";

type FilterBarProps = {
  /** Names the bar, and keeps each row's sideways position apart from other bars. */
  label: string;
  /** The search box, on its own line on a phone. */
  search?: ReactNode;
  /** The other filters: small pills in one row on a phone. */
  children: ReactNode;
  /** "More filters", once opened: a second row of pills, read as one box with the first. */
  more?: ReactNode;
  /** Closes "More filters": a press outside the filters, or Esc in them (list tidy-ups 18). */
  onMoreClose?: () => void;
};

/**
 * A list's filters above it. Above 640 the search and the filters share one row that wraps; on a
 * phone the search sits on its own line and the filters are pills in one row that slides
 * sideways and never wraps.
 */
export function FilterBar({ label, search, children, more, onMoreClose }: FilterBarProps) {
  const bar = useRef<HTMLDivElement>(null);
  useCloseOutside(bar, more === undefined ? undefined : onMoreClose);
  return (
    <div
      ref={bar}
      role="group"
      aria-label={label}
      className="border-rule border-b"
      onKeyDown={(event) => {
        if (event.key === "Escape" && more !== undefined) onMoreClose?.();
      }}
    >
      <div className="max-phone:grid max-phone:gap-2 max-phone:p-3 max-phone:pb-1 flex flex-wrap items-center gap-3 px-6 py-5">
        {search}
        <FilterRow storeKey={`${label}|0`} className="contents">
          {children}
        </FilterRow>
      </div>
      {more !== undefined && (
        <FilterRow
          storeKey={`${label}|1`}
          className="max-phone:mx-0 max-phone:pt-0 max-phone:pb-1 flex flex-wrap items-center gap-3 px-6 pb-5"
        >
          {more}
        </FilterRow>
      )}
    </div>
  );
}

/** While `onClose` is given, a press anywhere outside `area` calls it. */
function useCloseOutside(area: RefObject<HTMLElement | null>, onClose: (() => void) | undefined) {
  useEffect(() => {
    if (onClose === undefined) return undefined;
    const close = onClose;
    function onPress(event: PointerEvent) {
      if (event.target instanceof Node && area.current?.contains(event.target) !== true) close();
    }
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("pointerdown", onPress);
    };
  }, [area, onClose]);
}

type FilterRowProps = { storeKey: string; className: string; children: ReactNode };

function FilterRow({ storeKey, className, children }: FilterRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  // After every drawing, put the row back where it was left; a redraw never moves it.
  useLayoutEffect(() => {
    const row = ref.current;
    const kept = keptScroll.get(storeKey);
    if (row !== null && kept !== undefined && row.scrollLeft !== kept) row.scrollLeft = kept;
  });
  return (
    <div
      ref={ref}
      data-filter-row=""
      onScroll={(event) => {
        keptScroll.set(storeKey, event.currentTarget.scrollLeft);
      }}
      className={clsx(className, ROW_CLASSES)}
    >
      {children}
    </div>
  );
}

type MoreFiltersButtonProps = {
  onClick: () => void;
  children: ReactNode;
  /** How many of the other filters are set, shown while they are closed ("More filters · 2"). */
  setCount?: number;
};

/** Opens a list's other filters: a quiet button, and a dashed pill on a phone. */
export function MoreFiltersButton({ onClick, children, setCount = 0 }: MoreFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        buttonClasses("ghost", "md"),
        "max-phone:relative max-phone:isolate max-phone:shrink-0 max-phone:border-0 max-phone:px-3.5 max-phone:text-small max-phone:before:absolute max-phone:before:inset-x-0 max-phone:before:inset-y-1 max-phone:before:-z-1 max-phone:before:rounded-pill max-phone:before:border max-phone:before:border-dashed max-phone:before:border-rule-2",
      )}
    >
      {children}
      {setCount > 0 && ` · ${String(setCount)}`}
    </button>
  );
}
