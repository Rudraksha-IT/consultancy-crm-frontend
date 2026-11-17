"use client";

import { FilterBar } from "@/components/ui/FilterBar";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { counsellorFilterOptions } from "@/components/features/students/counsellorFilter";
import type { SelectOption } from "@/components/ui/SelectField";
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
  filters: VisaFilters;
  onChange: (change: Partial<VisaFilters>) => void;
  choices: VisaFilterChoices;
  counsellors: readonly CounsellorChoice[];
  /** Admins and Counsellors can be assigned Students, so "My Students" means something. */
  canBeAssigned: boolean;
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

/** Visa status, country, Intake, counsellor, appointment dates and the order (spec 62b). */
export function VisaFilterBar(props: VisaFilterBarProps) {
  const { filters, onChange, choices } = props;
  return (
    <FilterBar label={TEXT.filters}>
      <FilterSelect
        label={TEXT.status}
        value={filters.status}
        options={STATUS_OPTIONS}
        onChange={(status) => {
          onChange({ status: toStatus(status) });
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
        label={TEXT.appointment}
        value={filters.appointment}
        options={APPOINTMENT_OPTIONS}
        onChange={(appointment) => {
          onChange({ appointment: toAppointmentWhen(appointment) });
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
