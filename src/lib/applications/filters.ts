import {
  DEFAULT_APPLICATION_SORT,
  type ApplicationSort,
  type ApplicationStatus,
} from "@/constants/applications";
import { Role } from "@/constants/roles";
import { CounsellorFilter, type Country } from "@/constants/students";

/** The office-wide Applications list's search, filters and order; "" means any (spec 57a). */
export type ApplicationFilters = {
  search: string;
  status: ApplicationStatus | "";
  /** An Intake month, "YYYY-MM". */
  intake: string;
  /** An intake year, "YYYY". */
  year: string;
  /** The country of the Application's University. */
  country: Country | "";
  /** "", "me" or a Staff id: whose Students. */
  counsellor: string;
  sort: ApplicationSort;
};

/** Where the list starts: a Counsellor sees their own Students' Applications, others everyone. */
export function defaultApplicationFilters(role: Role): ApplicationFilters {
  return {
    search: "",
    status: "",
    intake: "",
    year: "",
    country: "",
    counsellor: role === Role.Counsellor ? CounsellorFilter.Me : CounsellorFilter.Any,
    sort: DEFAULT_APPLICATION_SORT,
  };
}

/** The query string the API's Applications list takes for these filters and page ("" if none). */
export function applicationListQuery(filters: ApplicationFilters, page: number): string {
  const sent: [string, string][] = [
    ...filterValues(filters),
    ["sort", filters.sort === DEFAULT_APPLICATION_SORT ? "" : filters.sort],
    ["page", page > 1 ? String(page) : ""],
  ];
  const query = new URLSearchParams(sent.filter(([, value]) => value !== "")).toString();
  return query === "" ? "" : `?${query}`;
}

/** Whether any search or filter narrows the list (the order doesn't). */
export function hasAnyApplicationFilter(filters: ApplicationFilters): boolean {
  return filterValues(filters).some(([, value]) => value !== "");
}

function filterValues(filters: ApplicationFilters): [string, string][] {
  return [
    ["q", filters.search.trim()],
    ["status", filters.status],
    ["intake", filters.intake],
    ["year", filters.year],
    ["country", filters.country],
    ["counsellor", filters.counsellor],
  ];
}
