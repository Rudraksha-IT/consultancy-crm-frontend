import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  addCommission,
  changeCommissionStatus,
  fetchCommission,
  fetchReceivedCommission,
} from "./commission";
import { jsonResponse } from "../core/test-helpers";

const COMMISSION = {
  id: 702,
  student: { id: 2, name: "Sita Karki" },
  university: { id: 4, name: "Federation University" },
  intake: "2027-02",
  amount: 290000,
  status: "claim_sent",
  received_on: null,
};

const FRONTEND_COMMISSION = {
  id: 702,
  student: { id: 2, name: "Sita Karki" },
  university: { id: 4, name: "Federation University" },
  intake: "2027-02",
  amount: 290000,
  status: "claim_sent",
  receivedOn: null,
};

const PAGE = {
  count: 1,
  page: 1,
  page_size: 25,
  totals: { waiting_for_enrolment: 0, claim_sent: 290000, received: 0, to_come: 290000 },
  results: [COMMISSION],
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = fetchFn.mock.calls[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

describe("fetchCommission", () => {
  it("GETs a page with the totals in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const page = await fetchCommission(2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/commission/?page=2");
    expect(page).toEqual({
      count: 1,
      page: 1,
      pageSize: 25,
      totals: { waitingForEnrolment: 0, claimSent: 290000, received: 0, toCome: 290000 },
      rows: [FRONTEND_COMMISSION],
    });
  });

  it("reads the day it was received", async () => {
    const received = { ...COMMISSION, status: "received", received_on: "2026-10-20" };
    const fetchFn = answering(jsonResponse({ ...PAGE, results: [received] }));

    expect((await fetchCommission(1, fetchFn)).rows[0]?.receivedOn).toBe("2026-10-20");
  });

  it.each([
    ["an unknown status", { ...PAGE, results: [{ ...COMMISSION, status: "paid" }] }],
    ["a bad intake", { ...PAGE, results: [{ ...COMMISSION, intake: "Feb 2027" }] }],
    ["a text amount", { ...PAGE, results: [{ ...COMMISSION, amount: "1" }] }],
    ["a bad day", { ...PAGE, results: [{ ...COMMISSION, received_on: "20/10/2026" }] }],
    ["no totals", { ...PAGE, totals: undefined }],
    ["a negative total", { ...PAGE, totals: { ...PAGE.totals, to_come: -1 } }],
  ])("refuses an answer with %s", async (_, body) => {
    await expect(fetchCommission(1, answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("addCommission", () => {
  const NEW = { studentId: 2, universityId: 4, intake: "2027-02", amount: 290000 };

  it("POSTs it in API naming and returns it", async () => {
    const fetchFn = answering(jsonResponse(COMMISSION, 201));

    const added = await addCommission(NEW, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/commission/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(sentBody(fetchFn)).toEqual({
      student: 2,
      university: 4,
      intake: "2027-02",
      amount: 290000,
    });
    expect(added).toEqual(FRONTEND_COMMISSION);
  });

  it("names refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ student: ["Choose a Student."], university: ["Choose a University."] }, 400),
    );

    await expect(addCommission(NEW, fetchFn)).rejects.toMatchObject({
      fieldErrors: { studentId: ["Choose a Student."], universityId: ["Choose a University."] },
    });
  });

  it("passes on a refusal that is not about the fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Only an Admin." }, 403));

    const failure = addCommission(NEW, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(ApiRequestError);
    await expect(failure).rejects.not.toBeInstanceOf(InvalidFieldsError);
  });
});

describe("changeCommissionStatus", () => {
  it("PUTs only the status", async () => {
    const fetchFn = answering(jsonResponse({ ...COMMISSION, status: "received" }));

    const changed = await changeCommissionStatus(702, "received", fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/commission/702/status/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(sentBody(fetchFn)).toEqual({ status: "received" });
    expect(changed.status).toBe("received");
  });
});

describe("fetchReceivedCommission", () => {
  it("GETs what was received between two days", async () => {
    const fetchFn = answering(jsonResponse({ total: 340000, count: 1 }));

    const received = await fetchReceivedCommission(
      { from: "2026-10-01", to: "2026-10-31" },
      fetchFn,
    );

    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "/api/accounts/commission/received/?from=2026-10-01&to=2026-10-31",
    );
    expect(received).toEqual({ total: 340000, count: 1 });
  });

  it("leaves out an open end", async () => {
    const fetchFn = answering(jsonResponse({ total: 0, count: 0 }));

    await fetchReceivedCommission({ from: "", to: "2026-10-31" }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/commission/received/?to=2026-10-31");
  });

  it("refuses a negative total", async () => {
    const fetchFn = answering(jsonResponse({ total: -1, count: 0 }));

    await expect(fetchReceivedCommission({ from: "", to: "" }, fetchFn)).rejects.toThrow();
  });
});
