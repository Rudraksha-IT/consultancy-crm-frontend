import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccountsPage } from "@/components/features/accounts/AccountsPage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend as backendOnly, callsTo, on, onEach, type Answer } from "@/test/backend";
import { feeTypeRef, onFeeTypes } from "@/test/feeTypes";
import { PROFILE } from "@/test/studentProfile";
import { consultancySummary } from "@/test/consultancy";

/** The canned backend, always with the office's Fee Types for the forms and the filter. */
function backend(...answers: Answer[]) {
  return backendOnly(...answers, onFeeTypes);
}

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "payments", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const ADMIN_WITHOUT_ACCOUNTS: StaffContext = { ...ADMIN, modules: ["students", "payments"] };

const COUNSELLOR: StaffContext = {
  ...ADMIN,
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
};

const PAYMENT = {
  id: 412,
  receipt_number: "000412",
  student: { id: 7, name: "Sita Gurung", phone: "9841000001" },
  amount: 25000,
  paid_on: "2026-11-01",
  method: "esewa",
  fee_type: feeTypeRef(3),
  note: "first half",
  recorded_by: { name: "Ramesh KC" },
  recorded_at: "2026-11-01T10:15:00+05:45",
};

function pageOf(results: unknown[], total = 25000) {
  return { count: results.length, page: 1, page_size: 25, total, results };
}

const THIS_MONTH = "/api/payments/?from=2026-11-01&to=2026-11-02&page=1";
const STUDENT_PAYMENTS = "/api/payments/?student=7&page=1";

function renderAccounts(context: StaffContext = ADMIN) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <AccountsPage />
      </ToastProvider>
    </StaffContextContext>,
  );
}

/** Accounts opens on Student fees; these tests are about Money in. */
async function showMoneyIn(context: StaffContext = ADMIN) {
  renderAccounts(context);
  await userEvent.click(screen.getByRole("button", { name: "Money in" }));
}

const NO_FEES = { fees: [], total: 0, balance: { paid: 0, still_to_pay: 0, overpaid: 0 } };
const STUDENT_FEES = on("GET", "/api/students/7/fees/", NO_FEES);

function renderProfile(context: StaffContext = ADMIN) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={7} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const [call] = callsTo(fetchFn, verb, path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

async function openEdit(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole("button", { name: "Edit Payment 000412" }));
  return screen.getByRole("dialog", { name: "Edit Payment 000412" });
}

/**
 * The Payments list, answering `afterChange` once a PUT or DELETE has been made. Put it first
 * among the answers, so it sees those calls.
 */
function listChangingAfter(path: string, afterChange: unknown): Answer {
  let isChanged = false;
  return (calledPath, init) => {
    const verb = init?.method ?? "GET";
    if (verb === "PUT" || verb === "DELETE") isChanged = true;
    return onEach("GET", path, () => (isChanged ? afterChange : pageOf([PAYMENT])))(
      calledPath,
      init,
    );
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Accounts", () => {
  it.each([
    ["a Counsellor", COUNSELLOR],
    ["an Admin without Accounts", ADMIN_WITHOUT_ACCOUNTS],
  ])("isn't available to %s", (_, context) => {
    const fetchFn = backend();
    renderAccounts(context);

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows this month's money in: the total, then every Payment newest first", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();

    expect(screen.getByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    expect(await screen.findByText("1 payment, 1 Nov 2026 to 2 Nov 2026")).toBeInTheDocument();
    expect(screen.getByText("From Students").parentElement).toHaveTextContent("NPR 25,000");
    const [, row] = screen.getAllByRole("row");
    if (row === undefined) throw new Error("No Payment row");
    const cells = within(row);
    expect(cells.getByText("1 Nov 2026")).toBeInTheDocument();
    expect(cells.getByText("eSewa")).toBeInTheDocument();
    expect(cells.getByText("Visa fee (first half)")).toBeInTheDocument();
    expect(cells.getByText("NPR 25,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      "/students/7",
    );
  });

  it("shows each Payment's BS date beside its AD date", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();

    await screen.findByText("1 payment, 1 Nov 2026 to 2 Nov 2026");
    const [, row] = screen.getAllByRole("row");
    if (row === undefined) throw new Error("No Payment row");
    expect(within(row).getByText("1 Nov 2026")).toBeInTheDocument();
    expect(within(row).getByText("15 Kartik 2083 BS")).toBeInTheDocument();
  });

  it("shows only BS dates when the office uses BS, and filters by BS dates", async () => {
    const october = "/api/payments/?from=2026-10-18&to=2026-11-16&page=1";
    const fetchFn = backend(
      on("GET", THIS_MONTH, pageOf([PAYMENT])),
      on("GET", october, pageOf([PAYMENT])),
    );
    await showMoneyIn({ ...ADMIN, dateDisplay: "BS" });

    expect(
      await screen.findByText("1 payment, 15 Kartik 2083 to 16 Kartik 2083"),
    ).toBeInTheDocument();
    const [, row] = screen.getAllByRole("row");
    if (row === undefined) throw new Error("No Payment row");
    expect(within(row).getByText("15 Kartik 2083")).toBeInTheDocument();
    expect(row).not.toHaveTextContent("Nov");
    const form = screen.getByRole("form", { name: "Filter payments" });
    const from = within(form).getByRole("group", { name: "From (optional)" });
    const to = within(form).getByRole("group", { name: "To (optional)" });

    await userEvent.selectOptions(within(from).getByRole("combobox", { name: "Day" }), "1");
    await userEvent.selectOptions(within(to).getByRole("combobox", { name: "Month" }), "Kartik");
    await userEvent.selectOptions(within(to).getByRole("combobox", { name: "Day" }), "30");
    await userEvent.click(within(form).getByRole("button", { name: "Show" }));

    expect(
      await screen.findByText("1 payment, 1 Kartik 2083 to 30 Kartik 2083"),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", october)).toHaveLength(1);
  });

  it("shows typed text as text", async () => {
    const note = "<script>alert(1)</script>";
    backend(on("GET", THIS_MONTH, pageOf([{ ...PAYMENT, note }])));
    await showMoneyIn();

    expect(await screen.findByText(`Visa fee (${note})`)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("filters by dates, Student or receipt number and Fee Type", async () => {
    const filtered = "/api/payments/?from=2026-10-01&to=2026-10-31&q=Sita&fee_type=3&page=1";
    const fetchFn = backend(
      on("GET", THIS_MONTH, pageOf([PAYMENT])),
      on("GET", filtered, pageOf([])),
    );
    await showMoneyIn();
    const form = await screen.findByRole("form", { name: "Filter payments" });

    await userEvent.clear(within(form).getByLabelText(/^From/));
    await userEvent.type(within(form).getByLabelText(/^From/), "2026-10-01");
    await userEvent.clear(within(form).getByLabelText(/^To/));
    await userEvent.type(within(form).getByLabelText(/^To/), "2026-10-31");
    await userEvent.type(within(form).getByLabelText("Student or receipt number"), "Sita");
    await userEvent.selectOptions(
      within(form).getByRole("combobox", { name: /^Fee Type/ }),
      await within(form).findByRole("option", { name: "Visa fee" }),
    );
    await userEvent.click(within(form).getByRole("button", { name: "Show" }));

    expect(await screen.findByText("No payments match these filters.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", filtered)).toHaveLength(1);
    expect(screen.getByText("0 payments, 1 Oct 2026 to 31 Oct 2026")).toBeInTheDocument();
  });

  it("covers all dates when both are cleared", async () => {
    backend(
      on("GET", THIS_MONTH, pageOf([PAYMENT])),
      on("GET", "/api/payments/?page=1", pageOf([PAYMENT])),
    );
    await showMoneyIn();
    const form = await screen.findByRole("form", { name: "Filter payments" });

    await userEvent.clear(within(form).getByLabelText(/^From/));
    await userEvent.clear(within(form).getByLabelText(/^To/));
    await userEvent.click(within(form).getByRole("button", { name: "Show" }));

    expect(await screen.findByText("1 payment, All dates")).toBeInTheDocument();
  });

  it.each([
    ["To", "/api/payments/?from=2026-11-01&page=1", "1 payment, Since 1 Nov 2026"],
    ["From", "/api/payments/?to=2026-11-02&page=1", "1 payment, Until 2 Nov 2026"],
  ])("says which dates it covers when %s is cleared", async (cleared, path, footnote) => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])), on("GET", path, pageOf([PAYMENT])));
    await showMoneyIn();
    const form = await screen.findByRole("form", { name: "Filter payments" });

    await userEvent.clear(within(form).getByLabelText(new RegExp(`^${cleared}`)));
    await userEvent.click(within(form).getByRole("button", { name: "Show" }));

    expect(await screen.findByText(footnote)).toBeInTheDocument();
  });

  it("shows a refused filter under its field", async () => {
    backend(
      on("GET", THIS_MONTH, pageOf([PAYMENT])),
      on(
        "GET",
        "/api/payments/?from=2026-11-02&to=2026-11-01&page=1",
        { to: ["Choose an end date on or after the start date."] },
        400,
      ),
    );
    await showMoneyIn();
    const form = await screen.findByRole("form", { name: "Filter payments" });

    await userEvent.clear(within(form).getByLabelText(/^From/));
    await userEvent.type(within(form).getByLabelText(/^From/), "2026-11-02");
    await userEvent.clear(within(form).getByLabelText(/^To/));
    await userEvent.type(within(form).getByLabelText(/^To/), "2026-11-01");
    await userEvent.click(within(form).getByRole("button", { name: "Show" }));

    expect(
      await screen.findByText("Choose an end date on or after the start date."),
    ).toBeInTheDocument();
    expect(within(form).getByLabelText(/^To/)).toHaveAttribute("aria-invalid", "true");
  });

  it("says when the list can't be loaded", async () => {
    backend();
    await showMoneyIn();

    expect(
      await screen.findByText("We couldn't load the Payments. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("offers no receipt to open or print (2026-11-20)", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();

    expect(await screen.findByRole("button", { name: "Edit Payment 000412" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receipt 000412" })).not.toBeInTheDocument();
  });
});

describe("editing a Payment", () => {
  it("opens with its details and focus in the amount", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();

    const dialog = await openEdit();

    expect(within(dialog).getByLabelText("Amount (NPR)")).toHaveFocus();
    expect(within(dialog).getByLabelText("Amount (NPR)")).toHaveValue(25000);
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-11-01");
    expect(within(dialog).getByLabelText("Method")).toHaveValue("esewa");
    expect(within(dialog).getByRole("combobox", { name: "Fee Type" })).toHaveValue("3");
    expect(within(dialog).getByLabelText(/^Note/)).toHaveValue("first half");
    expect(
      within(dialog).getByText(
        "It keeps receipt number 000412. The change is recorded in History.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps a hidden Fee Type the Payment already has, and offers no other hidden one", async () => {
    backend(on("GET", THIS_MONTH, pageOf([{ ...PAYMENT, fee_type: feeTypeRef(5), note: "" }])));
    await showMoneyIn();

    const dialog = await openEdit();
    const picker = within(dialog).getByRole("combobox", { name: "Fee Type" });
    await within(dialog).findByRole("option", { name: "Visa fee" });

    expect(picker).toHaveValue("5");
    expect(within(picker).getAllByRole("option", { name: "PTE class" })).toHaveLength(1);
  });

  it("exports the filtered list", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();
    await screen.findByText("1 payment, 1 Nov 2026 to 2 Nov 2026");

    await userEvent.click(screen.getByRole("button", { name: "Export" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("From: 1 Nov 2026, To: 2 Nov 2026")).toBeInTheDocument();
  });

  it("saves the change, says so and loads the list again", async () => {
    const changed = { ...PAYMENT, amount: 30000 };
    const fetchFn = backend(
      listChangingAfter(THIS_MONTH, pageOf([changed], 30000)),
      on("PUT", "/api/payments/412/", changed),
    );
    await showMoneyIn();
    const dialog = await openEdit();

    await userEvent.clear(within(dialog).getByLabelText("Amount (NPR)"));
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "30000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", "/api/payments/412/")).toEqual({
      amount: 30000,
      paid_on: "2026-11-01",
      method: "esewa",
      fee_type: 3,
      note: "first half",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findAllByText("NPR 30,000")).not.toHaveLength(0);
  });

  it("refuses a bad amount without sending it", async () => {
    const fetchFn = backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();
    const dialog = await openEdit();

    await userEvent.clear(within(dialog).getByLabelText("Amount (NPR)"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(
      within(dialog).getByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", "/api/payments/412/")).toHaveLength(0);
  });

  it("shows the server's refusal of a field", async () => {
    backend(
      on("GET", THIS_MONTH, pageOf([PAYMENT])),
      on("PUT", "/api/payments/412/", { paid_on: ["Enter a date from 1 Jan 2000 to today."] }, 400),
    );
    await showMoneyIn();
    const dialog = await openEdit();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(
      await within(dialog).findByText("Enter a date from 1 Jan 2000 to today."),
    ).toBeInTheDocument();
  });

  it("says when only an Admin can change it", async () => {
    backend(
      on("GET", THIS_MONTH, pageOf([PAYMENT])),
      on(
        "PUT",
        "/api/payments/412/",
        { detail: "Only an Admin can change or delete a Payment." },
        403,
      ),
    );
    await showMoneyIn();
    const dialog = await openEdit();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(
      await within(dialog).findByText(
        "Only an Admin can change or delete a Payment. Refresh the page to see why.",
      ),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();
    await openEdit();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("deleting a Payment", () => {
  async function openDelete(): Promise<HTMLElement> {
    const edit = await openEdit();
    await userEvent.click(within(edit).getByRole("button", { name: "Delete payment" }));
    return screen.getByRole("dialog", { name: "Delete Payment 000412?" });
  }

  it("asks first, naming the Payment", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();

    const dialog = await openDelete();

    expect(
      within(dialog).getByText("000412, NPR 25,000 from Sita Gurung for Visa fee (first half)."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "The deletion is recorded in the Student's History with these details.",
      ),
    ).toBeInTheDocument();
  });

  it("deletes it, says so and loads the list again", async () => {
    const fetchFn = backend(listChangingAfter(THIS_MONTH, pageOf([], 0)), (path, init) =>
      init?.method === "DELETE" && path === "/api/payments/412/"
        ? new Response(null, { status: 204 })
        : undefined,
    );
    await showMoneyIn();
    const dialog = await openDelete();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete Payment" }));

    expect(await screen.findByText("Payment deleted")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", "/api/payments/412/")).toHaveLength(1);
    expect(await screen.findByText("No payments match these filters.")).toBeInTheDocument();
  });

  it("keeps the dialog open when it fails", async () => {
    backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();
    const dialog = await openDelete();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete Payment" }));

    expect(
      await within(dialog).findByText("We couldn't delete it. Please try again."),
    ).toBeInTheDocument();
  });

  it("can be cancelled", async () => {
    const fetchFn = backend(on("GET", THIS_MONTH, pageOf([PAYMENT])));
    await showMoneyIn();
    const dialog = await openDelete();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", "/api/payments/412/")).toHaveLength(0);
  });
});

describe("the Fees tab on a Student", () => {
  it("shows an Admin the Student's Payments", async () => {
    backend(
      on("GET", "/api/students/7/", PROFILE),
      STUDENT_FEES,
      on("GET", STUDENT_PAYMENTS, pageOf([PAYMENT])),
    );
    renderProfile();

    await userEvent.click(await screen.findByRole("tab", { name: "Fees" }));

    expect(await screen.findByRole("heading", { name: "Payments received" })).toBeInTheDocument();
    expect(await screen.findByText("Visa fee (first half)")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Student" })).not.toBeInTheDocument();
    expect(screen.getByText("1 payment")).toBeInTheDocument();
  });

  it("says when there are none yet", async () => {
    backend(
      on("GET", "/api/students/7/", PROFILE),
      STUDENT_FEES,
      on("GET", STUDENT_PAYMENTS, pageOf([], 0)),
    );
    renderProfile();

    await userEvent.click(await screen.findByRole("tab", { name: "Fees" }));

    expect(await screen.findByText("No payments yet.")).toBeInTheDocument();
  });

  it("says when they can't be loaded", async () => {
    backend(on("GET", "/api/students/7/", PROFILE), STUDENT_FEES);
    renderProfile();

    await userEvent.click(await screen.findByRole("tab", { name: "Fees" }));

    expect(
      await screen.findByText("We couldn't load the Payments. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("loads the list again after an edit", async () => {
    const changed = { ...PAYMENT, fee_type: feeTypeRef(4), note: "" };
    backend(
      listChangingAfter(STUDENT_PAYMENTS, pageOf([changed])),
      on("GET", "/api/students/7/", PROFILE),
      STUDENT_FEES,
      on("PUT", "/api/payments/412/", changed),
    );
    renderProfile();
    await userEvent.click(await screen.findByRole("tab", { name: "Fees" }));
    const dialog = await openEdit();

    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Fee Type" }),
      await within(dialog).findByRole("option", { name: "IELTS class" }),
    );
    await userEvent.clear(within(dialog).getByLabelText(/^Note/));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("IELTS class")).toBeInTheDocument();
  });

  it.each([
    ["a Counsellor who isn't theirs", COUNSELLOR],
    ["an Admin without Accounts", ADMIN_WITHOUT_ACCOUNTS],
  ])("isn't shown to %s", async (_, context) => {
    backend(on("GET", "/api/students/7/", { ...PROFILE, can_change_fees: false }));
    renderProfile(context);

    expect(await screen.findByRole("tab", { name: "Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Fees" })).not.toBeInTheDocument();
  });
});

describe("the Activity tab", () => {
  it("describes an edited and a deleted Payment", async () => {
    const entry = {
      at: "2026-11-02T10:15:00+05:45",
      by: { name: "Sunita Shrestha", is_platform_admin: false },
      detail: "Receipt 000412",
    };
    backend(
      on("GET", "/api/students/7/", PROFILE),
      on("GET", "/api/students/7/visits/?page=1", {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", "/api/students/7/history/", {
        count: 2,
        page: 1,
        page_size: 50,
        results: [
          {
            ...entry,
            id: 5,
            kind: "payment_deleted",
            before: "NPR 30,000, Visa fee, eSewa, 1 Nov 2026",
            after: "",
          },
          {
            ...entry,
            id: 4,
            kind: "payment_edited",
            before: "Amount NPR 25,000",
            after: "Amount NPR 30,000",
          },
        ],
      }),
    );
    renderProfile();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(
      await screen.findByText("Payment deleted: NPR 30,000, Visa fee, eSewa, 1 Nov 2026"),
    ).toBeInTheDocument();
    expect(screen.getByText("Payment changed: Amount NPR 30,000")).toBeInTheDocument();
    expect(screen.getByText(/Amount NPR 25,000/)).toBeInTheDocument();
    expect(screen.getAllByText("Receipt 000412")).toHaveLength(2);
  });
});
