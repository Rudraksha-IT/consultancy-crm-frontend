"use client";

import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef } from "react";

import { LABELS } from "@/constants/messages";

import { Button } from "./Button";
import { buttonClasses } from "./buttonStyles";
import { FilterField } from "./FilterField";
import { clearFilters, isFilterSet, type ListFilter } from "./filters";
import { Icon } from "./Icon";
import { useMenu } from "./useMenu";

/** The panel keeps at least this far from the screen's left edge, or opens the other way. */
const SCREEN_EDGE = 12;

/**
 * "More filters" on computers and tablets (ticket 06): a button that opens a small panel under
 * it, not a second row in the page. Each extra filter has its label above it; the list behind
 * follows each choice while the panel stays open. Clear resets only these filters. Done, Escape
 * or a press outside closes it, and the cursor goes back to the button.
 */
export function MoreFilters({ filters }: { filters: readonly ListFilter[] }) {
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const menu = useMenu(root, button);
  const { isOpen } = menu;
  const setCount = filters.filter(isFilterSet).length;

  // It opens to the left of its button; where that would leave the screen, to the right.
  useLayoutEffect(() => {
    const opened = panel.current;
    if (opened !== null && opened.getBoundingClientRect().left < SCREEN_EDGE) {
      opened.dataset.side = "right";
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) panel.current?.querySelector("select")?.focus();
  }, [isOpen]);

  // A press outside closes it like Done: the cursor goes back to the button it left.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isOpen && !isInControl(document.activeElement)) {
      button.current?.focus();
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  return (
    <span ref={root} className="relative inline-flex" onKeyDown={menu.handleKeyDown}>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={setCount > 0 ? LABELS.moreFiltersSet(setCount) : undefined}
        onClick={menu.toggle}
        className={clsx(
          buttonClasses("ghost", "md"),
          "aria-expanded:bg-fill aria-expanded:text-ink",
        )}
      >
        <Icon name="sliders" size="sm" />
        {LABELS.moreFilters}
        <SetCount count={setCount} />
      </button>
      {isOpen && (
        <div
          ref={panel}
          role="dialog"
          aria-label={LABELS.moreFilters}
          data-filter-panel=""
          className="rounded-panel border-sheet-rule bg-paper text-ink shadow-lift absolute top-full right-0 z-30 mt-2 w-80 border data-[side=right]:right-auto data-[side=right]:left-0"
        >
          <div className="p-gutter grid gap-3.5 pb-4">
            {filters.map((filter) => (
              <FilterField key={filter.id} filter={filter} />
            ))}
          </div>
          <footer className="border-rule flex items-center justify-between gap-2 border-t py-3 pr-3.5 pl-2.5">
            <Button
              variant="ghost"
              isDisabled={setCount === 0}
              onClick={() => {
                clearFilters(filters);
              }}
            >
              {LABELS.clear}
            </Button>
            <Button variant="primary" size="sm" onClick={menu.close}>
              {LABELS.filtersDone}
            </Button>
          </footer>
        </div>
      )}
    </span>
  );
}

/** How many filters are set, as a small filled number on a button; nothing while none is. */
export function SetCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden="true"
      className="rounded-pill bg-accent text-accent-ink text-tiny grid h-5 min-w-5 place-items-center px-1.5 font-semibold tabular-nums"
    >
      {count}
    </span>
  );
}

/** Whether the cursor is already in something the person chose to use (a field, a button). */
function isInControl(element: Element | null): boolean {
  return element !== null && element !== document.body;
}
