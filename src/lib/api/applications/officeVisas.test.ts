import { Role } from "@/constants/roles";
import { defaultVisaFilters } from "@/lib/visas";

import { fetchVisaFilterChoices, fetchVisas } from "./officeVisas";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const TODAY = "2026-11-05";

const ROW = {
  id: uid(21),
  student: { id: uid(2), name: "Sita Karki", phone: "9841234567", email: "sita@gmail.test" },
  university: { id: 3, name: "University of Toronto", country: "canada" },
  course: { id: 4, name: "Master of IT", level: "master" },
  intake: "2027-09",
  status: "applied",
  next_appointment: { kind: "biometrics", at: "2026-11-20T14:00" },
  started_on: "2026-10-12",
  documents: { done: 5, total: 13, rejected: 1, waiting: 2 },
  assigned_counsellor: { id: 5, name: "Bikash Thapa" },
};

function answering(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(body, status));
}

describe("fetchVisas", () => {
  it("asks for the filters and page, and names the rows in frontend terms", async () => {
    const fetchFn = answering({ count: 26, page: 2, page_size: 25, results: [ROW] });

    const found = await fetchVisas(defaultVisaFilters(Role.Counsellor), 2, TODAY, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/visas/?counsellor=me&page=2");
    expect(found).toEqual({
      count: 26,
      page: 2,
      pageSize: 25,
      visas: [
        {
          id: uid(21),
          student: ROW.student,
          university: ROW.university,
          course: ROW.course,
          intake: "2027-09",
          status: "applied",
          nextAppointment: { kind: "biometrics", at: "2026-11-20T14:00" },
          startedOn: "2026-10-12",
          documents: { done: 5, total: 13, rejected: 1, waiting: 2 },
          assignedCounsellor: { id: 5, name: "Bikash Thapa" },
        },
      ],
    });
  });

  it("accepts a Visa with no appointment and a Student with no counsellor", async () => {
    const row = { ...ROW, next_appointment: null, assigned_counsellor: null };
    const fetchFn = answering({ count: 1, page: 1, page_size: 25, results: [row] });

    const [found] = (await fetchVisas(defaultVisaFilters(Role.Admin), 1, TODAY, fetchFn)).visas;

    expect(found?.nextAppointment).toBeNull();
    expect(found?.assignedCounsellor).toBeNull();
  });

  it.each([
    ["an unknown Visa Status", { ...ROW, status: "approved" }],
    ["a Status that is gone", { ...ROW, status: "lodged" }],
    [
      "an appointment that isn't a date and time",
      { ...ROW, next_appointment: { kind: "interview", at: "2026-11-20" } },
    ],
    [
      "an unknown appointment",
      { ...ROW, next_appointment: { kind: "dinner", at: "2026-11-20T14:00" } },
    ],
    ["an Intake that isn't a month", { ...ROW, intake: "Sep 2027" }],
    ["a negative document count", { ...ROW, documents: { ...ROW.documents, done: -1 } }],
    ["an unknown country", { ...ROW, university: { ...ROW.university, country: "mars" } }],
  ])("refuses an answer with %s", async (_, row) => {
    const fetchFn = answering({ count: 1, page: 1, page_size: 25, results: [row] });

    await expect(fetchVisas(defaultVisaFilters(Role.Admin), 1, TODAY, fetchFn)).rejects.toThrow();
  });

  it("fails when the API refuses", async () => {
    const fetchFn = answering({ detail: "Teachers can't see Students." }, 403);

    await expect(fetchVisas(defaultVisaFilters(Role.Admin), 1, TODAY, fetchFn)).rejects.toThrow();
  });
});

describe("fetchVisaFilterChoices", () => {
  it("returns the Intakes and countries in use", async () => {
    const fetchFn = answering({ intakes: ["2027-02", "2027-09"], countries: ["canada"] });

    const choices = await fetchVisaFilterChoices(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/visas/filter-choices/");
    expect(choices).toEqual({ intakes: ["2027-02", "2027-09"], countries: ["canada"] });
  });

  it("refuses values that aren't Intakes or known countries", async () => {
    await expect(
      fetchVisaFilterChoices(answering({ intakes: ["x"], countries: [] })),
    ).rejects.toThrow();
    await expect(
      fetchVisaFilterChoices(answering({ intakes: [], countries: ["mars"] })),
    ).rejects.toThrow();
  });
});
