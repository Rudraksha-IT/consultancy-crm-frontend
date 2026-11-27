"use client";

import { FilterBar, type ListFilter } from "@/components/ui/FilterBar";
import { SearchBox } from "@/components/ui/SearchBox";
import { EXPORT_TEXT } from "@/constants/exports";
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
  /** How many the list shows now ("3 applications"), for the phone's filter sheet. */
  resultText?: string | undefined;
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

/**
 * Search, Status, counsellor and the order on one line; Intake, intake year and country under
 * More filters, as on Students (spec 57a, list tidy-ups 03). The search counts as a filter that is
 * set, as on Visas (UI revamp ticket 25).
 */
export function ApplicationFilterBar(props: ApplicationFilterBarProps) {
  const { filters, onChange, choices } = props;
  const listFilters: ListFilter[] = [
    {
      id: "status",
      label: TEXT.status,
      value: filters.status,
      options: STATUS_OPTIONS,
      onChange: (status) => {
        onChange({ status: toStatus(status) });
      },
    },
    {
      id: "counsellor",
      label: TEXT.counsellor,
      value: filters.counsellor,
      options: counsellorFilterOptions(
        props.counsellors,
        props.canBeAssigned,
        COUNSELLOR_FILTER_LABELS,
      ),
      onChange: (counsellor) => {
        onChange({ counsellor });
      },
    },
    {
      id: "sort",
      label: TEXT.sort,
      value: filters.sort,
      options: SORT_OPTIONS,
      onChange: (sort) => {
        onChange({ sort: toSort(sort) });
      },
      isSort: true,
    },
    {
      id: "intake",
      label: TEXT.intake,
      value: filters.intake,
      options: [
        { value: "", label: TEXT.anyIntake },
        ...withCurrent(choices.intakes, filters.intake).map((intake) => ({
          value: intake,
          label: formatIntake(intake),
        })),
      ],
      onChange: (intake) => {
        onChange({ intake });
      },
      isMore: true,
    },
    {
      id: "year",
      label: TEXT.year,
      value: filters.year,
      options: [
        { value: "", label: TEXT.anyYear },
        ...withCurrent(choices.years, filters.year).map((year) => ({ value: year, label: year })),
      ],
      onChange: (year) => {
        onChange({ year });
      },
      isMore: true,
    },
    {
      id: "country",
      label: TEXT.country,
      value: filters.country,
      options: [{ value: "", label: TEXT.anyCountry }, ...countryOptions(choices.countries)],
      onChange: (country) => {
        onChange({ country: toCountry(country) });
      },
      isMore: true,
    },
  ];
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
      searchFilter={{
        label: EXPORT_TEXT.search,
        value: props.search,
        onClear: () => {
          props.onSearch("");
        },
      }}
      filters={listFilters}
      resultText={props.resultText}
    />
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
