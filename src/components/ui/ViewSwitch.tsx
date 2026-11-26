"use client";

import { useRef } from "react";

import { Icon, type IconName } from "./Icon";
import { useMarkerSlide, useSwapFade, whatFollows } from "./useMovement";

type ViewOption<Value extends string> = {
  value: Value;
  label: string;
  icon: IconName;
};

type ViewSwitchProps<Value extends string> = {
  /** Names the group for screen readers ("Show Students as"). */
  label: string;
  options: readonly ViewOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

/**
 * Two ways to see the same things (Board or List, Calendar or List): a small pill with an icon
 * and a word for each, the chosen one raised. Each is 44 tall to tap.
 */
export function ViewSwitch<Value extends string>({
  label,
  options,
  value,
  onChange,
}: ViewSwitchProps<Value>) {
  const groupRef = useRef<HTMLDivElement>(null);
  // The raised pill slides to the choice and what the switch shows fades in (Movement).
  useMarkerSlide(groupRef, value);
  useSwapFade(() => whatFollows(groupRef.current), value);
  return (
    <div
      ref={groupRef}
      role="group"
      aria-label={label}
      className="rounded-pill bg-fill inline-flex flex-none gap-0.5 p-0.75"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
          className="rounded-pill text-button-sm text-ink-2 hover:text-ink aria-pressed:text-ink min-h-control relative z-0 inline-flex cursor-pointer items-center gap-1.5 px-3.5 font-medium"
        >
          {option.value === value && (
            <span
              aria-hidden="true"
              data-marker=""
              className="rounded-pill bg-paper shadow-raise absolute inset-0 -z-10"
            />
          )}
          <Icon name={option.icon} size="sm" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
