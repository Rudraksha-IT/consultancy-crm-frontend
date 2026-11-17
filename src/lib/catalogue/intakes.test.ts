import { catalogueListQuery } from "./intakes";

describe("catalogueListQuery", () => {
  it("is empty for the first page of active entries", () => {
    expect(catalogueListQuery({ search: "", includeArchived: false }, 1)).toBe("");
  });

  it("asks for the search, archived entries and page", () => {
    expect(catalogueListQuery({ search: " deakin ", includeArchived: true }, 3)).toBe(
      "?q=deakin&include_archived=true&page=3",
    );
  });
});
