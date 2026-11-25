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
      className="border-rule max-phone:flex max-phone:w-full max-phone:flex-nowrap max-phone:overflow-x-auto inline-flex gap-4.5 justify-self-start border-b"
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
            "text-secondary text-ink-3 hover:text-ink max-phone:shrink-0 -mb-px cursor-pointer border-b-2 border-transparent font-medium whitespace-nowrap",
            "aria-pressed:border-accent aria-pressed:text-ink",
            size === "lg" ? "min-h-control-lg" : "min-h-control",
          )}
        >
          {option.label}
          {option.count !== undefined && option.count > 0 && (
            <>
              <span className="sr-only">{`, ${String(option.count)}`}</span>
              <span
                aria-hidden="true"
                className="text-small text-ink-3 ml-1.5 inline-block tabular-nums"
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
