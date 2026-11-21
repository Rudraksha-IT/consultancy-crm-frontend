import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import {
  changePayment,
  deletePayment,
  fetchPayments,
  fetchReceipt,
  recordPayments,
} from "./payments";
import { jsonResponse } from "../core/test-helpers";
import { uid } from "@/test/ids";

/** One Payment as the Payments list answers it. */
const PAYMENT = {
  id: uid(412),
  receipt_number: "000412",
  student: { id: uid(7), name: "Sita Gurung", phone: "9841000001" },
  amount: 25000,
  paid_on: "2026-11-02",
  method: "esewa",
  fee_type: { id: uid(1), name: "Application fee" },
  note: "first half",
  recorded_by: { name: "Ramesh KC" },
  recorded_at: "2026-11-02T10:15:00+05:45",
};

/** The receipt Payment 412 is on: it and an IELTS class line, with their total. */
const RECEIPT = {
  ...PAYMENT,
  lines: [
    {
      id: uid(412),
      fee_type: { id: uid(1), name: "Application fee" },
      note: "first half",
      amount: 25000,
      paid_on: "2026-11-02",
      method: "esewa",
    },
    {
      id: uid(413),
      fee_type: { id: uid(4), name: "IELTS class" },
      note: "",
      amount: 10000,
      paid_on: "2026-11-02",
      method: "esewa",
    },
  ],
  total: 35000,
};

const PAYMENT_IN_FRONTEND_NAMING = {
  id: uid(412),
  receiptNumber: "000412",
  student: { id: uid(7), name: "Sita Gurung", phone: "9841000001" },
  amount: 25000,
  paidOn: "2026-11-02",
  method: "esewa",
  feeType: { id: uid(1), name: "Application fee" },
  note: "first half",
  recordedBy: { name: "Ramesh KC" },
};

const RECEIPT_IN_FRONTEND_NAMING = {
  ...PAYMENT_IN_FRONTEND_NAMING,
  lines: [
    {
      id: uid(412),
      feeType: { id: uid(1), name: "Application fee" },
      note: "first half",
      amount: 25000,
      paidOn: "2026-11-02",
      method: "esewa",
    },
    {
      id: uid(413),
      feeType: { id: uid(4), name: "IELTS class" },
      note: "",
      amount: 10000,
      paidOn: "2026-11-02",
      method: "esewa",
    },
  ],
  total: 35000,
};

const NEW_PAYMENT = {
  amount: 25000,
  paidOn: "2026-11-02",
  method: "esewa",
  feeTypeId: uid(1),
  note: "first half",
} as const;

const NEW_PAYMENTS = {
  paidOn: "2026-11-02",
  method: "esewa",
  lines: [
    { feeTypeId: uid(1), note: "first half", amount: 25000 },
    { feeTypeId: uid(4), note: "", amount: 10000 },
  ],
} as const;

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

async function refusalOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.catch((error: unknown) => error);
}

describe("recordPayments", () => {
  it("POSTs the visit with every line in API naming and returns the receipt", async () => {
    const fetchFn = answering(jsonResponse(RECEIPT, 201));

    const receipt = await recordPayments(uid(7), NEW_PAYMENTS, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/students/${uid(7)}/payments/`);
    expect(init?.method).toBe("POST");
    expect(typeof init?.body === "string" ? JSON.parse(init.body) : undefined).toEqual({
      paid_on: "2026-11-02",
      method: "esewa",
      lines: [
        { fee_type: uid(1), note: "first half", amount: 25000 },
        { fee_type: uid(4), note: "", amount: 10000 },
      ],
    });
    expect(receipt).toEqual(RECEIPT_IN_FRONTEND_NAMING);
  });

  it("names the visit's refused fields and each refused line's fields by form names", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          paid_on: ["Enter a date from 1 Jan 2000 to today."],
          lines: [
            {},
            {
              amount: ["Enter a whole amount from NPR 1 to NPR 10,00,00,000."],
              fee_type: ["Choose a Fee Type."],
              note: ["Add a short note for Other."],
            },
          ],
        },
        400,
      ),
    );

    const error = await refusalOf(recordPayments(uid(7), NEW_PAYMENTS, fetchFn));

    expect(error).toEqual(
      new InvalidFieldsError({
        paidOn: ["Enter a date from 1 Jan 2000 to today."],
        "lines.1.amount": ["Enter a whole amount from NPR 1 to NPR 10,00,00,000."],
        "lines.1.feeTypeId": ["Choose a Fee Type."],
        "lines.1.note": ["Add a short note for Other."],
      }),
    );
  });

  it("names a refusal of the lines as a whole", async () => {
    const message = "Add 1 to 10 lines, each with a Fee Type and an amount.";
    const fetchFn = answering(
      jsonResponse({ lines: [message], method: ["Choose how they paid."] }, 400),
    );

    const error = await refusalOf(recordPayments(uid(7), NEW_PAYMENTS, fetchFn));

    expect(error).toEqual(
      new InvalidFieldsError({ lines: [message], method: ["Choose how they paid."] }),
    );
  });

  it.each([
    { detail: ["Unknown field."] },
    { lines: [{ detail: ["Unknown field."] }] },
    { lines: "not a list" },
    { lines: [5] },
  ])("passes on a refusal it can't name a field for", async (body) => {
    const fetchFn = answering(jsonResponse(body, 400));

    const error = await refusalOf(recordPayments(uid(7), NEW_PAYMENTS, fetchFn));

    expect(error).toBeInstanceOf(ApiRequestError);
  });

  it("passes other refusals on", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Teachers can't see Students." }, 403));

    await expect(recordPayments(uid(7), NEW_PAYMENTS, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it.each([
    { ...RECEIPT, amount: "25000" },
    { ...RECEIPT, method: "paypal" },
    { ...RECEIPT, paid_on: "02/11/2026" },
    { ...RECEIPT, student: null },
    { ...RECEIPT, lines: [] },
    { ...RECEIPT, lines: [{ ...RECEIPT.lines[0], amount: -1 }] },
    { ...RECEIPT, total: "35000" },
    PAYMENT,
  ])("refuses an answer that isn't a receipt", async (body) => {
    const fetchFn = answering(jsonResponse(body, 201));

    await expect(recordPayments(uid(7), NEW_PAYMENTS, fetchFn)).rejects.toThrow();
  });
});

describe("fetchReceipt", () => {
  it("GETs the receipt a Payment is on, with every line and the total", async () => {
    const fetchFn = answering(jsonResponse(RECEIPT));

    const receipt = await fetchReceipt(uid(413), fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/payments/${uid(413)}/`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(receipt).toEqual(RECEIPT_IN_FRONTEND_NAMING);
  });

  it("passes a refusal on", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Only an Admin can see other Payments." }, 403),
    );

    await expect(fetchReceipt(uid(413), fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

const PAGE = { count: 1, page: 1, page_size: 25, total: 25000, results: [PAYMENT] };

describe("fetchPayments", () => {
  it("GETs the filters that are set, in API naming, and returns the page with its total", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const page = await fetchPayments(
      { from: "2026-10-01", to: "2026-11-02", search: "Sita", feeTypeId: null, studentId: null },
      2,
      fetchFn,
    );

    const [path] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/payments/?from=2026-10-01&to=2026-11-02&q=Sita&page=2");
    expect(page).toEqual({
      count: 1,
      page: 1,
      pageSize: 25,
      total: 25000,
      rows: [expect.objectContaining({ id: uid(412), receiptNumber: "000412", amount: 25000 })],
    });
  });

  it("asks for one Student's Payments", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    await fetchPayments(
      { from: "", to: "", search: "", feeTypeId: uid(3), studentId: uid(7) },
      1,
      fetchFn,
    );

    const [path] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/payments/?student=${uid(7)}&fee_type=${uid(3)}&page=1`);
  });

  it("refuses an answer that isn't a page of Payments", async () => {
    const fetchFn = answering(jsonResponse({ ...PAGE, total: "lots" }));

    await expect(
      fetchPayments({ from: "", to: "", search: "", feeTypeId: null, studentId: null }, 1, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("names refused filters by their form names", async () => {
    const fetchFn = answering(
      jsonResponse({ to: ["Choose an end date on or after the start date."] }, 400),
    );

    const failure = fetchPayments(
      { from: "2026-11-02", to: "2026-11-01", search: "", feeTypeId: null, studentId: null },
      1,
      fetchFn,
    );

    await expect(failure).rejects.toEqual(
      new InvalidFieldsError({ to: ["Choose an end date on or after the start date."] }),
    );
  });
});

describe("changePayment", () => {
  it("PUTs the whole Payment and returns it as it is now", async () => {
    const fetchFn = answering(jsonResponse({ ...RECEIPT, amount: 30000 }));

    const payment = await changePayment(uid(412), { ...NEW_PAYMENT, amount: 30000 }, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/payments/${uid(412)}/`);
    expect(init?.method).toBe("PUT");
    expect(typeof init?.body === "string" ? JSON.parse(init.body) : undefined).toEqual({
      amount: 30000,
      paid_on: "2026-11-02",
      method: "esewa",
      fee_type: uid(1),
      note: "first half",
    });
    expect(payment).toStrictEqual({ ...PAYMENT_IN_FRONTEND_NAMING, amount: 30000 });
  });

  it("names a refused Fee Type and note by their form names", async () => {
    const fetchFn = answering(
      jsonResponse(
        { fee_type: ["Choose a Fee Type."], note: ["Add a short note for Other."] },
        400,
      ),
    );

    await expect(changePayment(uid(412), NEW_PAYMENT, fetchFn)).rejects.toEqual(
      new InvalidFieldsError({
        feeTypeId: ["Choose a Fee Type."],
        note: ["Add a short note for Other."],
      }),
    );
  });

  it("names refused fields by their form names", async () => {
    const fetchFn = answering(
      jsonResponse({ paid_on: ["Enter a date from 1 Jan 2000 to today."] }, 400),
    );

    await expect(changePayment(uid(412), NEW_PAYMENT, fetchFn)).rejects.toEqual(
      new InvalidFieldsError({ paidOn: ["Enter a date from 1 Jan 2000 to today."] }),
    );
  });

  it("passes on a refusal", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Only an Admin can change or delete a Payment." }, 403),
    );

    await expect(changePayment(uid(412), NEW_PAYMENT, fetchFn)).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe("deletePayment", () => {
  it("DELETEs the Payment", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deletePayment(uid(412), fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe(`/api/payments/${uid(412)}/`);
    expect(init?.method).toBe("DELETE");
  });

  it("rejects when it isn't deleted", async () => {
    const fetchFn = answering(jsonResponse({}, 404));

    await expect(deletePayment(uid(412), fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
