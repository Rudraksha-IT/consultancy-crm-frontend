/** The Catalogue list's search and archived switch. */
export type CatalogueFilters = { search: string; includeArchived: boolean };

/** The Catalogue list's query string; empty for the first page of active entries. */
export function catalogueListQuery(filters: CatalogueFilters, page: number): string {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search !== "") params.set("q", search);
  if (filters.includeArchived) params.set("include_archived", "true");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}
