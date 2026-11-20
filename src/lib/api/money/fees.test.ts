import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { addFee, changeFee, deleteFee, fetchOwingStudents, fetchStudentFees } from "./fees";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

const FEE = {
  id: uid(31),
  fee_type: { id: 3, name: "Visa fee" },
  note: "",
  amount: 40000,
  added_by: { name: "Bikash Thapa" },
  added_at: "2026-11-03T10:15:00+05:45",
};

const STUDENT_FEES = {
  fees: [FEE],
  total: 40000,
  balance: { paid: 45000, still_to_pay: 0, overpaid: 5000 },
};

const FRONTEND_FEES = {
  fees: [
    {
      id: uid(31),
      feeType: { id: 3, name: "Visa fee" },
      note: "",
      amount: 40000,
      addedBy: { name: "Bikash Thapa" },
    },
  ],
  total: 40000,
  balance: { paid: 45000, stillToPay: 0, overpaid: 5000 },
};

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = fetchFn.mock.calls[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

describe("fetchStudentFees", () => {
  it("GETs the Student's Fees and Balance in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(STUDENT_FEES));

    const fees = await fetchStudentFees(uid(7), fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/students/${uid(7)}/fees/`);
    expect(fees).toEqual(FRONTEND_FEES);
  });

  it("has no Balance for a counsellor", async () => {
    const fetchFn = answering(jsonResponse({ ...STUDENT_FEES, balance: null }));

    expect((await fetchStudentFees(uid(7), fetchFn)).balance).toBeNull();
  });

  it.each([
    ["a negative amount", { ...STUDENT_FEES, fees: [{ ...FEE, amount: -1 }] }],
    ["a decimal total", { ...STUDENT_FEES, total: 1.5 }],
    ["a missing balance", { fees: [], total: 0 }],
    [
      "a negative balance",
      { ...STUDENT_FEES, balance: { paid: 0, still_to_pay: -1, overpaid: 0 } },
    ],
    ["a text amount", { ...STUDENT_FEES, fees: [{ ...FEE, amount: "40000" }] }],
  ])("refuses an answer with %s", async (_, body) => {
    await expect(fetchStudentFees(uid(7), answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("addFee", () => {
  it("POSTs the Fee Type, note and amount and returns the Student's Fees", async () => {
    const fetchFn = answering(jsonResponse(STUDENT_FEES, 201));

    const fees = await addFee(uid(7), { feeTypeId: 3, note: "", amount: 40000 }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/students/${uid(7)}/fees/`);
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(sentBody(fetchFn)).toEqual({ fee_type: 3, note: "", amount: 40000 });
    expect(fees).toEqual(FRONTEND_FEES);
  });

  it("names refused fields", async () => {
    const fetchFn = answering(
      jsonResponse({ fee_type: ["Choose a Fee Type."], amount: ["Too big."] }, 400),
    );

    const failure = addFee(uid(7), { feeTypeId: null, note: "", amount: 0 }, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(failure).rejects.toMatchObject({
      fieldErrors: { feeTypeId: ["Choose a Fee Type."], amount: ["Too big."] },
    });
  });

  it("passes on a refusal that is not about the fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Not your Student." }, 403));

    await expect(
      addFee(uid(7), { feeTypeId: 3, note: "", amount: 1 }, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("changeFee", () => {
  it("PUTs the new Fee Type, note and amount", async () => {
    const fetchFn = answering(jsonResponse(STUDENT_FEES));

    await changeFee(uid(31), { feeTypeId: 7, note: "embassy", amount: 45000 }, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/fees/${uid(31)}/`);
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(sentBody(fetchFn)).toEqual({ fee_type: 7, note: "embassy", amount: 45000 });
  });

  it("names refused fields", async () => {
    const fetchFn = answering(jsonResponse({ amount: ["Enter a whole amount."] }, 400));

    await expect(
      changeFee(uid(31), { feeTypeId: 3, note: "", amount: 0 }, fetchFn),
    ).rejects.toMatchObject({
      fieldErrors: { amount: ["Enter a whole amount."] },
    });
  });
});

describe("deleteFee", () => {
  it("DELETEs the Fee", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deleteFee(uid(31), fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe(`/api/fees/${uid(31)}/`);
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});

describe("fetchOwingStudents", () => {
  const PAGE = {
    count: 1,
    page: 1,
    page_size: 25,
    totals: { agreed: 170000, collected: 40000, still_to_collect: 130000, students: 4, owing: 2 },
    results: [
      { student: { id: uid(3), name: "Sita Karki" }, fees: 80000, paid: 0, still_to_pay: 80000 },
    ],
  };

  it("GETs one page of who still owes, with the totals, in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const page = await fetchOwingStudents(2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/student-fees/?page=2");
    expect(page).toEqual({
      count: 1,
      page: 1,
      pageSize: 25,
      totals: { agreed: 170000, collected: 40000, stillToCollect: 130000, students: 4, owing: 2 },
      rows: [
        { student: { id: uid(3), name: "Sita Karki" }, fees: 80000, paid: 0, stillToPay: 80000 },
      ],
    });
  });

  it("refuses an answer missing its totals", async () => {
    const withoutTotals = { ...PAGE, totals: undefined };

    await expect(fetchOwingStudents(1, answering(jsonResponse(withoutTotals)))).rejects.toThrow();
  });
});
