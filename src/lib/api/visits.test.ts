import { InvalidFieldsError } from "./errors";
import { jsonResponse } from "./test-helpers";
import { fetchStudentProgress, fetchStudentVisits, fetchTodaysVisits, logVisit } from "./visits";

const VISIT = {
  id: 3,
  kind: "follow_up",
  purpose: "Bringing documents: Passport copy",
  at: "2026-11-03T10:15:00+05:45",
  recorded_by: { id: 4, name: "Ramesh KC" },
};

function answering(response: Response) {
  return vi.fn<typeof fetch>(() => Promise.resolve(response));
}

function sent(fetchFn: ReturnType<typeof answering>): [unknown, RequestInit | undefined] {
  const call = fetchFn.mock.calls[0];
  return [call?.[0], call?.[1]];
}

describe("fetchTodaysVisits", () => {
  it("returns today's Visits with their Student in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({
        count: 1,
        results: [
          { ...VISIT, student: { id: 7, name: "Sita Gurung", note_first_line: "Wants Sydney" } },
        ],
      }),
    );

    const today = await fetchTodaysVisits(fetchFn);

    expect(sent(fetchFn)[0]).toBe("/api/visits/today/");
    expect(today).toEqual({
      count: 1,
      visits: [
        {
          id: 3,
          kind: "follow_up",
          purpose: "Bringing documents: Passport copy",
          at: "2026-11-03T10:15:00+05:45",
          recordedBy: { id: 4, name: "Ramesh KC" },
          student: { id: 7, name: "Sita Gurung", noteFirstLine: "Wants Sydney" },
        },
      ],
    });
  });

  it("refuses an answer that isn't a Visit", async () => {
    const fetchFn = answering(
      jsonResponse({ count: 1, results: [{ ...VISIT, kind: "walk_in", student: {} }] }),
    );

    await expect(fetchTodaysVisits(fetchFn)).rejects.toThrow();
  });
});

describe("fetchStudentVisits", () => {
  it("asks for one page and keeps who logged a Visit even after they left", async () => {
    const old = { ...VISIT, recorded_by: { id: null, name: "Old Desk" } };
    const fetchFn = answering(jsonResponse({ count: 51, page: 2, page_size: 50, results: [old] }));

    const page = await fetchStudentVisits(7, 2, fetchFn);

    expect(sent(fetchFn)[0]).toBe("/api/students/7/visits/?page=2");
    expect(page.count).toBe(51);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(50);
    expect(page.visits[0]?.recordedBy).toEqual({ id: null, name: "Old Desk" });
  });
});

describe("logVisit", () => {
  it("posts why they came and returns the Visit", async () => {
    const fetchFn = answering(jsonResponse(VISIT, 201));

    const visit = await logVisit(
      7,
      { reason: "bringing_documents", details: "Passport copy" },
      fetchFn,
    );

    const [path, init] = sent(fetchFn);
    expect(path).toBe("/api/students/7/visits/");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(typeof init?.body === "string" ? init.body : "")).toEqual({
      reason: "bringing_documents",
      details: "Passport copy",
    });
    expect(visit.purpose).toBe("Bringing documents: Passport copy");
  });

  it("names refused fields", async () => {
    const fetchFn = answering(
      jsonResponse({ details: ["Ensure this field has no more than 200 characters."] }, 400),
    );

    const failure = logVisit(7, { reason: "other", details: "x" }, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(failure).rejects.toMatchObject({
      fieldErrors: { details: ["Ensure this field has no more than 200 characters."] },
    });
  });
});

describe("fetchStudentProgress", () => {
  it("returns the Stage, how far along and the next step", async () => {
    const fetchFn = answering(
      jsonResponse({
        stage: "lead",
        percent: 8,
        next_step: "Have the first counselling session",
        is_done: false,
      }),
    );

    const progress = await fetchStudentProgress(7, fetchFn);

    expect(sent(fetchFn)[0]).toBe("/api/students/7/progress/");
    expect(progress).toEqual({
      stage: "lead",
      percent: 8,
      nextStep: "Have the first counselling session",
      isDone: false,
    });
  });

  it("refuses an answer without the done flag", async () => {
    const fetchFn = answering(jsonResponse({ stage: "lead", percent: 8, next_step: "x" }));

    await expect(fetchStudentProgress(7, fetchFn)).rejects.toThrow();
  });

  it.each(["onboarded", "completed"])("refuses the Stage %s, which is gone", async (stage) => {
    const fetchFn = answering(jsonResponse({ stage, percent: 32, next_step: "x", is_done: false }));

    await expect(fetchStudentProgress(7, fetchFn)).rejects.toThrow();
  });

  it("refuses a percent over 100", async () => {
    const fetchFn = answering(
      jsonResponse({ stage: "lead", percent: 101, next_step: "x", is_done: false }),
    );

    await expect(fetchStudentProgress(7, fetchFn)).rejects.toThrow();
  });
});
