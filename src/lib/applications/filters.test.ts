import { Role } from "@/constants/roles";

import {
  applicationListQuery,
  defaultApplicationFilters,
  hasAnyApplicationFilter,
  type ApplicationFilters,
} from "./filters";

const EVERYONE: ApplicationFilters = defaultApplicationFilters(Role.Admin);

describe("defaultApplicationFilters", () => {
  it("starts a Counsellor on their own Students (spec 57a)", () => {
    expect(defaultApplicationFilters(Role.Counsellor).counsellor).toBe("me");
  });

  it.each([Role.Admin, Role.FrontDesk])("starts %s on everyone", (role) => {
    expect(defaultApplicationFilters(role)).toEqual({
      search: "",
      status: "",
      intake: "",
      year: "",
      country: "",
      counsellor: "",
      sort: "-applied_on",
    });
  });
});

describe("applicationListQuery", () => {
  it("is empty for everyone in the starting order on the first page", () => {
    expect(applicationListQuery(EVERYONE, 1)).toBe("");
  });

  it("names every filter that is set, the order and the page, as the API does", () => {
    const filters: ApplicationFilters = {
      search: "  Deakin ",
      status: "offer",
      intake: "2027-02",
      year: "2027",
      country: "australia",
      counsellor: "me",
      sort: "intake",
    };

    expect(applicationListQuery(filters, 3)).toBe(
      "?q=Deakin&status=offer&intake=2027-02&year=2027&country=australia&counsellor=me&sort=intake&page=3",
    );
  });

  it("encodes what was typed", () => {
    expect(applicationListQuery({ ...EVERYONE, search: "a&b=c" }, 1)).toBe("?q=a%26b%3Dc");
  });
});

describe("hasAnyApplicationFilter", () => {
  it("ignores the order but notices any filter or search", () => {
    expect(hasAnyApplicationFilter({ ...EVERYONE, sort: "intake" })).toBe(false);
    expect(hasAnyApplicationFilter({ ...EVERYONE, search: " " })).toBe(false);
    expect(hasAnyApplicationFilter({ ...EVERYONE, year: "2027" })).toBe(true);
    expect(hasAnyApplicationFilter(defaultApplicationFilters(Role.Counsellor))).toBe(true);
  });
});
