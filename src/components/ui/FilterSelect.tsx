"use client";

import clsx from "clsx";
import type { ChangeEvent } from "react";

import { SET_CLASSES, setMark } from "./FilterField";
import { FilterPillMenu } from "./FilterPillMenu";
import type { SelectOption } from "./SelectField";
import { usePhoneWidth } from "./usePhoneWidth";

export type FilterSelectProps = {
  label: string;
  /** Show the label beside the select; otherwise its first option names it. */
  isLabelShown?: boolean;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** The filter narrows its list: outlined, so it is seen at a glance (ticket 06). */
  isSet?: boolean;
};

/**
 * A pill on a phone: a 44 tall target with a 36 tall rounded box drawn inside it, for a filter
 * that stands alone (Tasks). Above 640 it is invisible to the layout. A list's filter bar folds
 * its filters into a sheet on phones instead (`FilterBar`).
 */
const PILL_CLASSES =
  "max-phone:relative max-phone:isolate max-phone:inline-flex max-phone:min-h-control max-phone:shrink-0 max-phone:items-center max-phone:before:absolute max-phone:before:inset-x-0 max-phone:before:inset-y-1 max-phone:before:-z-1 max-phone:before:rounded-pill max-phone:before:border max-phone:before:border-rule-2 max-phone:before:bg-paper max-phone:has-[select:focus-visible]:before:border-accent max-phone:has-[select:focus-visible]:before:outline-3 max-phone:has-[select:focus-visible]:before:outline-tint";

/**
 * The select: a control above 640; on a phone the choice inside a pill, 44 tall to tap (design
 * system: Phones, filters).
 */
const SELECT_CLASSES =
  "min-h-control w-full min-w-0 rounded-control border border-rule-2 bg-paper text-input text-ink focus:border-accent phone:w-auto max-phone:w-auto max-phone:rounded-pill max-phone:border-transparent max-phone:bg-transparent max-phone:text-small max-phone:font-semibold max-phone:text-ink max-phone:focus-visible:outline-none";

/**
 * A list filter: a select named by its label, or by its first option when the label is hidden.
 * On a phone it is a small pill; with its label shown (a filter that stands alone), the name is
 * grey before the choice and the pill opens a menu (`FilterPillMenu`).
 */
export function FilterSelect(props: FilterSelectProps) {
  const isPhone = usePhoneWidth();
  if (isPhone) {
    const { label, isLabelShown = false, value, options, onChange } = props;
    return (
      <FilterPillMenu
        label={label}
        isLabelShown={isLabelShown}
        value={value}
        options={options}
        onChange={onChange}
      />
    );
  }
  return <SelectFilter {...props} />;
}

/** The filter as a select, above phone width. */
function SelectFilter({
  label,
  isLabelShown = false,
  value,
  options,
  onChange,
  isSet,
}: FilterSelectProps) {
  const select = (
    <select
      aria-label={isLabelShown ? undefined : label}
      // Sized to the chosen text, the arrow drawn inside (globals.css, "Filter boxes fit").
      data-filter=""
      {...setMark(isSet)}
      value={value}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => {
        onChange(event.target.value);
      }}
      className={clsx(SELECT_CLASSES, SET_CLASSES)}
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
