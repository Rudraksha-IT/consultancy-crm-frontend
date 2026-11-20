import { fetchCountedOwingStudents } from "./fees";
import { fetchFeesByType, fetchFeeTypeStudents } from "./feesByType";
import { jsonResponse } from "../core/test-helpers";

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

const TOTALS = {
  to_collect: 125000,
  received: 95000,
  remaining: 30000,
  lost_not_counted: 25000,
  owing: 1,
};

describe("fetchFeesByType", () => {
  const ANSWER = {
    totals: TOTALS,
    fee_types: [
      { fee_type: { id: 3, name: "Visa fee", hidden: false }, fees: 80000, received: 66000 },
      { fee_type: { id: 5, name: "PTE class", hidden: true }, fees: 0, received: 5000 },
    ],
  };

  it("GETs the totals and one row per Fee Type, in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(ANSWER));

    const found = await fetchFeesByType(fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/fees-by-type/");
    expect(found).toEqual({
      totals: {
        toCollect: 125000,
        received: 95000,
        remaining: 30000,
        lostNotCounted: 25000,
        owing: 1,
      },
      feeTypes: [
        { feeType: { id: 3, name: "Visa fee", hidden: false }, fees: 80000, received: 66000 },
        { feeType: { id: 5, name: "PTE class", hidden: true }, fees: 0, received: 5000 },
      ],
    });
  });

  it.each([
    ["a negative amount", { ...ANSWER, totals: { ...TOTALS, received: -1 } }],
    ["a missing total", { ...ANSWER, totals: { ...TOTALS, remaining: undefined } }],
    ["a name that isn't text", { ...ANSWER, fee_types: [{ fee_type: { id: 1, name: 5 } }] }],
  ])("refuses an answer with %s", async (_, body) => {
    await expect(fetchFeesByType(answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("fetchFeeTypeStudents", () => {
  const ROW = {
    student: { id: 9, name: "Hari Lama", stage: "lost" },
    lost_reason: "Went with another office",
    fee: 40000,
    paid: 15000,
    still_to_pay: 25000,
  };
  const PAGE = {
    fee_type: { id: 3, name: "Visa fee", hidden: false },
    fees: 80000,
    received: 66000,
    part: "lost",
    count: 1,
    page: 2,
    page_size: 25,
    results: [ROW],
  };

  it("GETs one page of one part, in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const found = await fetchFeeTypeStudents(3, "lost", 2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/fees-by-type/3/?part=lost&page=2");
    expect(found).toEqual({
      feeType: { id: 3, name: "Visa fee", hidden: false },
      fees: 80000,
      received: 66000,
      count: 1,
      page: 2,
      pageSize: 25,
      rows: [
        {
          student: { id: 9, name: "Hari Lama", stage: "lost" },
          lostReason: "Went with another office",
          fee: 40000,
          paid: 15000,
          stillToPay: 25000,
        },
      ],
    });
  });

  it("refuses an unknown Stage", async () => {
    const body = { ...PAGE, results: [{ ...ROW, student: { ...ROW.student, stage: "gone" } }] };

    await expect(
      fetchFeeTypeStudents(3, "counted", 1, answering(jsonResponse(body))),
    ).rejects.toThrow();
  });
});

describe("fetchCountedOwingStudents", () => {
  it("asks for who still owes, leaving out Lost Students", async () => {
    const fetchFn = answering(
      jsonResponse({
        count: 0,
        page: 1,
        page_size: 25,
        totals: { agreed: 0, collected: 0, still_to_collect: 0, students: 0, owing: 0 },
        results: [],
      }),
    );

    await fetchCountedOwingStudents(1, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/student-fees/?page=1&leave_out=lost");
  });
});
