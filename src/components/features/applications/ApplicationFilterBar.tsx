"use client";

import { FilterBar } from "@/components/ui/FilterBar";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchBox } from "@/components/ui/SearchBox";
import { counsellorFilterOptions } from "@/components/features/students/counsellorFilter";
import type { SelectOption } from "@/components/ui/SelectField";
import {
  APPLICATION_LIST_TEXT as TEXT,
  APPLICATION_SORTS,
  APPLICATION_SORT_LABELS,
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  DEFAULT_APPLICATION_SORT,
  type ApplicationSort,
  type ApplicationStatus,
} from "@/constants/applications";
import { COUNTRIES, COUNTRY_LABELS, type Country } from "@/constants/students";
import type { ApplicationFilterChoices, CounsellorChoice } from "@/lib/api";
import type { ApplicationFilters } from "@/lib/applications";
import { formatIntake } from "@/lib/dates";

type ApplicationFilterBarProps = {
  /** What is typed in the search box (the list follows it once typing settles). */
  search: string;
  onSearch: (search: string) => void;
  filters: ApplicationFilters;
  onChange: (change: Partial<Omit<ApplicationFilters, "search">>) => void;
  choices: ApplicationFilterChoices;
  counsellors: readonly CounsellorChoice[];
  /** Admins and Counsellors can be assigned Students, so "My Students" means something. */
  canBeAssigned: boolean;
};

const COUNSELLOR_FILTER_LABELS = { any: TEXT.anyCounsellor, me: TEXT.myStudents };

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: TEXT.anyStatus },
  ...APPLICATION_STATUSES.map((status) => ({
    value: status,
    label: APPLICATION_STATUS_LABELS[status],
  })),
];

const SORT_OPTIONS: SelectOption[] = APPLICATION_SORTS.map((sort) => ({
  value: sort,
  label: APPLICATION_SORT_LABELS[sort],
}));

/** Search, then Status, Intake, intake year, country, counsellor and the order (spec 57a). */
export function ApplicationFilterBar(props: ApplicationFilterBarProps) {
  const { filters, onChange, choices } = props;
  return (
    <FilterBar
      label={TEXT.filters}
      search={
        <SearchBox
          label={TEXT.search}
          placeholder={TEXT.searchPlaceholder}
          value={props.search}
          onChange={props.onSearch}
        />
      }
    >
      <FilterSelect
        label={TEXT.status}
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(status) => {
          onChange({ status: toStatus(status) });
        }}
      />
      <FilterSelect
        label={TEXT.intake}
        value={filters.intake}
        options={[
          { value: "", label: TEXT.anyIntake },
          ...withCurrent(choices.intakes, filters.intake).map((intake) => ({
            value: intake,
            label: formatIntake(intake),
          })),
        ]}
        onChange={(intake) => {
          onChange({ intake });
        }}
      />
      <FilterSelect
        label={TEXT.year}
        value={filters.year}
        options={[
          { value: "", label: TEXT.anyYear },
          ...withCurrent(choices.years, filters.year).map((year) => ({ value: year, label: year })),
        ]}
        onChange={(year) => {
          onChange({ year });
        }}
      />
      <FilterSelect
        label={TEXT.country}
        value={filters.country}
        options={[{ value: "", label: TEXT.anyCountry }, ...countryOptions(choices.countries)]}
        onChange={(country) => {
          onChange({ country: toCountry(country) });
        }}
      />
      <FilterSelect
        label={TEXT.counsellor}
        value={filters.counsellor}
        options={counsellorFilterOptions(
          props.counsellors,
          props.canBeAssigned,
          COUNSELLOR_FILTER_LABELS,
        )}
        onChange={(counsellor) => {
          onChange({ counsellor });
        }}
      />
      <FilterSelect
        label={TEXT.sort}
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(sort) => {
          onChange({ sort: toSort(sort) });
        }}
      />
    </FilterBar>
  );
}

/** The choices, keeping the chosen one even before the choices have loaded. */
function withCurrent(values: readonly string[], current: string): string[] {
  return current === "" || values.includes(current) ? [...values] : [current, ...values];
}

function countryOptions(countries: readonly Country[]): SelectOption[] {
  return countries
    .map((country) => ({ value: country, label: COUNTRY_LABELS[country] }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function toStatus(value: string): ApplicationStatus | "" {
  return APPLICATION_STATUSES.find((status) => status === value) ?? "";
}

function toCountry(value: string): Country | "" {
  return COUNTRIES.find((country) => country === value) ?? "";
}

function toSort(value: string): ApplicationSort {
  return APPLICATION_SORTS.find((sort) => sort === value) ?? DEFAULT_APPLICATION_SORT;
}
