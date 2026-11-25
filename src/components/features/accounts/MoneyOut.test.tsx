import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccountsPage } from "@/components/features/accounts/AccountsPage";
import { HomePage } from "@/components/features/home/HomePage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";
import { consultancySummary } from "@/test/consultancy";
import { HOME_AMOUNTS_KEY } from "@/constants/home";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "payments", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const OWING_URL = "/api/accounts/student-fees/?page=1";
/** The Admin's Home leaves Lost Students out, as Fees by type does. */
const HOME_OWING_URL = "/api/accounts/student-fees/?page=1&leave_out=lost";
const THIS_MONTH_URL = "/api/accounts/expenses/?month=2026-11&page=1";
const OCTOBER_URL = "/api/accounts/expenses/?month=2026-10&page=1";
const LIST_URL = "/api/accounts/expenses/";
const HOME_MONEY_OUT = "/api/accounts/expenses/?page=1";
const PAYMENTS_THIS_MONTH = "/api/payments/?from=2026-11-01&to=2026-11-03&page=1";
const RECEIVED_THIS_MONTH = "/api/accounts/commission/received/?from=2026-11-01&to=2026-11-03";
const COMMISSION_PAGE = "/api/accounts/commission/?page=1";
const NO_COMMISSION = {
  count: 0,
  page: 1,
  page_size: 25,
  totals: { waiting_for_enrolment: 0, claim_sent: 0, received: 0, to_come: 0 },
  results: [],
};

const RENT = {
  id: uid(601),
  spent_on: "2026-10-01",
  category: "office_rent",
  paid_to: "Office landlord",
  amount: 85000,
  method: "bank_transfer",
  recorded_by: { name: "Sunita Shrestha" },
};
const INTERNET = {
  ...RENT,
  id: uid(602),
  spent_on: "2026-10-03",
  category: "internet",
  paid_to: "WorldLink",
  amount: 3500,
  method: "esewa",
};

type Row = typeof RENT;

function monthOf(month: string, results: Row[]) {
  return {
    month,
    total: results.reduce((sum, row) => sum + row.amount, 0),
    count: results.length,
    page: 1,
    page_size: 50,
    by_category: results.map((row) => ({ category: row.category, amount: row.amount })),
    results,
  };
}

const NOVEMBER = monthOf("2026-11", []);
const OCTOBER = monthOf("2026-10", [INTERNET, RENT]);
const OWING = {
  count: 0,
  page: 1,
  page_size: 25,
  totals: { agreed: 0, collected: 0, still_to_collect: 0, students: 0, owing: 0 },
  results: [],
};
const NO_PAYMENTS = { count: 0, page: 1, page_size: 25, total: 0, results: [] };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function withProviders(page: React.ReactNode, context: StaffContext = ADMIN) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>{page}</ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const [call] = callsTo(fetchFn, verb, path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function tile(label: string): HTMLElement {
  const tileElement = screen.getByText(label, { selector: "span" }).parentElement;
  if (tileElement === null) throw new Error(`No tile for ${label}`);
  return tileElement;
}

async function openMoneyOut() {
  withProviders(<AccountsPage />);
  await userEvent.click(screen.getByRole("button", { name: "Money out" }));
}

/** The toolbar's button (an empty month offers a second one). */
async function openAddDialog() {
  const [toolbarButton] = await screen.findAllByRole("button", { name: "Add an expense" });
  if (toolbarButton === undefined) throw new Error("No Add an expense button");
  await userEvent.click(toolbarButton);
}

async function pickOctober() {
  await userEvent.selectOptions(screen.getByLabelText("Month"), "October 2026");
}

describe("Accounts -> Money out", () => {
  it("opens on this month and offers the last two years", async () => {
    backend(on("GET", OWING_URL, OWING), on("GET", THIS_MONTH_URL, NOVEMBER));
    await openMoneyOut();

    const month = screen.getByLabelText("Month");
    expect(month).toHaveValue("2026-11");
    const options = within(month).getAllByRole("option");
    expect(options).toHaveLength(24);
    expect(options[0]).toHaveTextContent("November 2026");
    expect(options[23]).toHaveTextContent("December 2024");
    expect(await screen.findByText("No expenses recorded this month.")).toBeInTheDocument();
    expect(within(tile("Spent this month")).getByText("NPR 0")).toBeInTheDocument();
  });

  it("shows a month's total, its spending by type and every expense", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("GET", OCTOBER_URL, OCTOBER),
    );
    await openMoneyOut();
    await pickOctober();

    const spent = await screen.findByText("Spent in October 2026", { selector: "span" });
    const total = within(spent.parentElement ?? spent).getByText("NPR 88,500");
    expect(total).toHaveClass("text-bad");
    expect(within(tile("Spent in October 2026")).getByText("2 expenses")).toBeInTheDocument();
    const byType = screen.getByRole("list", { name: "By type" });
    expect(within(byType).getByText("Office rent")).toBeInTheDocument();
    expect(within(byType).getByText("NPR 85,000")).toBeInTheDocument();
    const every = screen.getByRole("list", { name: "Every expense" });
    const [first, second] = within(every).getAllByRole("listitem");
    expect(first).toHaveTextContent("Internet");
    expect(first).toHaveTextContent("WorldLink, 3 Oct 2026, eSewa");
    expect(first).toHaveTextContent("NPR 3,500");
    expect(second).toHaveTextContent("Office landlord, 1 Oct 2026, Bank transfer");
  });

  it("writes days in BS when the office uses BS", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("GET", OCTOBER_URL, OCTOBER),
    );
    withProviders(<AccountsPage />, { ...ADMIN, dateDisplay: "BS" });
    await userEvent.click(screen.getByRole("button", { name: "Money out" }));
    await pickOctober();

    const every = await screen.findByRole("list", { name: "Every expense" });
    expect(within(every).queryByText(/3 Oct 2026/)).not.toBeInTheDocument();
  });

  it("says when the expenses can't be loaded", async () => {
    backend(on("GET", OWING_URL, OWING));
    await openMoneyOut();

    expect(
      await screen.findByText("We couldn't load the expenses. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("shows typed HTML as text", async () => {
    const odd = { ...RENT, paid_to: "<b>Landlord</b>" };
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("GET", OCTOBER_URL, monthOf("2026-10", [odd])),
    );
    await openMoneyOut();
    await pickOctober();

    expect(
      await screen.findByText("<b>Landlord</b>, 1 Oct 2026, Bank transfer"),
    ).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });
});

describe("adding an expense", () => {
  it("saves it, says so, and shows the month it was spent in", async () => {
    let saved = false;
    const fetchFn = backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      onEach("GET", OCTOBER_URL, () => (saved ? OCTOBER : monthOf("2026-10", [RENT]))),
      (path, init) => {
        if (path === LIST_URL && init?.method === "POST") saved = true;
        return on("POST", LIST_URL, INTERNET, 201)(path, init);
      },
    );
    await openMoneyOut();
    await openAddDialog();

    const dialog = screen.getByRole("dialog", { name: "Add an expense" });
    expect(within(dialog).getByLabelText("Type")).toHaveFocus();
    await userEvent.selectOptions(within(dialog).getByLabelText("Type"), "Internet");
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "3500");
    await userEvent.type(within(dialog).getByLabelText("Paid to"), "  WorldLink ");
    const date = within(dialog).getByLabelText("Date");
    await userEvent.clear(date);
    await userEvent.type(date, "2026-10-03");
    await userEvent.selectOptions(within(dialog).getByLabelText("Paid by"), "eSewa");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(await screen.findByText("Expense saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", LIST_URL)).toEqual({
      spent_on: "2026-10-03",
      category: "internet",
      paid_to: "WorldLink",
      amount: 3500,
      method: "esewa",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Month")).toHaveValue("2026-10");
    expect(await screen.findByText("WorldLink, 3 Oct 2026, eSewa")).toBeInTheDocument();
  });

  it("starts on today, Office rent and Cash, and offers a card", async () => {
    backend(on("GET", OWING_URL, OWING), on("GET", THIS_MONTH_URL, NOVEMBER));
    await openMoneyOut();
    await openAddDialog();

    const dialog = screen.getByRole("dialog", { name: "Add an expense" });
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-11-03");
    expect(within(dialog).getByLabelText("Type")).toHaveValue("office_rent");
    expect(within(dialog).getByLabelText("Paid by")).toHaveValue("cash");
    expect(within(within(dialog).getByLabelText("Paid by")).getByText("Card")).toBeInTheDocument();
    const types = within(within(dialog).getByLabelText("Type")).getAllByRole("option");
    expect(types.map((option) => option.textContent)).toEqual([
      "Office rent",
      "Salaries",
      "Internet",
      "Electricity",
      "Marketing",
      "Education fair",
      "Office supplies",
      "Tea and snacks",
      "Other",
    ]);
  });

  it("checks the amount and who it was paid to before sending anything", async () => {
    const fetchFn = backend(on("GET", OWING_URL, OWING), on("GET", THIS_MONTH_URL, NOVEMBER));
    await openMoneyOut();
    await openAddDialog();

    const dialog = screen.getByRole("dialog", { name: "Add an expense" });
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "12.5");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(
      await within(dialog).findByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Say who it was paid to.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", LIST_URL)).toHaveLength(0);
  });

  it("shows the server's refusal beside the field", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("POST", LIST_URL, { spent_on: ["Enter a date from 1 Jan 2000 to today."] }, 400),
    );
    await openMoneyOut();
    await openAddDialog();

    const dialog = screen.getByRole("dialog", { name: "Add an expense" });
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "100");
    await userEvent.type(within(dialog).getByLabelText("Paid to"), "Landlord");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(
      await within(dialog).findByText("Enter a date from 1 Jan 2000 to today."),
    ).toBeInTheDocument();
  });

  it("says when only an Admin may", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("POST", LIST_URL, { detail: "Only an Admin can see or change Expenses." }, 403),
    );
    await openMoneyOut();
    await openAddDialog();

    const dialog = screen.getByRole("dialog", { name: "Add an expense" });
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "100");
    await userEvent.type(within(dialog).getByLabelText("Paid to"), "Landlord");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save expense" }));

    expect(
      await within(dialog).findByText(
        "Only an Admin can see or change Expenses. Refresh the page.",
      ),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(on("GET", OWING_URL, OWING), on("GET", THIS_MONTH_URL, NOVEMBER));
    await openMoneyOut();
    await openAddDialog();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("changing and deleting an expense", () => {
  it("changes it and loads the month again", async () => {
    let changed = false;
    const fetchFn = backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      onEach("GET", OCTOBER_URL, () =>
        changed ? monthOf("2026-10", [INTERNET, { ...RENT, amount: 90000 }]) : OCTOBER,
      ),
      (path, init) => {
        if (init?.method === "PUT") changed = true;
        return on("PUT", `/api/accounts/expenses/${uid(601)}/`, { ...RENT, amount: 90000 })(
          path,
          init,
        );
      },
    );
    await openMoneyOut();
    await pickOctober();
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit expense: Office rent, Office landlord" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Edit expense" });
    expect(within(dialog).getByLabelText("Paid to")).toHaveValue("Office landlord");
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-10-01");
    expect(within(dialog).getByLabelText("Paid by")).toHaveValue("bank_transfer");
    const amount = within(dialog).getByLabelText("Amount (NPR)");
    await userEvent.clear(amount);
    await userEvent.type(amount, "90000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", `/api/accounts/expenses/${uid(601)}/`)).toEqual({
      spent_on: "2026-10-01",
      category: "office_rent",
      paid_to: "Office landlord",
      amount: 90000,
      method: "bank_transfer",
    });
    expect(await screen.findByText("NPR 93,500")).toBeInTheDocument();
  });

  it("deletes it after asking", async () => {
    let deleted = false;
    const fetchFn = backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      onEach("GET", OCTOBER_URL, () => (deleted ? monthOf("2026-10", [INTERNET]) : OCTOBER)),
      (path, init) => {
        if (init?.method !== "DELETE" || path !== `/api/accounts/expenses/${uid(601)}/`)
          return undefined;
        deleted = true;
        return new Response(null, { status: 204 });
      },
    );
    await openMoneyOut();
    await pickOctober();
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit expense: Office rent, Office landlord" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete expense" }));

    const confirm = screen.getByRole("dialog", { name: "Delete the Office rent expense?" });
    expect(
      within(confirm).getByText("Office rent, Office landlord, NPR 85,000 on 1 Oct 2026."),
    ).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete expense" }));

    expect(await screen.findByText("Expense deleted")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `/api/accounts/expenses/${uid(601)}/`)).toHaveLength(1);
    expect(await screen.findByText("NPR 3,500", { selector: ".text-figure" })).toBeInTheDocument();
  });

  it("deletes nothing when the confirmation is cancelled", async () => {
    const fetchFn = backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("GET", OCTOBER_URL, OCTOBER),
    );
    await openMoneyOut();
    await pickOctober();
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit expense: Office rent, Office landlord" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `/api/accounts/expenses/${uid(601)}/`)).toHaveLength(0);
  });

  it("says when a delete fails", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("GET", OCTOBER_URL, OCTOBER),
    );
    await openMoneyOut();
    await pickOctober();
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit expense: Office rent, Office landlord" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    const confirm = screen.getByRole("dialog", { name: "Delete the Office rent expense?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete expense" }));

    expect(
      await within(confirm).findByText("We couldn't delete it. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("Money out on the Admin's Home", () => {
  // These check the figures themselves, so the amounts start shown (ticket 13).
  beforeEach(() => {
    window.localStorage.setItem(HOME_AMOUNTS_KEY, "shown");
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows this month's money out beside money in", async () => {
    backend(
      on("GET", HOME_OWING_URL, OWING),
      on("GET", PAYMENTS_THIS_MONTH, NO_PAYMENTS),
      on("GET", HOME_MONEY_OUT, monthOf("2026-11", [{ ...RENT, spent_on: "2026-11-01" }])),
      on("GET", RECEIVED_THIS_MONTH, { total: 0, count: 0 }),
      on("GET", COMMISSION_PAGE, NO_COMMISSION),
    );
    withProviders(<HomePage />);

    const glance = await screen.findByRole("region", { name: "This month at a glance" });
    expect(await within(glance).findByText("Money out")).toBeInTheDocument();
    expect(within(tile("Money out")).getByText("NPR 85,000")).toBeInTheDocument();
    expect(within(glance).getByText("1 expense, 1 Nov 2026 to 3 Nov 2026")).toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("Money out in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the month's expenses", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", THIS_MONTH_URL, NOVEMBER),
      on("GET", OCTOBER_URL, OCTOBER),
    );
    await openMoneyOut();
    await pickOctober();

    expect(await screen.findByText("WorldLink, 3 Oct 2026, eSewa")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});
