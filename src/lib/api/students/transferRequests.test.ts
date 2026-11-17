import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { jsonResponse } from "../core/test-helpers";
import {
  approveTransferRequest,
  askToTakeStudent,
  cancelTransferRequest,
  declineTransferRequest,
  fetchTransferRequestCount,
  fetchTransferRequests,
} from "./transferRequests";

const WAITING = {
  id: 801,
  student: { id: 13, name: "Sarina Khadka" },
  asked_by: { id: 3, name: "Anjali Gurung" },
  reason: "Her sister is my Student.",
  asked_at: "2026-10-27T10:35:00+00:00",
  status: "waiting",
  counsellor: { id: 2, name: "Bikash Thapa" },
  answered_by: null,
  answer_reason: "",
  answered_at: null,
  taken_from: "",
  can_answer: true,
  can_cancel: false,
};

const WAITING_IN_FRONTEND_NAMING = {
  id: 801,
  student: { id: 13, name: "Sarina Khadka" },
  askedBy: { id: 3, name: "Anjali Gurung" },
  reason: "Her sister is my Student.",
  askedAt: "2026-10-27T10:35:00+00:00",
  status: "waiting",
  counsellor: { id: 2, name: "Bikash Thapa" },
  answeredBy: null,
  answerReason: "",
  answeredAt: null,
  takenFrom: "",
  canAnswer: true,
  canCancel: false,
};

const DECLINED = {
  ...WAITING,
  id: 804,
  status: "declined",
  answered_by: { name: "Nabin Adhikari (Platform Admin)", is_platform_admin: true },
  answer_reason: "Not now.",
  answered_at: "2026-10-28T09:00:00+00:00",
  can_answer: false,
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sentJson(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function pageOf(results: unknown[], waiting = 1) {
  return { count: results.length, page: 1, page_size: 20, waiting_for_me_count: waiting, results };
}

describe("fetchTransferRequests", () => {
  it("GETs one box's page, in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(pageOf([WAITING, DECLINED], 3)));

    const page = await fetchTransferRequests("sent", 2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/transfer-requests/?box=sent&page=2");
    expect(page.waitingForMeCount).toBe(3);
    expect(page.count).toBe(2);
    expect(page.requests[0]).toEqual(WAITING_IN_FRONTEND_NAMING);
    expect(page.requests[1]).toMatchObject({
      status: "declined",
      answeredBy: { name: "Nabin Adhikari (Platform Admin)", isPlatformAdmin: true },
      answerReason: "Not now.",
    });
  });

  it.each([
    ["an unknown status", { ...WAITING, status: "lost" }],
    ["an empty reason", { ...WAITING, reason: "" }],
    ["a text id", { ...WAITING, id: "801" }],
    ["a date that isn't one", { ...WAITING, asked_at: "yesterday" }],
    ["a missing permission", { ...WAITING, can_answer: undefined }],
  ])("refuses an answer with %s", async (_, item) => {
    const fetchFn = answering(jsonResponse(pageOf([item])));

    await expect(fetchTransferRequests("waiting_for_me", 1, fetchFn)).rejects.toThrow(
      ApiRequestError,
    );
  });

  it("refuses a negative count", async () => {
    const fetchFn = answering(jsonResponse(pageOf([], -1)));

    await expect(fetchTransferRequests("all", 1, fetchFn)).rejects.toThrow(ApiRequestError);
  });
});

describe("fetchTransferRequestCount", () => {
  it("GETs how many wait for my answer", async () => {
    const fetchFn = answering(jsonResponse({ count: 4 }));

    await expect(fetchTransferRequestCount(fetchFn)).resolves.toBe(4);
    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/transfer-requests/count/");
  });

  it("refuses a count that isn't a whole number", async () => {
    const fetchFn = answering(jsonResponse({ count: 1.5 }));

    await expect(fetchTransferRequestCount(fetchFn)).rejects.toThrow(ApiRequestError);
  });
});

describe("askToTakeStudent", () => {
  it("POSTs the reason for the Student and returns the request", async () => {
    const fetchFn = answering(jsonResponse(WAITING, 201));

    const sent = await askToTakeStudent(13, "Her sister is my Student.", fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/students/13/transfer-requests/");
    expect(init?.method).toBe("POST");
    expect(sentJson(init)).toEqual({ reason: "Her sister is my Student." });
    expect(sent.id).toBe(801);
  });

  it("turns a refused reason into a field error", async () => {
    const fetchFn = answering(
      jsonResponse({ reason: ["Say why you should take this Student."] }, 400),
    );

    const asking = askToTakeStudent(13, "", fetchFn);

    await expect(asking).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(asking).rejects.toMatchObject({
      fieldErrors: { reason: ["Say why you should take this Student."] },
    });
  });

  it("keeps a conflict as an API error", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Someone has already asked." }, 409));

    const asking = askToTakeStudent(13, "x", fetchFn);

    await expect(asking).rejects.toBeInstanceOf(ApiRequestError);
    await expect(asking).rejects.toMatchObject({ status: 409 });
  });
});

describe("answering a request", () => {
  it("approves with an empty body", async () => {
    const fetchFn = answering(jsonResponse({ ...WAITING, status: "approved" }));

    const approved = await approveTransferRequest(801, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/transfer-requests/801/approve/");
    expect(sentJson(init)).toEqual({});
    expect(approved.status).toBe("approved");
  });

  it("declines with the reason, which may be empty", async () => {
    const fetchFn = answering(jsonResponse(DECLINED));

    await declineTransferRequest(801, "", fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/transfer-requests/801/decline/");
    expect(sentJson(init)).toEqual({ reason: "" });
  });

  it("turns a refused decline reason into a field error", async () => {
    const fetchFn = answering(jsonResponse({ reason: ["Too long."] }, 400));

    await expect(declineTransferRequest(801, "x", fetchFn)).rejects.toBeInstanceOf(
      InvalidFieldsError,
    );
  });

  it("cancels with an empty body", async () => {
    const fetchFn = answering(jsonResponse({ ...WAITING, status: "cancelled" }));

    const cancelled = await cancelTransferRequest(801, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/transfer-requests/801/cancel/");
    expect(cancelled.status).toBe("cancelled");
  });
});
