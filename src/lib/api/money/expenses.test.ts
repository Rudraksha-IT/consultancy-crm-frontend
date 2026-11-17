import { ApiRequestError, InvalidFieldsError } from "../core/errors";
import { addExpense, changeExpense, deleteExpense, fetchExpenses } from "./expenses";
import { jsonResponse } from "../core/test-helpers";

const EXPENSE = {
  id: 605,
  spent_on: "2026-10-12",
  category: "electricity",
  paid_to: "Nepal Electricity Authority",
  amount: 6500,
  method: "khalti",
  recorded_by: { name: "Anita Admin" },
};

const FRONTEND_EXPENSE = {
  id: 605,
  spentOn: "2026-10-12",
  category: "electricity",
  paidTo: "Nepal Electricity Authority",
  amount: 6500,
  method: "khalti",
  recordedBy: { name: "Anita Admin" },
};

const MONTH = {
  month: "2026-10",
  total: 6500,
  count: 1,
  page: 1,
  page_size: 50,
  by_category: [{ category: "electricity", amount: 6500 }],
  results: [EXPENSE],
};

const NEW_EXPENSE = {
  spentOn: "2026-10-12",
  category: "electricity",
  paidTo: "Nepal Electricity Authority",
  amount: 6500,
  method: "khalti",
} as const;

function answering(response: Response) {
  return vi.fn<typeof fetch>().mockResolvedValueOnce(response);
}

function sentBody(fetchFn: ReturnType<typeof answering>): unknown {
  const body = fetchFn.mock.calls[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

describe("fetchExpenses", () => {
  it("GETs one month's page in frontend naming", async () => {
    const fetchFn = answering(jsonResponse(MONTH));

    const month = await fetchExpenses("2026-10", 2, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/expenses/?month=2026-10&page=2");
    expect(month).toEqual({
      month: "2026-10",
      total: 6500,
      count: 1,
      page: 1,
      pageSize: 50,
      byCategory: [{ category: "electricity", amount: 6500 }],
      rows: [FRONTEND_EXPENSE],
    });
  });

  it("asks for this month when no month is given", async () => {
    const fetchFn = answering(jsonResponse(MONTH));

    await fetchExpenses(null, 1, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/expenses/?page=1");
  });

  it.each([
    ["an unknown category", { ...MONTH, results: [{ ...EXPENSE, category: "rent" }] }],
    ["an unknown method", { ...MONTH, results: [{ ...EXPENSE, method: "bitcoin" }] }],
    ["a negative total", { ...MONTH, total: -1 }],
    ["a text amount", { ...MONTH, results: [{ ...EXPENSE, amount: "6500" }] }],
    ["a bad date", { ...MONTH, results: [{ ...EXPENSE, spent_on: "12/10/2026" }] }],
    ["a bad month", { ...MONTH, month: "October" }],
    ["no totals by category", { ...MONTH, by_category: undefined }],
  ])("refuses an answer with %s", async (_, body) => {
    await expect(fetchExpenses("2026-10", 1, answering(jsonResponse(body)))).rejects.toThrow();
  });
});

describe("addExpense", () => {
  it("POSTs the Expense in API naming and returns it", async () => {
    const fetchFn = answering(jsonResponse(EXPENSE, 201));

    const expense = await addExpense(NEW_EXPENSE, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/expenses/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(sentBody(fetchFn)).toEqual({
      spent_on: "2026-10-12",
      category: "electricity",
      paid_to: "Nepal Electricity Authority",
      amount: 6500,
      method: "khalti",
    });
    expect(expense).toEqual(FRONTEND_EXPENSE);
  });

  it("names refused fields in frontend naming", async () => {
    const fetchFn = answering(
      jsonResponse({ paid_to: ["Say who it was paid to."], spent_on: ["Too late."] }, 400),
    );

    const failure = addExpense(NEW_EXPENSE, fetchFn);

    await expect(failure).rejects.toBeInstanceOf(InvalidFieldsError);
    await expect(failure).rejects.toMatchObject({
      fieldErrors: { paidTo: ["Say who it was paid to."], spentOn: ["Too late."] },
    });
  });

  it("passes on a refusal that is not about the fields", async () => {
    const fetchFn = answering(jsonResponse({ detail: "Only an Admin." }, 403));

    await expect(addExpense(NEW_EXPENSE, fetchFn)).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("changeExpense", () => {
  it("PUTs every field to the Expense", async () => {
    const fetchFn = answering(jsonResponse(EXPENSE));

    const expense = await changeExpense(605, NEW_EXPENSE, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/expenses/605/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(expense).toEqual(FRONTEND_EXPENSE);
  });

  it("names refused fields", async () => {
    const fetchFn = answering(jsonResponse({ amount: ["Too big."] }, 400));

    await expect(changeExpense(605, NEW_EXPENSE, fetchFn)).rejects.toMatchObject({
      fieldErrors: { amount: ["Too big."] },
    });
  });
});

describe("deleteExpense", () => {
  it("DELETEs the Expense", async () => {
    const fetchFn = answering(new Response(null, { status: 204 }));

    await deleteExpense(605, fetchFn);

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/accounts/expenses/605/");
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });
});
