import type { ExportList } from "@/constants/exports";

/** A list's filters as the export endpoint takes them: the list's own query, minus the page. */
export type ExportFilters = Record<string, string | string[]>;

// Filters the list endpoints take as several values; the export takes them as a list.
const LIST_FIELDS = new Set(["status"]);

/**
 * The filters of a list's query string (e.g. "?stage=lead&page=2"), so the export holds exactly
 * the rows the screen shows. The page is dropped: an export is the whole filtered list.
 */
export function exportFilters(query: string): ExportFilters {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const fields = [...new Set(params.keys())].filter((field) => field !== "page");
  return Object.fromEntries(fields.map((field) => [field, filterValue(params, field)]));
}

function filterValue(params: URLSearchParams, field: string): string | string[] {
  return LIST_FIELDS.has(field) ? params.getAll(field) : params.getAll(field).join("");
}

/** The file name the server gives an export: `<list>-<YYYY-MM-DD>.csv`. */
export function exportFileName(list: ExportList, today: string): string {
  return `${list}-${today}.csv`;
}

/** A filter on screen, as it reads: e.g. ["Stage", "Applying"]; "" when it isn't set. */
export type FilterWords = readonly [label: string, value: string];

/** The set filters in words, e.g. "Stage: Applying, Counsellor: Hari Thapa", or `none`. */
export function describeFilters(filters: readonly FilterWords[], none: string): string {
  const set = filters.filter(([, value]) => value.trim() !== "");
  return set.length === 0 ? none : set.map(([label, value]) => `${label}: ${value}`).join(", ");
}
