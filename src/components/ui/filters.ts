import type { SelectOption } from "./SelectField";

/** One filter of a list: a choice from a fixed list, whose first option means "any". */
export type ListFilter = {
  /** Tells the filters of one bar apart. */
  id: string;
  /** Names the filter ("Stage"): heard by screen readers, and shown above it in a sheet or panel. */
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** The order of the list: never counted as set, never cleared, and it has no chip. */
  isSort?: boolean;
  /** Under "More filters" on computers and tablets; a phone's sheet shows every filter. */
  isMore?: boolean;
};

/** The value that means "any": the first choice. */
function anyValue(filter: ListFilter): string {
  return filter.options[0]?.value ?? "";
}

/** A filter narrows the list when anything but its first choice is chosen; the order never does. */
export function isFilterSet(filter: ListFilter): boolean {
  return filter.isSort !== true && filter.value !== anyValue(filter);
}

/** The chosen choice in words ("Lead"), for a chip. */
export function chosenLabel(filter: ListFilter): string {
  return filter.options.find((option) => option.value === filter.value)?.label ?? filter.value;
}

/** Puts every filter that is set back to "any". */
export function clearFilters(filters: readonly ListFilter[]): void {
  for (const filter of filters) {
    if (isFilterSet(filter)) filter.onChange(anyValue(filter));
  }
}
