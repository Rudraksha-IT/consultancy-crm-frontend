import { Role } from "@/constants/roles";
import { isStage, type Stage } from "@/constants/stages";
import {
  CounsellorFilter,
  type Country,
  type Source,
  type TargetLevel,
} from "@/constants/students";

/** The Student list's search and filters; "" means any. */
export type StudentFilters = {
  search: string;
  stage: Stage | "";
  /** "", "me", "none" or a Staff id. */
  counsellor: string;
  source: Source | "";
  /** The country they most want to study in (spec 31). */
  country: Country | "";
  targetLevel: TargetLevel | "";
};

/** No search and no filter: everyone. */
export const NO_STUDENT_FILTERS: StudentFilters = {
  search: "",
  stage: "",
  counsellor: "",
  source: "",
  country: "",
  targetLevel: "",
};

/**
 * Where the Student list starts: a Counsellor sees the Students assigned to them (spec 30),
 * unless they arrived with a search from the top bar or a Stage from the Admin's pipeline, which
 * look through everyone. A Stage from the address that isn't one is ignored.
 */
export function defaultStudentFilters(role: Role, search = "", stageParam = ""): StudentFilters {
  const query = search.trim();
  const stage = stageFrom(stageParam);
  const isMine = role === Role.Counsellor && `${query}${stage}` === "";
  return {
    search: query,
    stage,
    counsellor: isMine ? CounsellorFilter.Me : CounsellorFilter.Any,
    source: "",
    country: "",
    targetLevel: "",
  };
}

/** A Stage read from the address, or "" when it isn't one. */
function stageFrom(param: string): Stage | "" {
  return isStage(param) ? param : "";
}

/** The query string the API's Student list takes for these filters and page ("" if none). */
export function studentListQuery(filters: StudentFilters, page: number): string {
  const values = { ...studentFilterValues(filters), ...(page > 1 ? { page: String(page) } : {}) };
  const query = new URLSearchParams(values).toString();
  return query === "" ? "" : `?${query}`;
}

/** The filters as the API names them, leaving out any that are "any". */
export function studentFilterValues(filters: StudentFilters): Record<string, string> {
  const sent: [string, string][] = [
    ["q", filters.search.trim()],
    ["stage", filters.stage],
    ["counsellor", filters.counsellor],
    ["source", filters.source],
    ["country", filters.country],
    ["target_level", filters.targetLevel],
  ];
  return Object.fromEntries(sent.filter(([, value]) => value !== ""));
}

/** Whether any search or filter narrows the list. */
export function hasAnyFilter(filters: StudentFilters): boolean {
  return studentListQuery(filters, 1) !== "";
}
