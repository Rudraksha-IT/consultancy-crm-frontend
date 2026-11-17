import { Role } from "@/constants/roles";

import { defaultVisaFilters, hasAnyVisaFilter, visaListQuery, type VisaFilters } from "./filters";

const TODAY = "2026-11-05";
const EVERYONE: VisaFilters = defaultVisaFilters(Role.Admin);

describe("defaultVisaFilters", () => {
  it("starts a Counsellor on their own Students (spec 62b)", () => {
    expect(defaultVisaFilters(Role.Counsellor).counsellor).toBe("me");
  });

  it.each([Role.Admin, Role.FrontDesk])("starts %s on everyone", (role) => {
    expect(defaultVisaFilters(role)).toEqual({
      status: "",
      country: "",
      intake: "",
      counsellor: "",
      appointment: "",
      sort: "upcoming",
    });
  });
});

describe("visaListQuery", () => {
  it("is empty for everyone in the starting order on the first page", () => {
    expect(visaListQuery(EVERYONE, 1, TODAY)).toBe("");
  });

  it("names every filter that is set, the order and the page, as the API does", () => {
    const filters: VisaFilters = {
      status: "applied",
      country: "canada",
      intake: "2027-09",
      counsellor: "5",
      appointment: "",
      sort: "-appointment",
    };

    expect(visaListQuery(filters, 2, TODAY)).toBe(
      "?status=applied&country=canada&intake=2027-09&counsellor=5&sort=-appointment&page=2",
    );
  });

  it.each([
    ["next_7", "?appointment_from=2026-11-05&appointment_to=2026-11-11"],
    ["next_30", "?appointment_from=2026-11-05&appointment_to=2026-12-04"],
    ["none", "?has_appointment=false"],
  ] as const)("turns the %s appointment choice into the API's dates", (appointment, query) => {
    expect(visaListQuery({ ...EVERYONE, appointment }, 1, TODAY)).toBe(query);
  });
});

describe("hasAnyVisaFilter", () => {
  it("ignores the order but notices any filter", () => {
    expect(hasAnyVisaFilter({ ...EVERYONE, sort: "appointment" })).toBe(false);
    expect(hasAnyVisaFilter({ ...EVERYONE, appointment: "none" })).toBe(true);
    expect(hasAnyVisaFilter({ ...EVERYONE, country: "canada" })).toBe(true);
    expect(hasAnyVisaFilter(defaultVisaFilters(Role.Counsellor))).toBe(true);
  });
});
