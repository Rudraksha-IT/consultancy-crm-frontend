"use client";

import { FilterBar, type ListFilter } from "@/components/ui/FilterBar";
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
  /** How many Students the list shows now ("3 Students"), for the phone's filter sheet. */
  resultText?: string | undefined;
};

/**
 * Search, Stage, Priority and counsellor, with "How they found us", "Wants to study in" and "Target level"
 * under More filters.
 */
export function StudentFilterBar(props: StudentFilterBarProps) {
  const { filters, onChange } = props;
  const listFilters: ListFilter[] = [
    {
      id: "stage",
      label: LABELS.stage,
      value: filters.stage,
      options: [{ value: "", label: LABELS.allStages }, ...STAGE_OPTIONS],
      onChange: (stage) => {
        onChange({ stage: toStage(stage) });
      },
    },
    {
      id: "priority",
      label: LABELS.priority,
      value: filters.priority,
      options: PRIORITY_OPTIONS,
      onChange: (priority) => {
        onChange({ priority: priorityFrom(priority) });
      },
    },
    {
      id: "counsellor",
      label: LABELS.counsellor,
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
      id: "source",
      label: LABELS.howTheyFoundUs,
      value: filters.source,
      options: [{ value: "", label: LABELS.anyWay }, ...SOURCE_OPTIONS],
      onChange: (source) => {
        onChange({ source: toSource(source) });
      },
      isMore: true,
    },
    {
      id: "country",
      label: LABELS.wantsToStudyIn,
      value: filters.country,
      options: [{ value: "", label: PROFILE_TEXT.anyCountry }, ...COUNTRY_OPTIONS],
      onChange: (country) => {
        onChange({ country: toCountry(country) });
      },
      isMore: true,
    },
    {
      id: "targetLevel",
      label: PROFILE_TEXT.targetLevel,
      value: filters.targetLevel,
      options: [{ value: "", label: PROFILE_TEXT.anyLevel }, ...TARGET_LEVEL_OPTIONS],
      onChange: (level) => {
        onChange({ targetLevel: toTargetLevel(level) });
      },
      isMore: true,
    },
  ];

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
      filters={listFilters}
      resultText={props.resultText}
    />
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
