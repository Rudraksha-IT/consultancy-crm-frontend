"use client";

import clsx from "clsx";
import { useContext, useRef, useState, type ReactNode, type RefObject } from "react";

import { LABELS } from "@/constants/messages";

import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { FilterField } from "./FilterField";
import {
  chosenLabel,
  clearFilters,
  isFilterSet,
  searchAsFilter,
  type ListFilter,
  type SearchFilter,
} from "./filters";
import { FilterSelect } from "./FilterSelect";
import { Icon } from "./Icon";
import { MoreFilters, SetCount } from "./MoreFilters";
import { ToastContext } from "./toastContext";
import { usePhoneWidth } from "./usePhoneWidth";

export type { ListFilter } from "./filters";

type FilterBarProps = {
  /** Names the bar for screen readers ("Filter Students"). */
  label: string;
  /** The search box, first in the bar. */
  search?: ReactNode;
  /**
   * Given where the search counts as a filter that is set: it is counted, it has a chip on a
   * phone, and clearing the filters empties it. It is never drawn as a choice.
   */
  searchFilter?: SearchFilter | undefined;
  /** Every filter of the list, in the order they are shown. */
  filters: readonly ListFilter[];
  /** What the list shows now, from its own count ("3 Students"); left out while it loads. */
  resultText?: string | undefined;
};

/**
 * A list's filters above it (ticket 06). On computers and tablets the search and the filters
 * share one row that wraps: a filter that is set is outlined, the extra ones open in a small
 * panel under "More filters", and "Clear filters" ends the bar once anything is set. On a phone
 * they fold behind one button beside the search and open as a sheet from the bottom, and the
 * ones that are set stay in view as chips.
 */
export function FilterBar(props: FilterBarProps) {
  const isPhone = usePhoneWidth();
  return (
    <div role="group" aria-label={props.label} className="border-rule border-b">
      {isPhone ? <PhoneFilters {...props} /> : <WideFilters {...props} />}
    </div>
  );
}

/** Says "Filters cleared" where the page can (it is left out where there is no toast). */
function useClear(): (filters: readonly ListFilter[]) => void {
  const toast = useContext(ToastContext);
  return (filters) => {
    clearFilters(filters);
    toast?.showToast(LABELS.filtersCleared);
  };
}

/** Everything that can be set and cleared: the search, where it counts, then the filters. */
function countedFilters({ searchFilter, filters }: FilterBarProps): readonly ListFilter[] {
  return searchFilter === undefined ? filters : [searchAsFilter(searchFilter), ...filters];
}

function WideFilters(props: FilterBarProps) {
  const { search, filters } = props;
  const row = useRef<HTMLDivElement>(null);
  const clear = useClear();
  const counted = countedFilters(props);
  const more = filters.filter((filter) => filter.isMore === true);
  return (
    <div ref={row} className="px-gutter flex flex-wrap items-center gap-3 py-5">
      {search}
      {filters
        .filter((filter) => filter.isMore !== true)
        .map((filter) => (
          <FilterSelect
            key={filter.id}
            label={filter.label}
            value={filter.value}
            options={filter.options}
            onChange={filter.onChange}
            isSet={isFilterSet(filter)}
          />
        ))}
      {more.length > 0 && <MoreFilters filters={more} />}
      {counted.some(isFilterSet) && (
        <button
          type="button"
          onClick={() => {
            clear(counted);
            // The button goes with the last filter, so the cursor moves to the bar's first control.
            row.current?.querySelector<HTMLElement>("input, select")?.focus();
          }}
          className="text-accent text-button hover:bg-fill rounded-control min-h-control px-button inline-flex cursor-pointer items-center gap-2 font-medium whitespace-nowrap"
        >
          <Icon name="x" size="sm" />
          {LABELS.clearFilters}
        </button>
      )}
    </div>
  );
}

function PhoneFilters(props: FilterBarProps) {
  const { search, filters, resultText } = props;
  const [isOpen, setIsOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const clear = useClear();
  const counted = countedFilters(props);
  const set = counted.filter(isFilterSet);
  const close = (): void => {
    setIsOpen(false);
  };
  return (
    <div className="px-gutter grid gap-1 py-3">
      <div className="flex items-center justify-end gap-2">
        {search !== undefined && <div className="min-w-0 flex-1">{search}</div>}
        <FilterButton
          ref={button}
          setCount={set.length}
          hasWord={search === undefined}
          isOpen={isOpen}
          onClick={() => {
            setIsOpen(true);
          }}
        />
      </div>
      {set.length > 0 && (
        <FilterChips
          set={set}
          onClear={() => {
            clear(counted);
          }}
          button={button}
        />
      )}
      <Dialog
        isOpen={isOpen}
        title={LABELS.filters}
        onClose={close}
        footer={
          <>
            <Button
              variant="ghost"
              isDisabled={set.length === 0}
              onClick={() => {
                clear(counted);
              }}
            >
              {LABELS.clearAll}
            </Button>
            <Button variant="primary" onClick={close}>
              {resultText === undefined ? LABELS.filtersDone : LABELS.showResult(resultText)}
            </Button>
          </>
        }
      >
        <div className="grid gap-3.5">
          {filters.map((filter) => (
            <FilterField key={filter.id} filter={filter} />
          ))}
        </div>
      </Dialog>
    </div>
  );
}

type FilterButtonProps = {
  ref: RefObject<HTMLButtonElement | null>;
  setCount: number;
  /** With no search beside it, the button says "Filters"; beside a search it is the icon alone. */
  hasWord: boolean;
  isOpen: boolean;
  onClick: () => void;
};

/** Opens the phone's filter sheet; it carries how many filters are set. */
function FilterButton({ ref, setCount, hasWord, isOpen, onClick }: FilterButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={filterButtonName(setCount)}
      onClick={onClick}
      className={clsx(
        "rounded-menu border-rule bg-paper text-ink-2 text-button-sm active:bg-fill relative inline-flex flex-none cursor-pointer items-center justify-center gap-1.5 border font-medium",
        hasWord ? "min-h-control px-3.5" : "size-control",
      )}
    >
      {hasWord ? <Icon name="sliders" size="sm" /> : <Icon name="sliders" />}
      {hasWord && LABELS.filters}
      {/* Beside the word, or on the corner of the icon alone. */}
      <span className={hasWord ? "contents" : "absolute -top-1.5 -right-1.5"}>
        <SetCount count={setCount} />
      </span>
    </button>
  );
}

function filterButtonName(setCount: number): string {
  return setCount > 0 ? LABELS.filtersSet(setCount) : LABELS.filters;
}

type FilterChipsProps = {
  set: readonly ListFilter[];
  onClear: () => void;
  /** The filter button: a chip that is tapped is gone, so the cursor goes there. */
  button: RefObject<HTMLButtonElement | null>;
};

/**
 * The filters that are set, in view under the search while the sheet is closed: one tap on a chip
 * removes its filter (44 tall to tap, a 30 pill drawn inside). One row that slides sideways.
 */
function FilterChips({ set, onClear, button }: FilterChipsProps) {
  return (
    <div
      role="group"
      aria-label={LABELS.setFilters}
      className="-mb-2 flex gap-x-1.5 overflow-x-auto"
    >
      {set.map((filter) => {
        const chosen = chosenLabel(filter);
        return (
          <button
            key={filter.id}
            type="button"
            aria-label={LABELS.removeFilter(filter.label, chosen)}
            onClick={() => {
              clearFilters([filter]);
              button.current?.focus();
            }}
            className="text-accent group min-h-control inline-flex flex-none cursor-pointer items-center"
          >
            <span className="rounded-pill bg-tint text-secondary group-active:bg-fill-2 inline-flex min-h-7.5 items-center gap-1 pr-2 pl-3 font-semibold whitespace-nowrap">
              {chosen}
              <Icon name="x" size="sm" />
            </span>
          </button>
        );
      })}
      {set.length > 1 && (
        <button
          type="button"
          onClick={() => {
            onClear();
            button.current?.focus();
          }}
          className="text-ink-2 text-secondary min-h-control flex-none cursor-pointer px-1.5 font-medium whitespace-nowrap underline underline-offset-4"
        >
          {LABELS.clearAll}
        </button>
      )}
    </div>
  );
}
