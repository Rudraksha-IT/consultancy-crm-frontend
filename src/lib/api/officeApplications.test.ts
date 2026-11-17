import { defaultApplicationFilters } from "@/lib/applications";
import { Role } from "@/constants/roles";

import { fetchApplicationFilterChoices, fetchApplications } from "./officeApplications";
import { jsonResponse } from "./test-helpers";

const ROW = {
  id: 11,
  student: { id: 2, name: "Sita Karki", phone: "9841234567", email: "sita@gmail.test" },
  university: { id: 3, name: "Deakin University", country: "australia" },
  course: { id: 4, name: "Master of IT", level: "master" },
  intake: "2027-07",
  status: "offer",
  offer_kind: "conditional",
  assigned_counsellor: { id: 5, name: "Bikash Thapa" },
  applied_on: "2026-10-02",
  added_on: "2026-09-30",
};

function answering(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body, status));
}

describe("fetchApplications", () => {
  it("asks for the filters and page, and names the rows in frontend terms", async () => {
    const fetchFn = answering({ count: 26, page: 2, page_size: 25, results: [ROW] });

    const found = await fetchApplications(defaultApplicationFilters(Role.Counsellor), 2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/applications/?counsellor=me&page=2");
    expect(found).toEqual({
      count: 26,
      page: 2,
      pageSize: 25,
      applications: [
        {
          id: 11,
          student: ROW.student,
          university: ROW.university,
          course: ROW.course,
          intake: "2027-07",
          status: "offer",
          offerKind: "conditional",
          assignedCounsellor: { id: 5, name: "Bikash Thapa" },
          appliedOn: "2026-10-02",
          addedOn: "2026-09-30",
        },
      ],
    });
  });

  it("accepts a row with no applied day and a Student with no counsellor", async () => {
    const row = { ...ROW, applied_on: null, assigned_counsellor: null };
    const fetchFn = answering({ count: 1, page: 1, page_size: 25, results: [row] });

    const [found] = (await fetchApplications(defaultApplicationFilters(Role.Admin), 1, fetchFn))
      .applications;

    expect(found?.appliedOn).toBeNull();
    expect(found?.assignedCounsellor).toBeNull();
  });

  it.each([
    ["an unknown Status", { ...ROW, status: "approved" }],
    ["an Intake that isn't a month", { ...ROW, intake: "Feb 2027" }],
    ["a day that isn't a date", { ...ROW, added_on: "yesterday" }],
    ["an unknown country", { ...ROW, university: { ...ROW.university, country: "mars" } }],
  ])("refuses an answer with %s", async (_, row) => {
    const fetchFn = answering({ count: 1, page: 1, page_size: 25, results: [row] });

    await expect(
      fetchApplications(defaultApplicationFilters(Role.Admin), 1, fetchFn),
    ).rejects.toThrow();
  });

  it("fails when the API refuses", async () => {
    const fetchFn = answering({ detail: "Teachers can't see Students." }, 403);

    await expect(
      fetchApplications(defaultApplicationFilters(Role.Admin), 1, fetchFn),
    ).rejects.toThrow();
  });
});

describe("fetchApplicationFilterChoices", () => {
  it("returns the Intakes, years and countries in use", async () => {
    const fetchFn = answering({
      intakes: ["2027-02", "2027-07"],
      years: ["2027"],
      countries: ["australia", "canada"],
    });

    const choices = await fetchApplicationFilterChoices(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/applications/filter-choices/");
    expect(choices).toEqual({
      intakes: ["2027-02", "2027-07"],
      years: ["2027"],
      countries: ["australia", "canada"],
    });
  });

  it("refuses values that aren't Intakes, years or known countries", async () => {
    await expect(
      fetchApplicationFilterChoices(answering({ intakes: ["x"], years: [], countries: [] })),
    ).rejects.toThrow();
    await expect(
      fetchApplicationFilterChoices(answering({ intakes: [], years: ["27"], countries: [] })),
    ).rejects.toThrow();
    await expect(
      fetchApplicationFilterChoices(answering({ intakes: [], years: [], countries: ["mars"] })),
    ).rejects.toThrow();
  });
});
