"use client";

import clsx from "clsx";
import { useRef } from "react";

import { useChosenInView } from "./useChosenInView";

type SegmentedOption<Value extends string> = {
  value: Value;
  label: string;
  /** Something waiting there, shown as a number after the label; nothing for 0. */
  count?: number;
};

type SegmentedControlProps<Value extends string> = {
  /** Names the group for screen readers. */
  label: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  size?: "md" | "lg";
};

const CHOSEN = '[aria-pressed="true"]';

/**
 * Two to five choices that switch a view, such as Light/Dark or New/Returning visitor. On phones
 * the strip stays on one line, fills the width and scrolls sideways when the choices don't fit;
 * at every width the chosen one is kept in view (design system: Segmented control).
 */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: SegmentedControlProps<Value>) {
  const stripRef = useRef<HTMLDivElement>(null);
  useChosenInView(stripRef, value, CHOSEN);
  return (
    <div
      ref={stripRef}
      role="group"
      aria-label={label}
      data-strip=""
      className="rounded-control bg-fill-2 max-phone:flex max-phone:w-full max-phone:flex-nowrap max-phone:overflow-x-auto inline-flex flex-wrap gap-1 justify-self-start p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
          className={clsx(
            "rounded-control text-secondary text-ink-2 max-phone:grow max-phone:shrink-0 max-phone:px-3.5 cursor-pointer px-4.5 font-semibold whitespace-nowrap",
            "aria-pressed:bg-paper aria-pressed:text-ink aria-pressed:shadow-raise",
            size === "lg" ? "min-h-control-lg" : "min-h-control",
          )}
        >
          {option.label}
          {option.count !== undefined && option.count > 0 && (
            <>
              <span className="sr-only">{`, ${String(option.count)}`}</span>
              <span
                aria-hidden="true"
                className="rounded-pill bg-fill-2 text-small ml-2 inline-block min-w-6 px-2 text-center leading-6 tabular-nums"
              >
                {option.count}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
