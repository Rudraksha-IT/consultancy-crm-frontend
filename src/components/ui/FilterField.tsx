"use client";

import clsx from "clsx";
import type { ChangeEvent } from "react";

import { CONTROL_CLASSES } from "./Field";
import { isFilterSet, type ListFilter } from "./filters";

/**
 * A filter that is set stands out: an accent outline and a light accent fill (ticket 06). The
 * select carries `data-set`.
 */
export const SET_CLASSES =
  "data-set:border-accent data-set:ring-1 data-set:ring-inset data-set:ring-accent data-set:bg-tint/55";

/** The mark on a filter's select while the filter is set (`SET_CLASSES` draw it). */
export function setMark(isSet: boolean | undefined): { "data-set"?: "" } {
  return isSet === true ? { "data-set": "" } : {};
}

/**
 * A filter with its label above it, as wide as what holds it: a row of the phone's filter sheet
 * (48 tall, 16 text) or of the "More filters" panel.
 */
export function FilterField({ filter }: { filter: ListFilter }) {
  return (
    <label className="text-small text-ink-2 grid min-w-0 gap-1.5 font-medium">
      {filter.label}
      <select
        value={filter.value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          filter.onChange(event.target.value);
        }}
        {...setMark(isFilterSet(filter))}
        className={clsx(CONTROL_CLASSES, SET_CLASSES, "font-normal")}
      >
        {filter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
