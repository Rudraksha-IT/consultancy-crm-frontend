import { InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import {
  answerWorkFromHome,
  askForWorkFromHome,
  cancelWorkFromHome,
  endWorkFromHome,
  fetchMyWorkFromHome,
  fetchPersonWorkFromHome,
  setWorkFromHome,
  WorkFromHomeRefusedError,
} from "./workFromHome";

const DATES = {
  id: 7,
  staff_id: 3,
  starts_on: "2026-11-06",
  ends_on: "2026-11-12",
  reason: "Looking after my mother",
  status: "waiting",
  set_directly: false,
  asked_by: "Sita Karki",
  asked_at: "2026-11-05T05:15:00Z",
  answered_by: null,
  answered_at: null,
};

const READ = {
  id: 7,
  staffId: 3,
  startsOn: "2026-11-06",
  endsOn: "2026-11-12",
  reason: "Looking after my mother",
  status: "waiting",
  isSetDirectly: false,
  askedBy: "Sita Karki",
  askedAt: "2026-11-05T05:15:00Z",
  answeredBy: null,
  answeredAt: null,
};

function answering(response: Response): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

function sent(fetchFn: ReturnType<typeof vi.fn<typeof fetch>>): [unknown, RequestInit] {
  const [path, init] = fetchFn.mock.calls[0] ?? [];
  return [path, init ?? {}];
}

function bodyOf(init: RequestInit): unknown {
  return typeof init.body === "string" ? JSON.parse(init.body) : undefined;
}

describe("my Work From Home dates", () => {
  it("reads them in frontend terms, with whether I may ask", async () => {
    const fetchFn = answering(jsonResponse({ can_ask: true, results: [DATES] }));

    const mine = await fetchMyWorkFromHome(fetchFn);

    expect(sent(fetchFn)[0]).toBe("/api/clock/work-from-home/");
    expect(mine).toEqual({ canAsk: true, dates: [READ] });
  });

  it.each([
    { ...DATES, status: "maybe" },
    { ...DATES, starts_on: "06/11/2026" },
    { ...DATES, ends_on: 5 },
    { ...DATES, reason: undefined },
    { ...DATES, set_directly: "no" },
  ])("refuses an answer that doesn't match: %j", async (row) => {
    const fetchFn = answering(jsonResponse({ can_ask: true, results: [row] }));

    await expect(fetchMyWorkFromHome(fetchFn)).rejects.toThrow();
  });

  it("asks with start, end (none when empty) and reason", async () => {
    const fetchFn = answering(jsonResponse(DATES, 201));

    const asked = await askForWorkFromHome(
      { startsOn: "2026-11-06", endsOn: "", reason: "Plumber" },
      fetchFn,
    );

    const [path, init] = sent(fetchFn);
    expect(path).toBe("/api/clock/work-from-home/");
    expect(init.method).toBe("POST");
    expect(bodyOf(init)).toEqual({
      starts_on: "2026-11-06",
      ends_on: null,
      reason: "Plumber",
    });
    expect(asked.id).toBe(7);
  });

  it("a refused field comes back named in frontend terms", async () => {
    const fetchFn = answering(
      jsonResponse({ ends_on: ["The end date must be on or after the start date."] }, 400),
    );

    const refused = askForWorkFromHome(
      { startsOn: "2026-11-06", endsOn: "2026-11-05", reason: "x" },
      fetchFn,
    );

    await expect(refused).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(refused).rejects.toMatchObject({
      fieldErrors: { endsOn: ["The end date must be on or after the start date."] },
    });
  });

  it("a refusal comes back as the server's reason", async () => {
    const detail = "Admins can clock in from any network, so they never need Work from home dates.";

    const refused = askForWorkFromHome(
      { startsOn: "2026-11-06", endsOn: "", reason: "x" },
      answering(jsonResponse({ detail }, 403)),
    );

    await expect(refused).rejects.toBeInstanceOf(WorkFromHomeRefusedError);
    await expect(refused).rejects.toThrow(detail);
  });

  it("cancels a waiting request with an empty body", async () => {
    const fetchFn = answering(jsonResponse({ ...DATES, status: "cancelled" }));

    const cancelled = await cancelWorkFromHome(7, fetchFn);

    const [path, init] = sent(fetchFn);
    expect(path).toBe("/api/clock/work-from-home/7/cancel/");
    expect(init).toMatchObject({ method: "POST", body: "{}" });
    expect(cancelled.status).toBe("cancelled");
  });
});

describe("an Admin and someone's dates", () => {
  it("reads a person's dates and whether they need any", async () => {
    const fetchFn = answering(
      jsonResponse({
        staff: { id: 3, name: "Sita Karki", job_title: "Counsellor", has_left: false },
        needs_dates: true,
        results: [DATES],
      }),
    );

    const person = await fetchPersonWorkFromHome(3, fetchFn);

    expect(sent(fetchFn)[0]).toBe("/api/clock/staff/3/work-from-home/");
    expect(person).toEqual({ name: "Sita Karki", needsDates: true, dates: [READ] });
  });

  it("sets dates directly", async () => {
    const fetchFn = answering(jsonResponse({ ...DATES, status: "approved" }, 201));

    await setWorkFromHome(3, { startsOn: "2026-11-06", endsOn: "", reason: "Pokhara" }, fetchFn);

    const [path, init] = sent(fetchFn);
    expect(path).toBe("/api/clock/staff/3/work-from-home/");
    expect(bodyOf(init)).toMatchObject({ ends_on: null, reason: "Pokhara" });
  });

  it.each([
    ["approve", "/api/clock/work-from-home/7/approve/"],
    ["decline", "/api/clock/work-from-home/7/decline/"],
  ] as const)("%s POSTs nothing", async (answer, path) => {
    const fetchFn = answering(jsonResponse({ ...DATES, status: "approved" }));

    await answerWorkFromHome(7, answer, fetchFn);

    expect(sent(fetchFn)).toEqual([path, expect.objectContaining({ body: "{}" })]);
  });

  it("ends approved dates", async () => {
    const fetchFn = answering(jsonResponse({ ...DATES, status: "approved", ends_on: null }));

    const ended = await endWorkFromHome(7, fetchFn);

    expect(sent(fetchFn)[0]).toBe("/api/clock/work-from-home/7/end/");
    expect(ended.endsOn).toBeNull();
  });

  it("a conflict comes back as the server's reason", async () => {
    const detail = "These dates are no longer waiting for an answer.";

    const refused = answerWorkFromHome(7, "approve", answering(jsonResponse({ detail }, 409)));

    await expect(refused).rejects.toThrow(detail);
  });
});
