"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { useChosenInView } from "./useChosenInView";
import { useMarkerSlide, useSwapFade } from "./useMovement";

/** `count` is a number, or text such as "5/9". */
export type TabItem = { id: string; label: string; count?: number | string };

type TabsProps = {
  label: string;
  tabs: readonly TabItem[];
  selected: string;
  onSelect: (id: string) => void;
  /** The selected tab's content. */
  children: ReactNode;
};

const STEP_BY_KEY: Partial<Record<string, number>> = { ArrowRight: 1, ArrowLeft: -1 };

const CHOSEN = '[aria-selected="true"]';

/**
 * Sections of one record, such as a Student's profile. Arrow keys move between tabs. The row
 * scrolls sideways when the tabs don't fit, keeping the chosen tab in view.
 */
export function Tabs({ label, tabs, selected, onSelect, children }: TabsProps) {
  const baseId = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useChosenInView(stripRef, selected, CHOSEN);
  // The underline slides to the chosen tab and what it shows fades in; the strip stays still.
  useMarkerSlide(stripRef, selected);
  useSwapFade(() => (panelRef.current === null ? [] : [panelRef.current]), selected);
  const tabId = (id: string): string => `${baseId}-tab-${id}`;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = STEP_BY_KEY[event.key];
    if (step === undefined) return;
    const current = tabs.findIndex((tab) => tab.id === selected);
    const next = tabs[(current + step + tabs.length) % tabs.length];
    if (next === undefined) return;
    onSelect(next.id);
    document.getElementById(tabId(next.id))?.focus();
  }

  return (
    <div className="min-w-0">
      <div
        ref={stripRef}
        role="tablist"
        aria-label={label}
        data-strip=""
        onKeyDown={handleKeyDown}
        className="border-rule flex gap-5.5 overflow-x-auto border-b"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={tabId(tab.id)}
            type="button"
            role="tab"
            aria-selected={tab.id === selected}
            tabIndex={tab.id === selected ? 0 : -1}
            onClick={() => {
              onSelect(tab.id);
            }}
            className="min-h-control text-secondary text-ink-3 hover:text-ink max-phone:active:bg-fill aria-selected:text-ink relative -mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 border-transparent font-medium whitespace-nowrap"
          >
            {tab.count === undefined ? tab.label : `${tab.label} `}
            {tab.count !== undefined && (
              <span className="text-small text-ink-3 tabular-nums">{tab.count}</span>
            )}
            {tab.id === selected && <ChosenLine />}
          </button>
        ))}
      </div>
      <div
        ref={panelRef}
        role="tabpanel"
        aria-labelledby={tabId(selected)}
        className="grid gap-8 pt-6"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The accent line under the chosen tab or choice, drawn where the button's own (clear) bottom
 * border is. It is an element of its own so it can slide from the one chosen before (Movement).
 */
export function ChosenLine() {
  return (
    <span
      aria-hidden="true"
      data-marker=""
      className="bg-accent absolute inset-x-0 -bottom-0.5 h-0.5"
    />
  );
}
