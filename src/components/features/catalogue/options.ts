import type { SelectOption } from "@/components/ui/SelectField";
import { COURSE_LEVEL_LABELS, COURSE_LEVELS, type CourseLevel } from "@/constants/catalogue";
import { COUNTRIES, COUNTRY_LABELS, type Country } from "@/constants/students";

export const COURSE_LEVEL_OPTIONS: SelectOption[] = COURSE_LEVELS.map((value) => ({
  value,
  label: COURSE_LEVEL_LABELS[value],
}));

export const UNIVERSITY_COUNTRY_OPTIONS: SelectOption[] = COUNTRIES.map((value) => ({
  value,
  label: COUNTRY_LABELS[value],
}));

export function countryLabel(country: Country): string {
  return COUNTRY_LABELS[country];
}

export function levelLabel(level: CourseLevel): string {
  return COURSE_LEVEL_LABELS[level];
}
