"use client";

import clsx from "clsx";
import type { ChangeEvent } from "react";

import { PILL_CLASSES } from "./FilterBar";
import type { SelectOption } from "./SelectField";

export type FilterSelectProps = {
  label: string;
  /** Show the label beside the select; otherwise its first option names it. */
  isLabelShown?: boolean;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
};

/**
 * The select: a control above 640; on a phone the choice inside a pill, 44 tall to tap (design
 * system: Phones, filters).
 */
const SELECT_CLASSES =
  "min-h-control w-full min-w-0 rounded-control border border-rule-2 bg-paper text-input text-ink focus:border-accent phone:w-auto max-phone:w-auto max-phone:rounded-pill max-phone:border-transparent max-phone:bg-transparent max-phone:text-small max-phone:font-semibold max-phone:text-ink max-phone:focus-visible:outline-none";

/**
 * A list filter: a select named by its label, or by its first option when the label is hidden.
 * Inside a `FilterBar` on a phone it is a small pill; with its label shown, the name is grey
 * before the choice.
 */
export function FilterSelect({
  label,
  isLabelShown = false,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  const select = (
    <select
      aria-label={isLabelShown ? undefined : label}
      // Sized to the chosen text, the arrow drawn inside (globals.css, "Filter boxes fit").
      data-filter=""
      value={value}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => {
        onChange(event.target.value);
      }}
      className={SELECT_CLASSES}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  if (!isLabelShown) {
    return (
      <span data-pill="" className={clsx("contents", PILL_CLASSES)}>
        {select}
      </span>
    );
  }
  return (
    <label
      data-pill=""
      className={clsx(
        PILL_CLASSES,
        "text-secondary text-ink-2 phone:w-auto flex w-full flex-wrap items-center gap-3 font-semibold",
        "max-phone:w-auto max-phone:flex-nowrap max-phone:gap-0 max-phone:pl-3.5 max-phone:text-small max-phone:font-medium max-phone:whitespace-nowrap max-phone:text-ink-3",
      )}
    >
      {label}
      {select}
    </label>
  );
}
