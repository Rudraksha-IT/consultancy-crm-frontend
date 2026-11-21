import type { SelectOption } from "@/components/ui/SelectField";
import { LABELS } from "@/constants/messages";
import { STAGE_LABELS, Stage } from "@/constants/stages";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  ENGLISH_TESTS,
  ENGLISH_TEST_LABELS,
  GENDERS,
  GENDER_LABELS,
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  PROVINCES,
  PROVINCE_LABELS,
  QUALIFICATIONS,
  QUALIFICATION_LABELS,
  SOURCES,
  SOURCE_LABELS,
  TARGET_LEVELS,
  TARGET_LEVEL_LABELS,
} from "@/constants/students";
import type { CounsellorChoice } from "@/lib/api";

export const COUNTRY_OPTIONS: SelectOption[] = COUNTRIES.map((value) => ({
  value,
  label: COUNTRY_LABELS[value],
}));

export const SOURCE_OPTIONS: SelectOption[] = SOURCES.map((value) => ({
  value,
  label: SOURCE_LABELS[value],
}));

export const QUALIFICATION_OPTIONS: SelectOption[] = QUALIFICATIONS.map((value) => ({
  value,
  label: QUALIFICATION_LABELS[value],
}));

export const TEST_OPTIONS: SelectOption[] = ENGLISH_TESTS.map((value) => ({
  value,
  label: ENGLISH_TEST_LABELS[value],
}));

export const TARGET_LEVEL_OPTIONS: SelectOption[] = TARGET_LEVELS.map((value) => ({
  value,
  label: TARGET_LEVEL_LABELS[value],
}));

export const GENDER_OPTIONS: SelectOption[] = GENDERS.map((value) => ({
  value,
  label: GENDER_LABELS[value],
}));

export const MARITAL_STATUS_OPTIONS: SelectOption[] = MARITAL_STATUSES.map((value) => ({
  value,
  label: MARITAL_STATUS_LABELS[value],
}));

export const PROVINCE_OPTIONS: SelectOption[] = PROVINCES.map((value) => ({
  value,
  label: PROVINCE_LABELS[value],
}));

export const STAGE_OPTIONS: SelectOption[] = Object.values(Stage).map((value) => ({
  value,
  label: STAGE_LABELS[value],
}));

/** "Decide later", then each counsellor by name. */
export function handOverOptions(counsellors: readonly CounsellorChoice[]): SelectOption[] {
  return [
    { value: "", label: LABELS.decideLater },
    ...counsellors.map(({ id, name }) => ({ value: id, label: name })),
  ];
}
