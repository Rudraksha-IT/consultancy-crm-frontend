import { fetchPipeline, fetchProgress, fetchWaiting } from "./home";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const ROW = {
  student: {
    id: uid(7),
    name: "Sita Gurung",
    stage: "applying",
    country: "australia",
    assigned_counsellor: { id: uid(5), name: "Bikash Thapa" },
  },
  percent: 45,
  next_step: "Waiting for an offer, Deakin University",
  is_done: false,
  documents: { done: 5, total: 9, rejected: 1, waiting: 2, missing: 3 },
};

const COUNTS = {
  lead: 4,
  counselling: 3,
  applying: 2,
  offer: 2,
  visa: 2,
  lost: 2,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>(() => Promise.resolve(response));
}

function sentPath(fetchFn: ReturnType<typeof answering>): unknown {
  return fetchFn.mock.calls[0]?.[0];
}

describe("fetchProgress", () => {
  it("asks for whose Students and how many, and returns them in frontend naming", async () => {
    const fetchFn = answering(jsonResponse({ count: 12, results: [ROW] }));

    const found = await fetchProgress({ mine: true, limit: 6 }, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/home/progress/?counsellor=me&limit=6");
    expect(found.count).toBe(12);
    expect(found.rows[0]).toEqual({
      student: {
        id: uid(7),
        name: "Sita Gurung",
        stage: "applying",
        country: "australia",
        assignedCounsellor: { id: uid(5), name: "Bikash Thapa" },
      },
      percent: 45,
      nextStep: "Waiting for an offer, Deakin University",
      isDone: false,
      documents: { done: 5, total: 9, rejected: 1, waiting: 2, missing: 3 },
    });
  });

  it("asks for anyone's Students", async () => {
    const fetchFn = answering(jsonResponse({ count: 0, results: [] }));

    await fetchProgress({ mine: false, limit: 6 }, fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/home/progress/?counsellor=any&limit=6");
  });

  it.each([
    ["an unknown Stage", { ...ROW, student: { ...ROW.student, stage: "graduated" } }],
    ["a percent over 100", { ...ROW, percent: 101 }],
    ["a missing next step", { ...ROW, next_step: undefined }],
    ["a missing done flag", { ...ROW, is_done: undefined }],
    ["a done flag that is not true or false", { ...ROW, is_done: "yes" }],
    ["negative counts", { ...ROW, documents: { ...ROW.documents, missing: -1 } }],
  ])("refuses an answer with %s", async (_, row) => {
    const fetchFn = answering(jsonResponse({ count: 1, results: [row] }));

    await expect(fetchProgress({ mine: true, limit: 6 }, fetchFn)).rejects.toThrow();
  });
});

describe("fetchPipeline", () => {
  it("returns the count per Stage", async () => {
    const fetchFn = answering(jsonResponse({ counts: COUNTS }));

    expect(await fetchPipeline(fetchFn)).toEqual(COUNTS);
    expect(sentPath(fetchFn)).toBe("/api/home/pipeline/");
  });

  it("refuses an answer missing a Stage", async () => {
    const withoutLost = Object.fromEntries(
      Object.entries(COUNTS).filter(([stage]) => stage !== "lost"),
    );
    const fetchFn = answering(jsonResponse({ counts: withoutLost }));

    await expect(fetchPipeline(fetchFn)).rejects.toThrow();
  });
});

const WAITING = {
  documents_waiting: 3,
  transfer_requests_waiting: 1,
  visa_appointments: {
    count: 6,
    results: [
      {
        visa_id: uid(4),
        student: { id: uid(7), name: "Sita Gurung" },
        kind: "medical",
        at: "2026-11-07T14:00",
      },
    ],
  },
};

describe("fetchWaiting", () => {
  it("returns what waits on me in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(WAITING));

    const found = await fetchWaiting(fetchFn);

    expect(sentPath(fetchFn)).toBe("/api/home/waiting/");
    expect(found).toEqual({
      documents: 3,
      transferRequests: 1,
      inBin: 0,
      workFromHome: { count: 0, firstStaffId: null },
      appointmentCount: 6,
      appointments: [
        {
          visaId: uid(4),
          student: { id: uid(7), name: "Sita Gurung" },
          kind: "medical",
          at: "2026-11-07T14:00",
        },
      ],
    });
  });

  it.each([
    { ...WAITING, documents_waiting: -1 },
    { ...WAITING, transfer_requests_waiting: "1" },
    { ...WAITING, visa_appointments: { count: 1, results: [{ visa_id: uid(4) }] } },
    {
      ...WAITING,
      visa_appointments: {
        count: 1,
        results: [
          { visa_id: uid(4), student: { id: uid(7), name: "S" }, kind: "medical", at: "<script>" },
        ],
      },
    },
    {
      ...WAITING,
      visa_appointments: {
        count: 1,
        results: [
          {
            visa_id: uid(4),
            student: { id: uid(7), name: "S" },
            kind: "x",
            at: "2026-11-07T14:00",
          },
        ],
      },
    },
    { documents_waiting: 0 },
  ])("refuses an answer of the wrong shape", async (answer) => {
    await expect(fetchWaiting(answering(jsonResponse(answer)))).rejects.toThrow();
  });
});
