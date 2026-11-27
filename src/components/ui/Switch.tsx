"use client";

import { useId } from "react";

type SwitchProps = {
  label: string;
  /** One line under the label saying what switching it on gives. */
  description?: string;
  isOn: boolean;
  onChange: (isOn: boolean) => void;
};

/** An on/off switch with its label; the whole row is the touch target. */
export function Switch({ label, description, isOn, onChange }: SwitchProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <label className="min-h-control flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="grid gap-0.5">
        <span id={labelId} className="text-body font-medium">
          {label}
        </span>
        {description !== undefined && (
          <span id={descriptionId} className="text-small text-ink-3">
            {description}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={isOn}
        aria-labelledby={labelId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="rounded-pill bg-rule-2 peer-checked:bg-accent peer-focus-visible:outline-accent after:rounded-pill after:bg-paper after:shadow-raise relative h-6.5 w-11 flex-none transition-colors peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid after:absolute after:top-0.75 after:left-0.75 after:size-5 after:transition-transform peer-checked:after:translate-x-4.5"
      />
    </label>
  );
}
