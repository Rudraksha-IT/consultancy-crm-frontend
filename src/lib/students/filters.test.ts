import { Role } from "@/constants/roles";
import { Stage } from "@/constants/stages";
import { Country, Source, TargetLevel } from "@/constants/students";

import {
  defaultStudentFilters,
  hasAnyFilter,
  NO_STUDENT_FILTERS,
  studentListQuery,
} from "./filters";

describe("defaultStudentFilters", () => {
  it("shows a Counsellor the Students assigned to them", () => {
    expect(defaultStudentFilters(Role.Counsellor).counsellor).toBe("me");
  });

  it.each([Role.Admin, Role.FrontDesk])("shows %s every Student", (role) => {
    expect(defaultStudentFilters(role).counsellor).toBe("");
  });

  it("starts with the search typed in the top bar", () => {
    expect(defaultStudentFilters(Role.Counsellor, "  sita ").search).toBe("sita");
  });

  it("drops the counsellor filter when a search comes from the top bar", () => {
    expect(defaultStudentFilters(Role.Counsellor, "sita").counsellor).toBe("");
  });

  it("starts at a Stage given in the address, for everyone's Students", () => {
    const filters = defaultStudentFilters(Role.Counsellor, "", "visa");
    expect(filters.stage).toBe(Stage.Visa);
    expect(filters.counsellor).toBe("");
  });

  it.each(["graduated", "<script>", "Lead"])("ignores %j as a Stage from the address", (stage) => {
    const filters = defaultStudentFilters(Role.Counsellor, "", stage);
    expect(filters.stage).toBe("");
    expect(filters.counsellor).toBe("me");
  });

  it("has no Stage or Source filter", () => {
    const filters = defaultStudentFilters(Role.Admin);
    expect(filters.stage).toBe("");
    expect(filters.source).toBe("");
  });
});

describe("studentListQuery", () => {
  const NONE = NO_STUDENT_FILTERS;

  it("sends only the first page when nothing is chosen", () => {
    expect(studentListQuery(NONE, 1)).toBe("");
  });

  it("sends the page after the first", () => {
    expect(studentListQuery(NONE, 3)).toBe("?page=3");
  });

  it("sends every chosen filter with the API's names", () => {
    const query = studentListQuery(
      {
        search: "sita karki",
        stage: Stage.Counselling,
        counsellor: "me",
        source: Source.SubAgent,
        country: Country.Uk,
        targetLevel: TargetLevel.Master,
      },
      2,
    );

    expect(query).toBe(
      "?q=sita+karki&stage=counselling&counsellor=me&source=sub_agent&country=uk&target_level=master&page=2",
    );
  });

  it("trims the search and leaves it out when blank", () => {
    expect(studentListQuery({ ...NONE, search: "   " }, 1)).toBe("");
    expect(studentListQuery({ ...NONE, search: " ram " }, 1)).toBe("?q=ram");
  });

  it("encodes characters that mean something in a URL", () => {
    expect(studentListQuery({ ...NONE, search: "a&b=c#d" }, 1)).toBe("?q=a%26b%3Dc%23d");
  });
});

describe("hasAnyFilter", () => {
  it("is false with nothing chosen", () => {
    expect(hasAnyFilter({ ...NO_STUDENT_FILTERS, search: " " })).toBe(false);
  });

  it.each([
    { ...NO_STUDENT_FILTERS, search: "x" },
    { ...NO_STUDENT_FILTERS, stage: "lead" },
    { ...NO_STUDENT_FILTERS, counsellor: "me" },
    { ...NO_STUDENT_FILTERS, source: "facebook" },
    { ...NO_STUDENT_FILTERS, country: "canada" },
    { ...NO_STUDENT_FILTERS, targetLevel: "phd" },
  ] as const)("is true with %o", (filters) => {
    expect(hasAnyFilter(filters)).toBe(true);
  });
});
