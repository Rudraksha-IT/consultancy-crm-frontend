"use client";

import { useState } from "react";

import { FilterBar, MoreFiltersButton } from "@/components/ui/FilterBar";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { SearchBox } from "@/components/ui/SearchBox";
import { LABELS } from "@/constants/messages";
import { PRIORITIES, PRIORITY_LABELS } from "@/constants/priority";
import { Stage } from "@/constants/stages";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import {
  COUNTRIES,
  SOURCES,
  TARGET_LEVELS,
  type Country,
  type Source,
  type TargetLevel,
} from "@/constants/students";
import type { CounsellorChoice } from "@/lib/api";
import { priorityFrom, type StudentFilters } from "@/lib/students";

import { counsellorFilterOptions } from "./counsellorFilter";
import { COUNTRY_OPTIONS, SOURCE_OPTIONS, STAGE_OPTIONS, TARGET_LEVEL_OPTIONS } from "./options";

const PRIORITY_OPTIONS = [
  { value: "", label: LABELS.allPriorities },
  ...PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_LABELS[priority] })),
];

const COUNSELLOR_FILTER_LABELS = {
  any: LABELS.anyCounsellor,
  me: LABELS.assignedToMe,
  none: LABELS.noCounsellorYet,
};

type StudentFilterBarProps = {
  /** What is typed in the search box (the list follows it once typing settles). */
  search: string;
  onSearch: (search: string) => void;
  filters: StudentFilters;
  onChange: (change: Partial<Omit<StudentFilters, "search">>) => void;
  counsellors: readonly CounsellorChoice[];
  /** Admins and Counsellors can be assigned Students, so "Assigned to me" means something. */
  canBeAssigned: boolean;
};

/**
 * Search, Stage, Priority and counsellor, with "How they found us", "Wants to study in" and "Target level"
 * under More filters.
 */
export function StudentFilterBar(props: StudentFilterBarProps) {
  const { filters, onChange } = props;
  const [isMoreOpen, setIsMoreOpen] = useState(
    `${filters.source}${filters.country}${filters.targetLevel}` !== "",
  );

  return (
    <FilterBar
      label={LABELS.studentFilters}
      search={
        <SearchBox
          label={LABELS.searchStudents}
          placeholder={LABELS.searchStudentsPlaceholder}
          value={props.search}
          onChange={props.onSearch}
        />
      }
      more={isMoreOpen ? <MoreFilters {...props} /> : undefined}
    >
      <FilterSelect
        label={LABELS.stage}
        value={filters.stage}
        options={[{ value: "", label: LABELS.allStages }, ...STAGE_OPTIONS]}
        onChange={(stage) => {
          onChange({ stage: toStage(stage) });
        }}
      />
      <FilterSelect
        label={LABELS.priority}
        value={filters.priority}
        options={PRIORITY_OPTIONS}
        onChange={(priority) => {
          onChange({ priority: priorityFrom(priority) });
        }}
      />
      <FilterSelect
        label={LABELS.counsellor}
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
      {!isMoreOpen && (
        <MoreFiltersButton
          onClick={() => {
            setIsMoreOpen(true);
          }}
        >
          {LABELS.moreFilters}
        </MoreFiltersButton>
      )}
    </FilterBar>
  );
}

/** "How they found us", "Wants to study in" and "Target level", once More filters is open. */
function MoreFilters({ filters, onChange }: StudentFilterBarProps) {
  return (
    <>
      <FilterSelect
        label={LABELS.howTheyFoundUs}
        isLabelShown
        value={filters.source}
        options={[{ value: "", label: LABELS.anyWay }, ...SOURCE_OPTIONS]}
        onChange={(source) => {
          onChange({ source: toSource(source) });
        }}
      />
      <FilterSelect
        label={LABELS.wantsToStudyIn}
        isLabelShown
        value={filters.country}
        options={[{ value: "", label: PROFILE_TEXT.anyCountry }, ...COUNTRY_OPTIONS]}
        onChange={(country) => {
          onChange({ country: toCountry(country) });
        }}
      />
      <FilterSelect
        label={PROFILE_TEXT.targetLevel}
        isLabelShown
        value={filters.targetLevel}
        options={[{ value: "", label: PROFILE_TEXT.anyLevel }, ...TARGET_LEVEL_OPTIONS]}
        onChange={(level) => {
          onChange({ targetLevel: toTargetLevel(level) });
        }}
      />
    </>
  );
}

function toStage(value: string): Stage | "" {
  return Object.values(Stage).find((stage) => stage === value) ?? "";
}

function toSource(value: string): Source | "" {
  return SOURCES.find((source) => source === value) ?? "";
}

function toCountry(value: string): Country | "" {
  return COUNTRIES.find((country) => country === value) ?? "";
}

function toTargetLevel(value: string): TargetLevel | "" {
  return TARGET_LEVELS.find((level) => level === value) ?? "";
}
