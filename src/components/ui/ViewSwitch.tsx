"use client";

import { Icon, type IconName } from "./Icon";

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
  return (
    <div
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
          className="rounded-pill text-button-sm text-ink-2 hover:text-ink aria-pressed:bg-paper aria-pressed:text-ink aria-pressed:shadow-raise min-h-control inline-flex cursor-pointer items-center gap-1.5 px-3.5 font-medium"
        >
          <Icon name={option.icon} size="sm" />
          {option.label}
        </button>
      ))}
    </div>
  );
}
