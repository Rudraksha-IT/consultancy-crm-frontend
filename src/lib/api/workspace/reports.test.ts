import { InvalidFieldsError } from "../core/errors";
import {
  fetchClassReport,
  fetchMoneyReport,
  fetchSourceReport,
  fetchStaffProgressReport,
  fetchStudentReport,
} from "./reports";
import { jsonResponse } from "../core/test-helpers";

const MONTH = {
  month: "2026-10",
  new_visitors: 14,
  signed_up: 5,
  applied: 6,
  visas_granted: 3,
  visas_refused: 1,
  lost: 4,
};

const COUNSELLOR = {
  id: 3,
  name: "Bikash Thapa",
  is_active: true,
  students: 12,
  moved_forward: 4,
  applications_made: 3,
  visas_applied_for: 2,
  visas_granted: 1,
  students_lost: 2,
  tasks_done: 9,
};
const FRONT_DESK = {
  id: 4,
  name: "Sunita Shrestha",
  is_active: false,
  visitors_registered: 20,
  new_leads: 8,
  payments_taken: 5,
};
const TEACHER = {
  id: 6,
  name: "Gita Lama",
  is_active: true,
  classes_taken: 12,
  attendance_marked: 140,
};
const STAFF_PROGRESS = {
  counsellors: [COUNSELLOR],
  front_desk: [FRONT_DESK],
  teachers: [TEACHER],
  counted_from: { tasks_done: "2026-11-15" },
};

function answering(response: Response) {
  return vi.fn<typeof fetch>(() => Promise.resolve(response));
}

function sentPath(fetchFn: ReturnType<typeof answering>): unknown {
  return fetchFn.mock.calls[0]?.[0];
}

const RANGE = { from: "2026-08-01", to: "2026-11-03" };

describe("fetchStudentReport", () => {
  const COUNTRIES = {
    visas_granted_by_country: [
      { country: "canada", count: 2 },
      { country: "uk", count: 1 },
    ],
    countries_wanted: [{ country: "australia", count: 5 }],
  };

  it("asks for 6 or 12 months and returns them in frontend naming", async () => {
    const fetchFn = answering(jsonResponse({ months: [MONTH], ...COUNTRIES }));

    const report = await fetchStudentReport(12, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/reports/students/?months=12");
    expect(report).toEqual({
      months: [
        {
          month: "2026-10",
          newVisitors: 14,
          signedUp: 5,
          applied: 6,
          visasGranted: 3,
          visasRefused: 1,
          lost: 4,
        },
      ],
      visasGrantedByCountry: [
        { country: "canada", count: 2 },
        { country: "uk", count: 1 },
      ],
      countriesWanted: [{ country: "australia", count: 5 }],
    });
  });

  it.each([
    ["a month that isn't YYYY-MM", { months: [{ ...MONTH, month: "October" }], ...COUNTRIES }],
    ["a negative count", { months: [{ ...MONTH, lost: -1 }], ...COUNTRIES }],
    ["a count that isn't whole", { months: [{ ...MONTH, applied: 1.5 }], ...COUNTRIES }],
    ["a missing count", { months: [{ ...MONTH, signed_up: undefined }], ...COUNTRIES }],
    [
      "an unknown country",
      { ...COUNTRIES, months: [MONTH], countries_wanted: [{ country: "mars", count: 1 }] },
    ],
    [
      "a country count that isn't whole",
      {
        ...COUNTRIES,
        months: [MONTH],
        visas_granted_by_country: [{ country: "uk", count: 0.5 }],
      },
    ],
    [
      "markup instead of a country",
      {
        ...COUNTRIES,
        months: [MONTH],
        countries_wanted: [{ country: "<img src=x onerror=alert(1)>", count: 1 }],
      },
    ],
    ["missing countries", { months: [MONTH] }],
  ])("refuses an answer with %s", async (_, answer) => {
    const fetchFn = answering(jsonResponse(answer));

    await expect(fetchStudentReport(6, fetchFn)).rejects.toThrow();
  });
});

describe("fetchSourceReport", () => {
  it("sends the dates and returns each Source with its count", async () => {
    const fetchFn = answering(
      jsonResponse({
        total: 5,
        sources: [
          { source: "walk_in", count: 3 },
          { source: "facebook", count: 2 },
        ],
      }),
    );

    const report = await fetchSourceReport(RANGE, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/reports/sources/?from=2026-08-01&to=2026-11-03");
    expect(report).toEqual({
      total: 5,
      sources: [
        { source: "walk_in", count: 3 },
        { source: "facebook", count: 2 },
      ],
    });
  });

  it("refuses an unknown Source", async () => {
    const fetchFn = answering(
      jsonResponse({ total: 1, sources: [{ source: "tiktok", count: 1 }] }),
    );

    await expect(fetchSourceReport(RANGE, fetchFn)).rejects.toThrow();
  });

  it("turns refused dates into field errors", async () => {
    const fetchFn = answering(
      jsonResponse({ to: ["Choose an end date on or after the start date."] }, 400),
    );

    const failure = fetchSourceReport(RANGE, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(failure).rejects.toMatchObject({
      fieldErrors: { to: ["Choose an end date on or after the start date."] },
    });
  });
});

describe("fetchStaffProgressReport", () => {
  it("sends the dates and returns the three tables in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(STAFF_PROGRESS));

    const report = await fetchStaffProgressReport(RANGE, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/reports/staff-progress/?from=2026-08-01&to=2026-11-03");
    expect(report).toEqual({
      counsellors: [
        {
          id: 3,
          name: "Bikash Thapa",
          isActive: true,
          counts: {
            students: 12,
            moved_forward: 4,
            applications_made: 3,
            visas_applied_for: 2,
            visas_granted: 1,
            students_lost: 2,
            tasks_done: 9,
          },
        },
      ],
      frontDesk: [
        {
          id: 4,
          name: "Sunita Shrestha",
          isActive: false,
          counts: { visitors_registered: 20, new_leads: 8, payments_taken: 5 },
        },
      ],
      teachers: [
        {
          id: 6,
          name: "Gita Lama",
          isActive: true,
          counts: { classes_taken: 12, attendance_marked: 140 },
        },
      ],
      countedFrom: { tasks_done: "2026-11-15" },
    });
  });

  it.each([
    ["a row without its name", { counsellors: [{ ...COUNSELLOR, name: 7 }] }],
    ["a negative count", { front_desk: [{ ...FRONT_DESK, new_leads: -1 }] }],
    ["a missing column", { teachers: [{ id: 6, name: "Gita Lama", is_active: true }] }],
    ["an unknown counted-from count", { counted_from: { coffee: "2026-11-15" } }],
    ["a counted-from day that isn't a date", { counted_from: { tasks_done: "<b>soon</b>" } }],
  ])("refuses %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ ...STAFF_PROGRESS, ...change }));

    await expect(fetchStaffProgressReport(RANGE, fetchFn)).rejects.toThrow();
  });

  it("turns a period over a year into a field error", async () => {
    const fetchFn = answering(jsonResponse({ to: ["Choose a period of one year or less."] }, 400));

    await expect(fetchStaffProgressReport(RANGE, fetchFn)).rejects.toMatchObject({
      fieldErrors: { to: ["Choose a period of one year or less."] },
    });
  });
});

const CLASS = {
  id: 4,
  name: "IELTS Morning",
  test_type: "ielts",
  teacher: "Gita Lama",
  students: 12,
  attended_percent: 86,
};

describe("fetchClassReport", () => {
  it("sends the dates and returns each class in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ batches: [CLASS, { ...CLASS, id: 5, attended_percent: null }] }),
    );

    const rows = await fetchClassReport(RANGE, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/reports/batches/?from=2026-08-01&to=2026-11-03");
    expect(rows).toEqual([
      {
        id: 4,
        name: "IELTS Morning",
        testType: "ielts",
        teacher: "Gita Lama",
        students: 12,
        attendedPercent: 86,
      },
      {
        id: 5,
        name: "IELTS Morning",
        testType: "ielts",
        teacher: "Gita Lama",
        students: 12,
        attendedPercent: null,
      },
    ]);
  });

  it.each([
    ["a share over 100", { attended_percent: 101 }],
    ["a share that isn't whole", { attended_percent: 50.5 }],
    ["an unknown test type", { test_type: "gre" }],
    ["a missing teacher", { teacher: undefined }],
  ])("refuses %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ batches: [{ ...CLASS, ...change }] }));

    await expect(fetchClassReport(RANGE, fetchFn)).rejects.toThrow();
  });

  it("turns refused dates into field errors", async () => {
    const fetchFn = answering(jsonResponse({ from: ["Enter a date as YYYY-MM-DD."] }, 400));

    await expect(fetchClassReport(RANGE, fetchFn)).rejects.toMatchObject({
      fieldErrors: { from: ["Enter a date as YYYY-MM-DD."] },
    });
  });
});

describe("fetchMoneyReport", () => {
  const MONEY_MONTH = {
    month: "2026-10",
    from_students: 180000,
    from_commission: 290000,
    money_out: 91500,
  };

  it("asks for 6 or 12 months and returns them and money out by category", async () => {
    const fetchFn = answering(
      jsonResponse({
        months: [MONEY_MONTH],
        money_out_by_category: [
          { category: "office_rent", amount: 85000 },
          { category: "internet", amount: 6500 },
        ],
        money_in_by_fee_type: [{ fee_type: { id: 3, name: "Visa fee" }, amount: 180000 }],
      }),
    );

    const report = await fetchMoneyReport(12, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/reports/money/?months=12");
    expect(report).toEqual({
      months: [{ month: "2026-10", fromStudents: 180000, fromCommission: 290000, moneyOut: 91500 }],
      moneyOutByCategory: [
        { category: "office_rent", amount: 85000 },
        { category: "internet", amount: 6500 },
      ],
      moneyInByFeeType: [{ feeType: { id: 3, name: "Visa fee" }, amount: 180000 }],
    });
  });

  it.each([
    ["a month that isn't YYYY-MM", { months: [{ ...MONEY_MONTH, month: "2026-13" }] }],
    ["a negative amount", { months: [{ ...MONEY_MONTH, money_out: -1 }] }],
    ["an amount that isn't whole", { months: [{ ...MONEY_MONTH, from_students: 1.5 }] }],
    ["an amount sent as text", { months: [{ ...MONEY_MONTH, from_commission: "5" }] }],
    ["a missing amount", { months: [{ ...MONEY_MONTH, money_out: undefined }] }],
    [
      "an unknown category",
      { months: [], money_out_by_category: [{ category: "<b>bribes</b>", amount: 1 }] },
    ],
    ["no categories", { months: [MONEY_MONTH], money_out_by_category: undefined }],
    ["no Fee Types", { months: [MONEY_MONTH], money_in_by_fee_type: undefined }],
    [
      "a Fee Type without a name",
      { months: [], money_in_by_fee_type: [{ fee_type: { id: 1, name: "" }, amount: 1 }] },
    ],
  ])("refuses an answer with %s", async (_, body) => {
    const fetchFn = answering(
      jsonResponse({ money_out_by_category: [], money_in_by_fee_type: [], ...body }),
    );

    await expect(fetchMoneyReport(6, fetchFn)).rejects.toThrow();
  });
});
