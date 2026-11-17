import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { changePayment, deletePayment, fetchPayments, recordPayment } from "./payments";
import { jsonResponse } from "../core/test-helpers";

const RECEIPT = {
  id: 412,
  receipt_number: "000412",
  student: { id: 7, name: "Sita Gurung", phone: "9841000001" },
  amount: 25000,
  paid_on: "2026-11-02",
  method: "esewa",
  purpose: "Application processing fee",
  recorded_by: { name: "Ramesh KC" },
  recorded_at: "2026-11-02T10:15:00+05:45",
};

const NEW_PAYMENT = {
  amount: 25000,
  paidOn: "2026-11-02",
  method: "esewa",
  purpose: "Application processing fee",
} as const;

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

describe("recordPayment", () => {
  it("POSTs the Payment in API naming and returns the receipt in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(RECEIPT, 201));

    const receipt = await recordPayment(7, NEW_PAYMENT, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/students/7/payments/");
    expect(init?.method).toBe("POST");
    expect(typeof init?.body === "string" ? JSON.parse(init.body) : undefined).toEqual({
      amount: 25000,
      paid_on: "2026-11-02",
      method: "esewa",
      purpose: "Application processing fee",
    });
    expect(receipt).toEqual({
      id: 412,
      receiptNumber: "000412",
      student: { id: 7, name: "Sita Gurung", phone: "9841000001" },
      amount: 25000,
      paidOn: "2026-11-02",
      method: "esewa",
      purpose: "Application processing fee",
      recordedBy: { name: "Ramesh KC" },
    });
  });

  it("names refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse(
        {
          amount: ["Enter a whole amount from NPR 1 to NPR 10,00,00,000."],
          paid_on: ["Enter a date from 1 Jan 2000 to today."],
        },
        400,
      ),
    );

    const error: unknown = await recordPayment(7, NEW_PAYMENT, fetchFn).catch((e: unknown) => e);

    if (!(error instanceof InvalidFieldsError)) throw new Error("expected InvalidFieldsError");
    expect(error.fieldErrors).toEqual({
      amount: ["Enter a whole amount from NPR 1 to NPR 10,00,00,000."],
      paidOn: ["Enter a date from 1 Jan 2000 to today."],
    });
  });

  it("passes other refusals on", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Teachers can't see Students." }, 403));

    await expect(recordPayment(7, NEW_PAYMENT, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });

  it.each([
    { ...RECEIPT, amount: "25000" },
    { ...RECEIPT, method: "paypal" },
    { ...RECEIPT, paid_on: "02/11/2026" },
    { ...RECEIPT, student: null },
  ])("refuses an answer that isn't a receipt", async (body) => {
    const fetchFn = answering(jsonResponse(body, 201));

    await expect(recordPayment(7, NEW_PAYMENT, fetchFn)).rejects.toThrow();
  });
});

const PAGE = { count: 1, page: 1, page_size: 25, total: 25000, results: [RECEIPT] };

describe("fetchPayments", () => {
  it("GETs the filters that are set, in API naming, and returns the page with its total", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    const page = await fetchPayments(
      { from: "2026-10-01", to: "2026-11-02", search: "Sita", purpose: "", studentId: null },
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
      rows: [expect.objectContaining({ id: 412, receiptNumber: "000412", amount: 25000 })],
    });
  });

  it("asks for one Student's Payments", async () => {
    const fetchFn = answering(jsonResponse(PAGE));

    await fetchPayments(
      { from: "", to: "", search: "", purpose: "Visa", studentId: 7 },
      1,
      fetchFn,
    );

    const [path] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/payments/?student=7&purpose=Visa&page=1");
  });

  it("refuses an answer that isn't a page of Payments", async () => {
    const fetchFn = answering(jsonResponse({ ...PAGE, total: "lots" }));

    await expect(
      fetchPayments({ from: "", to: "", search: "", purpose: "", studentId: null }, 1, fetchFn),
    ).rejects.toBeInstanceOf(ApiRequestError);
  });

  it("names refused filters by their form names", async () => {
    const fetchFn = answering(
      jsonResponse({ to: ["Choose an end date on or after the start date."] }, 400),
    );

    const failure = fetchPayments(
      { from: "2026-11-02", to: "2026-11-01", search: "", purpose: "", studentId: null },
      1,
      fetchFn,
    );

    await expect(failure).rejects.toEqual(
      new InvalidFieldsError({ to: ["Choose an end date on or after the start date."] }),
    );
  });
});

describe("changePayment", () => {
  it("PUTs the whole Payment and returns its receipt", async () => {
    const fetchFn = answering(jsonResponse({ ...RECEIPT, amount: 30000 }));

    const receipt = await changePayment(412, { ...NEW_PAYMENT, amount: 30000 }, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/payments/412/");
    expect(init?.method).toBe("PUT");
    expect(typeof init?.body === "string" ? JSON.parse(init.body) : undefined).toEqual({
      amount: 30000,
      paid_on: "2026-11-02",
      method: "esewa",
      purpose: "Application processing fee",
    });
    expect(receipt.amount).toBe(30000);
  });

  it("names refused fields by their form names", async () => {
    const fetchFn = answering(
      jsonResponse({ paid_on: ["Enter a date from 1 Jan 2000 to today."] }, 400),
    );

    await expect(changePayment(412, NEW_PAYMENT, fetchFn)).rejects.toEqual(
      new InvalidFieldsError({ paidOn: ["Enter a date from 1 Jan 2000 to today."] }),
    );
  });

  it("passes on a refusal", async () => {
    const fetchFn = answering(
      jsonResponse({ detail: "Only an Admin can change or delete a Payment." }, 403),
    );

    await expect(changePayment(412, NEW_PAYMENT, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("deletePayment", () => {
  it("DELETEs the Payment", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deletePayment(412, fetchFn);

    const [path, init] = fetchFn.mock.calls[0] ?? [];
    expect(path).toBe("/api/payments/412/");
    expect(init?.method).toBe("DELETE");
  });

  it("rejects when it isn't deleted", async () => {
    const fetchFn = answering(jsonResponse({}, 404));

    await expect(deletePayment(412, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});
