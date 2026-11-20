import { InvalidFieldsError } from "../core/errors";
import { fetchStaffProgress } from "./staffProgress";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const ANSWER = {
  staff: {
    id: 3,
    name: "Bikash Thapa",
    job_title: "Senior counsellor",
    mobile: "9841000001",
    role: "counsellor",
    status: "active",
  },
  from: "2026-11-01",
  to: "2026-11-15",
  cards: [
    { count: "moved_forward", value: 4, counted_from: null, amount: null },
    { count: "tasks_done", value: 2, counted_from: "2026-11-15", amount: null },
    { count: "payments_taken", value: 2, counted_from: null, amount: 20500 },
  ],
  days: [
    {
      day: "2026-11-04",
      entries: [
        {
          kind: "application_made",
          at: "2026-11-04T09:15:00+00:00",
          before: "",
          after: "Deakin University",
          detail: "Master of IT",
          student: { id: uid(7), name: "Sita Gurung" },
        },
        {
          kind: "attendance_marked",
          at: "2026-11-04T04:15:00+00:00",
          before: "",
          after: "PTE Day",
          detail: "12",
          student: null,
        },
      ],
    },
  ],
  more: false,
};

const RANGE = { from: "2026-11-01", to: "2026-11-15" };

function answering(response: Response) {
  return vi.fn<typeof fetch>(() => Promise.resolve(response));
}

describe("fetchStaffProgress", () => {
  it("sends the person and dates and returns the answer in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(ANSWER));

    const progress = await fetchStaffProgress(3, RANGE, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/staff/3/progress/?from=2026-11-01&to=2026-11-15");
    expect(progress.staff).toEqual({
      id: 3,
      name: "Bikash Thapa",
      jobTitle: "Senior counsellor",
      mobile: "9841000001",
      role: "counsellor",
      status: "active",
    });
    expect(progress.cards).toEqual([
      { count: "moved_forward", value: 4, countedFrom: null, amount: null },
      { count: "tasks_done", value: 2, countedFrom: "2026-11-15", amount: null },
      { count: "payments_taken", value: 2, countedFrom: null, amount: 20500 },
    ]);
    expect(progress.days[0]?.entries[0]).toEqual({
      kind: "application_made",
      at: "2026-11-04T09:15:00+00:00",
      before: "",
      after: "Deakin University",
      detail: "Master of IT",
      student: { id: uid(7), name: "Sita Gurung" },
    });
    expect(progress.days[0]?.entries[1]?.student).toBeNull();
    expect(progress.more).toBe(false);
  });

  it("accepts every History kind as a change", async () => {
    const entry = { ...ANSWER.days[0]?.entries[0], kind: "stage_changed" };
    const fetchFn = answering(
      jsonResponse({ ...ANSWER, days: [{ day: "2026-11-04", entries: [entry] }] }),
    );

    const progress = await fetchStaffProgress(3, RANGE, fetchFn);

    expect(progress.days[0]?.entries[0]?.kind).toBe("stage_changed");
  });

  it.each([
    [
      "an unknown card",
      { cards: [{ count: "page_views", value: 1, counted_from: null, amount: null }] },
    ],
    [
      "a negative number",
      { cards: [{ count: "new_leads", value: -1, counted_from: null, amount: null }] },
    ],
    [
      "an unknown change",
      {
        days: [
          { day: "2026-11-04", entries: [{ ...ANSWER.days[0]?.entries[0], kind: "page_opened" }] },
        ],
      },
    ],
    ["a day that isn't a date", { days: [{ day: "4 Nov", entries: [] }] }],
    ["an unknown Role", { staff: { ...ANSWER.staff, role: "owner" } }],
  ])("refuses %s", async (_, change) => {
    const fetchFn = answering(jsonResponse({ ...ANSWER, ...change }));

    await expect(fetchStaffProgress(3, RANGE, fetchFn)).rejects.toThrow();
  });

  it("turns refused dates into field errors", async () => {
    const fetchFn = answering(jsonResponse({ to: ["Choose a period of one year or less."] }, 400));

    const failure = fetchStaffProgress(3, RANGE, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(failure).rejects.toMatchObject({
      fieldErrors: { to: ["Choose a period of one year or less."] },
    });
  });
});
