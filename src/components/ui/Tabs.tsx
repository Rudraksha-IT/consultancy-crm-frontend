"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { useChosenInView } from "./useChosenInView";

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
  useChosenInView(stripRef, selected, CHOSEN);
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
        className="border-rule flex gap-2 overflow-x-auto border-b-2"
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
            className="min-h-control-lg text-body text-ink-2 hover:text-ink max-phone:active:bg-fill aria-selected:border-accent aria-selected:text-accent -mb-0.5 inline-flex cursor-pointer items-center gap-2.5 border-b-3 border-transparent px-4 font-semibold whitespace-nowrap"
          >
            {tab.count === undefined ? tab.label : `${tab.label} `}
            {tab.count !== undefined && (
              <span className="rounded-pill bg-fill-2 text-small px-2">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-labelledby={tabId(selected)} className="grid gap-8 pt-6">
        {children}
      </div>
    </div>
  );
}
