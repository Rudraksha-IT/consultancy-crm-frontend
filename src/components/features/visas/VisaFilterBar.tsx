"use client";

import { FilterBar, type ListFilter } from "@/components/ui/FilterBar";
import { SearchBox } from "@/components/ui/SearchBox";
import { counsellorFilterOptions } from "@/components/features/students/counsellorFilter";
import type { SelectOption } from "@/components/ui/SelectField";
import { EXPORT_TEXT } from "@/constants/exports";
import { COUNTRIES, COUNTRY_LABELS, type Country } from "@/constants/students";
import {
  DEFAULT_VISA_SORT,
  APPOINTMENT_WHENS,
  APPOINTMENT_WHEN_LABELS,
  AppointmentWhen,
  VISA_LIST_TEXT as TEXT,
  VISA_SORTS,
  VISA_SORT_LABELS,
  VISA_STATUSES,
  VISA_STATUS_LABELS,
  type VisaSort,
  type VisaStatus,
} from "@/constants/visas";
import type { CounsellorChoice, VisaFilterChoices } from "@/lib/api";
import { formatIntake } from "@/lib/dates";
import type { VisaFilters } from "@/lib/visas";

type VisaFilterBarProps = {
  /** What is typed in the search box (the list follows it once typing settles). */
  search: string;
  onSearch: (search: string) => void;
  filters: VisaFilters;
  onChange: (change: Partial<Omit<VisaFilters, "search">>) => void;
  choices: VisaFilterChoices;
  counsellors: readonly CounsellorChoice[];
  /** Admins and Counsellors can be assigned Students, so "My Students" means something. */
  canBeAssigned: boolean;
  /** How many the list shows now ("3 visas"), for the phone's filter sheet. */
  resultText?: string | undefined;
};

const COUNSELLOR_FILTER_LABELS = { any: TEXT.anyCounsellor, me: TEXT.myStudents };

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: TEXT.anyStatus },
  ...VISA_STATUSES.map((status) => ({ value: status, label: VISA_STATUS_LABELS[status] })),
];

const APPOINTMENT_OPTIONS: SelectOption[] = APPOINTMENT_WHENS.map((when) => ({
  value: when,
  label: APPOINTMENT_WHEN_LABELS[when],
}));

const SORT_OPTIONS: SelectOption[] = VISA_SORTS.map((sort) => ({
  value: sort,
  label: VISA_SORT_LABELS[sort],
}));

/**
 * Search, Visa status, counsellor and appointment dates on one line; country, Intake and the order
 * under More filters, as on Students (spec 62b, list tidy-ups 03). The counsellor stays up front:
 * a Counsellor starts on My Students. The search counts as a filter that is set (UI revamp
 * ticket 24): a phone shows the words typed as a chip, and Clear filters empties the box.
 */
export function VisaFilterBar(props: VisaFilterBarProps) {
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
      id: "appointment",
      label: TEXT.appointment,
      value: filters.appointment,
      options: APPOINTMENT_OPTIONS,
      onChange: (appointment) => {
        onChange({ appointment: toAppointmentWhen(appointment) });
      },
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
      id: "sort",
      label: TEXT.sort,
      value: filters.sort,
      options: SORT_OPTIONS,
      onChange: (sort) => {
        onChange({ sort: toSort(sort) });
      },
      isSort: true,
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

function toStatus(value: string): VisaStatus | "" {
  return VISA_STATUSES.find((status) => status === value) ?? "";
}

function toCountry(value: string): Country | "" {
  return COUNTRIES.find((country) => country === value) ?? "";
}

function toAppointmentWhen(value: string): AppointmentWhen {
  return APPOINTMENT_WHENS.find((when) => when === value) ?? AppointmentWhen.Any;
}

function toSort(value: string): VisaSort {
  return VISA_SORTS.find((sort) => sort === value) ?? DEFAULT_VISA_SORT;
}
