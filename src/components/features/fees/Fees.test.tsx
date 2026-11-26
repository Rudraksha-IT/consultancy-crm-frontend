import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccountsPage } from "@/components/features/accounts/AccountsPage";
import { HomePage } from "@/components/features/home/HomePage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { HOME_AMOUNTS_KEY } from "@/constants/home";
import type { StaffContext } from "@/lib/api";
import { backend as backendOnly, callsTo, on, onEach, type Answer } from "@/test/backend";
import { feeTypeRef, onFeeTypes } from "@/test/feeTypes";
import { PROFILE } from "@/test/studentProfile";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

/** The canned backend, always with the office's Fee Types for the forms. */
function backend(...answers: Answer[]) {
  return backendOnly(...answers, onFeeTypes);
}

/** Pick a Fee Type in an open form, once the list has loaded. */
async function pickFeeType(dialog: HTMLElement, name: string): Promise<void> {
  await userEvent.selectOptions(
    within(dialog).getByRole("combobox", { name: "Fee Type" }),
    await within(dialog).findByRole("option", { name }),
  );
}

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "payments", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const COUNSELLOR: StaffContext = {
  ...ADMIN,
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
};

const FEES_URL = `/api/students/${uid(7)}/fees/`;
const STUDENT_PAYMENTS = `/api/payments/?student=${uid(7)}&page=1`;
const OWING_URL = "/api/accounts/student-fees/?page=1";
/** The Admin's Home leaves Lost Students out, as Fees by type does (spec 87, 91). */
const HOME_OWING_URL = "/api/accounts/student-fees/?page=1&leave_out=lost";
const THIS_MONTH = "/api/payments/?from=2026-11-01&to=2026-11-03&page=1";
const MONEY_OUT = "/api/accounts/expenses/?page=1";
const RECEIVED = "/api/accounts/commission/received/?from=2026-11-01&to=2026-11-03";
const COMMISSION = "/api/accounts/commission/?page=1";
const NO_COMMISSION = {
  count: 0,
  page: 1,
  page_size: 25,
  totals: { waiting_for_enrolment: 0, claim_sent: 0, received: 0, to_come: 0 },
  results: [],
};
const NO_EXPENSES = {
  month: "2026-11",
  total: 0,
  count: 0,
  page: 1,
  page_size: 50,
  by_category: [],
  results: [],
};

const VISA_FEE = {
  id: uid(31),
  fee_type: feeTypeRef(uid(3)),
  note: "processing",
  amount: 40000,
  added_by: { name: "Bikash Thapa" },
  added_at: "2026-11-03T10:15:00+05:45",
};
const APPLICATION_FEE = {
  ...VISA_FEE,
  id: uid(32),
  fee_type: feeTypeRef(uid(1)),
  note: "",
  amount: 25000,
};

function feesOf(fees: unknown[], balance: unknown) {
  return { fees, total: 65000, balance };
}

const ADMIN_FEES = feesOf([VISA_FEE, APPLICATION_FEE], {
  paid: 15000,
  still_to_pay: 50000,
  overpaid: 0,
});

const NO_PAYMENTS = { count: 0, page: 1, page_size: 25, total: 0, results: [] };

const OWING = {
  count: 2,
  page: 1,
  page_size: 25,
  totals: { agreed: 170000, collected: 40000, still_to_collect: 130000, students: 4, owing: 2 },
  results: [
    { student: { id: uid(3), name: "Sita Karki" }, fees: 80000, paid: 0, still_to_pay: 80000 },
    {
      student: { id: uid(7), name: "Aarav Sharma" },
      fees: 65000,
      paid: 15000,
      still_to_pay: 50000,
    },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function withProviders(context: StaffContext, page: React.ReactNode) {
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

/** Answers `before` until a change is sent, then `after`. Put it first among the answers. */
function changingAfter(path: string, before: unknown, after: unknown): Answer {
  let isChanged = false;
  return (calledPath, init) => {
    const verb = init?.method ?? "GET";
    if (verb !== "GET") isChanged = true;
    return onEach("GET", path, () => (isChanged ? after : before))(calledPath, init);
  };
}

describe("opening a Student on their Fees tab", () => {
  it("starts on Fees when asked", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    withProviders(ADMIN, <StudentProfilePage studentId={uid(7)} startTab="fees" />);

    expect(await screen.findByRole("tab", { name: "Fees" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText("Visa fee (processing)")).toBeInTheDocument();
  });

  it("starts on Applications when Fees isn't shown to them", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, PROFILE));
    withProviders(
      { ...ADMIN, modules: ["students", "payments"] },
      <StudentProfilePage studentId={uid(7)} startTab="fees" />,
    );

    expect(await screen.findByRole("tab", { name: /^Applications/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

async function openFeesTab(context: StaffContext = ADMIN) {
  withProviders(context, <StudentProfilePage studentId={uid(7)} />);
  await userEvent.click(await screen.findByRole("tab", { name: "Fees" }));
}

function tile(label: string): HTMLElement {
  const labelText = screen.getByText(label, { selector: "span" });
  const tileElement = labelText.parentElement;
  if (tileElement === null) throw new Error(`No tile for ${label}`);
  return tileElement;
}

describe("the Fees tab, for an Admin", () => {
  it("shows the agreed fees, paid so far and still to pay, the Fees and the Payments", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();

    expect(await screen.findByText("Agreed fees", { selector: "span" })).toBeInTheDocument();
    expect(within(tile("Agreed fees")).getByText("NPR 65,000")).toBeInTheDocument();
    expect(within(tile("Paid so far")).getByText("NPR 15,000")).toBeInTheDocument();
    expect(within(tile("Still to pay")).getByText("NPR 50,000")).toHaveClass("text-warn");
    const list = screen.getByRole("list", { name: "What they agreed to pay" });
    expect(within(list).getByText("Visa fee (processing)")).toBeInTheDocument();
    expect(within(list).getByText("NPR 40,000")).toBeInTheDocument();
    expect(within(list).getAllByText("Added by Bikash Thapa")).toHaveLength(2);
    expect(await screen.findByRole("heading", { name: "Payments received" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a fee" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Take a payment" })).toHaveLength(2);
  });

  it("shows an overpayment as nothing owed, and says how much more was paid", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, {
        ...feesOf([VISA_FEE], null),
        total: 40000,
        balance: { paid: 45000, still_to_pay: 0, overpaid: 5000 },
      }),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();

    expect(
      await screen.findByText("Paid NPR 5,000 more than the agreed fees."),
    ).toBeInTheDocument();
    expect(within(tile("Still to pay")).getByText("NPR 0")).not.toHaveClass("text-warn");
  });

  it("says when everything is paid", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, {
        fees: [VISA_FEE],
        total: 40000,
        balance: { paid: 40000, still_to_pay: 0, overpaid: 0 },
      }),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();

    expect(await screen.findByText("Paid in full")).toBeInTheDocument();
  });

  it("takes a payment from the Payments section", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const payments = await screen.findByRole("region", { name: "Payments received" });

    await userEvent.click(within(payments).getByRole("button", { name: "Take a payment" }));

    expect(
      screen.getByRole("dialog", { name: "Record a payment from Sita Gurung" }),
    ).toBeInTheDocument();
  });

  it("says when no fees are agreed yet", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, {
        fees: [],
        total: 0,
        balance: { paid: 0, still_to_pay: 0, overpaid: 0 },
      }),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();

    expect(await screen.findByText("No fees agreed yet.")).toBeInTheDocument();
  });

  it("says when the fees can't be loaded", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, PROFILE));
    await openFeesTab();

    expect(
      await screen.findByText("We couldn't load the fees. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("shows typed text as text", async () => {
    const html = "<b>Visa</b><script>alert(1)</script>";
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, { ...ADMIN_FEES, fees: [{ ...VISA_FEE, note: html }] }),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();

    expect(await screen.findByText(`Visa fee (${html})`)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "What they agreed to pay" });
    expect(list.querySelector("b, script")).toBeNull();
  });
});

describe("adding a fee", () => {
  const AFTER = feesOf([VISA_FEE], { paid: 0, still_to_pay: 40000, overpaid: 0 });

  async function openAdd() {
    await userEvent.click(await screen.findByRole("button", { name: "Add a fee" }));
    return screen.getByRole("dialog", { name: "Add a fee for Sita Gurung" });
  }

  it("opens with focus on the Fee Type, saves, says so and shows the new fee", async () => {
    const fetchFn = backend(
      changingAfter(
        FEES_URL,
        { fees: [], total: 0, balance: { paid: 0, still_to_pay: 0, overpaid: 0 } },
        AFTER,
      ),
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("POST", FEES_URL, AFTER, 201),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const dialog = await openAdd();

    expect(within(dialog).getByRole("combobox", { name: "Fee Type" })).toHaveFocus();
    await pickFeeType(dialog, "Visa fee");
    await userEvent.type(within(dialog).getByLabelText(/^Note/), "processing");
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "40000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add fee" }));

    expect(await screen.findByText("Fee added")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", FEES_URL)).toEqual({
      fee_type: uid(3),
      note: "processing",
      amount: 40000,
    });
    expect(await screen.findByText("Visa fee (processing)")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("refuses a missing Fee Type and a bad amount without sending them", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const dialog = await openAdd();

    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "12.5");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add fee" }));

    expect(await within(dialog).findByText("Choose a Fee Type.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", FEES_URL)).toHaveLength(0);
  });

  it("shows the server's refusal under its field", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
      on("POST", FEES_URL, { note: ["Use at most 200 characters."] }, 400),
    );
    await openFeesTab();
    const dialog = await openAdd();

    await pickFeeType(dialog, "Visa fee");
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "100");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add fee" }));

    expect(await within(dialog).findByText("Use at most 200 characters.")).toBeInTheDocument();
  });

  it("says when the person may no longer change fees", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
      on("POST", FEES_URL, { detail: "Not your Student." }, 403),
    );
    await openFeesTab();
    const dialog = await openAdd();

    await pickFeeType(dialog, "Visa fee");
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "100");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add fee" }));

    expect(
      await within(dialog).findByText(
        "Only the Student's counsellor or an Admin can change fees. Refresh the page.",
      ),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    await openAdd();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("changing and deleting a fee", () => {
  const AFTER = feesOf([APPLICATION_FEE], { paid: 15000, still_to_pay: 10000, overpaid: 0 });

  async function openEdit() {
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit fee: Visa fee (processing)" }),
    );
    return screen.getByRole("dialog", { name: "Edit fee" });
  }

  it("opens filled in, saves the change and says so", async () => {
    const changed = { ...VISA_FEE, amount: 45000 };
    const fetchFn = backend(
      changingAfter(FEES_URL, ADMIN_FEES, feesOf([changed, APPLICATION_FEE], ADMIN_FEES.balance)),
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("PUT", `/api/fees/${uid(31)}/`, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const dialog = await openEdit();

    expect(within(dialog).getByRole("combobox", { name: "Fee Type" })).toHaveValue(uid(3));
    expect(within(dialog).getByLabelText(/^Note/)).toHaveValue("processing");
    expect(within(dialog).getByLabelText("Amount (NPR)")).toHaveValue(40000);
    await userEvent.clear(within(dialog).getByLabelText("Amount (NPR)"));
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "45000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", `/api/fees/${uid(31)}/`)).toEqual({
      fee_type: uid(3),
      note: "processing",
      amount: 45000,
    });
    expect(await screen.findByText("NPR 45,000")).toBeInTheDocument();
  });

  it("asks first, then deletes it and says so", async () => {
    const fetchFn = backend(
      changingAfter(FEES_URL, ADMIN_FEES, AFTER),
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      (path, init) =>
        init?.method === "DELETE" && path === `/api/fees/${uid(31)}/`
          ? new Response(null, { status: 204 })
          : undefined,
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const dialog = await openEdit();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete fee" }));
    const confirm = screen.getByRole("dialog", {
      name: "Delete the fee for Visa fee (processing)?",
    });
    expect(within(confirm).getByText("Visa fee (processing), NPR 40,000.")).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete fee" }));

    expect(await screen.findByText("Fee deleted")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `/api/fees/${uid(31)}/`)).toHaveLength(1);
    expect(screen.queryByText("Visa fee (processing)")).not.toBeInTheDocument();
  });

  it("deletes nothing when the confirmation is cancelled", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const dialog = await openEdit();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete fee" }));
    const confirm = screen.getByRole("dialog", {
      name: "Delete the fee for Visa fee (processing)?",
    });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `/api/fees/${uid(31)}/`)).toHaveLength(0);
    expect(screen.getByText("Visa fee (processing)")).toBeInTheDocument();
  });

  it("keeps the confirmation open when deleting fails", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab();
    const dialog = await openEdit();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete fee" }));
    const confirm = screen.getByRole("dialog", {
      name: "Delete the fee for Visa fee (processing)?",
    });

    await userEvent.click(within(confirm).getByRole("button", { name: "Delete fee" }));

    expect(
      await within(confirm).findByText("We couldn't delete it. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("the Fees tab, for the Student's counsellor", () => {
  const COUNSELLOR_FEES = { fees: [VISA_FEE], total: 40000, balance: null };

  it("shows their Fees and lets them add one, but no Payments or what is still to pay", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, COUNSELLOR_FEES),
    );
    await openFeesTab(COUNSELLOR);

    expect(await screen.findByText("Visa fee (processing)")).toBeInTheDocument();
    expect(
      screen.getByText("Payments and what is still to pay stay with the Admin."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a fee" })).toBeInTheDocument();
    expect(screen.queryByText("Paid so far")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Payments received" })).not.toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([path]) => path.startsWith("/api/payments/"))).toBe(false);
  });

  it("has no Add or Edit when they may not change the Fees", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, { ...PROFILE, can_change_fees: false }),
      on("GET", FEES_URL, COUNSELLOR_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    await openFeesTab(ADMIN);

    expect(await screen.findByText("Visa fee (processing)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a fee" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit fee/ })).not.toBeInTheDocument();
  });
});

describe("Accounts -> Student fees", () => {
  function renderAccounts() {
    withProviders(ADMIN, <AccountsPage />);
  }

  it("opens on Student fees: the totals, then who still owes, most first", async () => {
    backend(on("GET", OWING_URL, OWING));
    renderAccounts();

    expect(screen.getByRole("button", { name: "Student fees" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByText("NPR 1,70,000")).toBeInTheDocument();
    expect(within(tile("Agreed fees")).getByText("4 Students")).toBeInTheDocument();
    expect(within(tile("Collected")).getByText("NPR 40,000")).toBeInTheDocument();
    expect(within(tile("Still to collect")).getByText("2 Students owe money")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "By Fee Type" })).toHaveAttribute(
      "href",
      "/accounts/fees-by-type",
    );
    const [, sita, aarav] = screen.getAllByRole("row");
    if (sita === undefined || aarav === undefined) throw new Error("Expected two rows");
    expect(within(sita).getByRole("link", { name: "Sita Karki" })).toHaveAttribute(
      "href",
      `/students/${uid(3)}`,
    );
    expect(within(aarav).getByText("NPR 50,000")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Share of the fees Aarav Sharma has paid" }),
    ).toHaveAttribute("aria-valuenow", "23");
  });

  it("says when everyone has paid", async () => {
    backend(on("GET", OWING_URL, { ...OWING, count: 0, results: [] }));
    renderAccounts();

    expect(await screen.findByText("Everyone has paid in full.")).toBeInTheDocument();
  });

  it("says when the list can't be loaded", async () => {
    backend();
    renderAccounts();

    expect(
      await screen.findByText("We couldn't load who still owes. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("shows one Student's fees in Details, and adds a fee from there", async () => {
    const fetchFn = backend(
      on("GET", OWING_URL, OWING),
      on("GET", FEES_URL, ADMIN_FEES),
      on("POST", FEES_URL, ADMIN_FEES, 201),
    );
    renderAccounts();

    await userEvent.click(
      await screen.findByRole("button", { name: "Fee details for Aarav Sharma" }),
    );
    const details = screen.getByRole("dialog", { name: "Fees for Aarav Sharma" });
    expect(await within(details).findByText("Visa fee (processing)")).toBeInTheDocument();
    expect(within(details).getByRole("link", { name: "Open their profile" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
    await userEvent.click(within(details).getByRole("button", { name: "Add a fee" }));
    const add = screen.getByRole("dialog", { name: "Add a fee for Aarav Sharma" });
    await pickFeeType(add, "IELTS class");
    await userEvent.type(within(add).getByLabelText("Amount (NPR)"), "18000");
    await userEvent.click(within(add).getByRole("button", { name: "Add fee" }));

    expect(await screen.findByText("Fee added")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", FEES_URL)).toEqual({
      fee_type: uid(4),
      note: "",
      amount: 18000,
    });
    expect(callsTo(fetchFn, "GET", OWING_URL).length).toBeGreaterThan(1);
  });

  it("takes a payment from Details", async () => {
    backend(on("GET", OWING_URL, OWING), on("GET", FEES_URL, ADMIN_FEES));
    renderAccounts();

    await userEvent.click(
      await screen.findByRole("button", { name: "Fee details for Aarav Sharma" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Take a payment" }));

    expect(
      screen.getByRole("dialog", { name: "Record a payment from Aarav Sharma" }),
    ).toBeInTheDocument();
  });

  it("switches to Money in", async () => {
    backend(on("GET", OWING_URL, OWING), on("GET", THIS_MONTH, NO_PAYMENTS));
    renderAccounts();

    await userEvent.click(screen.getByRole("button", { name: "Money in" }));

    expect(await screen.findByRole("heading", { name: "Money in" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Student fees" })).not.toBeInTheDocument();
  });
});

describe("the Admin's Home money", () => {
  const MONTH = { ...NO_PAYMENTS, count: 3, total: 58000 };

  // These check the figures themselves, so the amounts start shown (ticket 13).
  beforeEach(() => {
    window.localStorage.setItem(HOME_AMOUNTS_KEY, "shown");
  });

  it("shows this month's money in and the fees still to collect, then who owes most", async () => {
    backend(
      on("GET", HOME_OWING_URL, OWING),
      on("GET", THIS_MONTH, MONTH),
      on("GET", MONEY_OUT, NO_EXPENSES),
      on("GET", RECEIVED, { total: 0, count: 0 }),
      on("GET", COMMISSION, NO_COMMISSION),
    );
    withProviders(ADMIN, <HomePage />);

    const glance = await screen.findByRole("region", { name: "This month at a glance" });
    expect(
      await within(glance).findByText("NPR 58,000 from Students, NPR 0 commission"),
    ).toBeInTheDocument();
    expect(within(glance).getByText("NPR 1,30,000")).toHaveClass("text-warn");
    expect(
      within(glance).getByText("2 Students owe money. See it by Fee Type"),
    ).toBeInTheDocument();
    expect(within(glance).getByRole("link", { name: /Fees still to collect/ })).toHaveAttribute(
      "href",
      "/accounts/fees-by-type",
    );
    expect(within(glance).getByRole("link", { name: "Open Accounts" })).toHaveAttribute(
      "href",
      "/accounts",
    );
    const owes = screen.getByRole("region", { name: "Who still owes fees" });
    expect(within(owes).getByText("NPR 80,000 left")).toBeInTheDocument();
    expect(within(owes).getByText("Paid NPR 15,000 of NPR 65,000 (23%)")).toBeInTheDocument();
    expect(within(owes).getByRole("link", { name: "See all (2)" })).toHaveAttribute(
      "href",
      "/accounts",
    );
  });

  it("shows at most three who owe (ticket 12)", async () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      student: { id: uid(index + 1), name: `Student ${String(index + 1)}` },
      fees: 1000,
      paid: 0,
      still_to_pay: 1000,
    }));
    backend(
      on("GET", HOME_OWING_URL, { ...OWING, count: 7, results: many }),
      on("GET", THIS_MONTH, MONTH),
      on("GET", MONEY_OUT, NO_EXPENSES),
      on("GET", RECEIVED, { total: 0, count: 0 }),
      on("GET", COMMISSION, NO_COMMISSION),
    );
    withProviders(ADMIN, <HomePage />);

    const owes = await screen.findByRole("list", { name: "Who still owes fees" });
    expect(within(owes).getAllByRole("listitem")).toHaveLength(3);
  });

  it("says when everyone has paid, and when the money can't be loaded", async () => {
    backend(on("GET", HOME_OWING_URL, { ...OWING, count: 0, results: [] }));
    withProviders(ADMIN, <HomePage />);

    expect(await screen.findByText("Everyone has paid in full.")).toBeInTheDocument();
    expect(
      await screen.findByText("We couldn't load this month's money. Please refresh the page."),
    ).toBeInTheDocument();
  });
});

describe("an eye on Home's money (ticket 13)", () => {
  const MONTH = { ...NO_PAYMENTS, count: 3, total: 58000 };

  function onHomeMoney() {
    return backend(
      on("GET", HOME_OWING_URL, OWING),
      on("GET", THIS_MONTH, MONTH),
      on("GET", MONEY_OUT, NO_EXPENSES),
      on("GET", RECEIVED, { total: 0, count: 0 }),
      on("GET", COMMISSION, NO_COMMISSION),
    );
  }

  async function openHome() {
    const view = withProviders(ADMIN, <HomePage />);
    const glance = await screen.findByRole("region", { name: "This month at a glance" });
    await within(glance).findByText("Fees still to collect");
    const owes = screen.getByRole("region", { name: "Who still owes fees" });
    return { view, glance, owes };
  }

  function eye(name: "Show amounts" | "Hide amounts") {
    return screen.getByRole("button", { name });
  }

  it("sits right after the title, slightly bigger than other icons (list tidy-ups 13)", async () => {
    onHomeMoney();
    const { glance } = await openHome();

    const title = within(glance).getByRole("heading", { name: "This month at a glance" });
    const button = eye("Show amounts");
    expect(title.nextElementSibling).toBe(button);
    expect(button.querySelector("svg")).toHaveClass("size-6");
  });

  it("shows a crossed-out eye while hidden and an open eye while shown (list tidy-ups 16)", async () => {
    onHomeMoney();
    await openHome();

    expect(eye("Show amounts").querySelector("svg")).toHaveAttribute("data-icon", "eyeOff");
    await userEvent.click(eye("Show amounts"));
    expect(eye("Hide amounts").querySelector("svg")).toHaveAttribute("data-icon", "eye");
  });

  it("hides every amount at first, keeping names, counts and labels", async () => {
    onHomeMoney();
    const { glance, owes } = await openHome();

    expect(within(glance).queryByText(/NPR/)).not.toBeInTheDocument();
    expect(within(owes).queryByText(/NPR/)).not.toBeInTheDocument();
    expect(within(glance).getByText("***** from Students, ***** commission")).toBeInTheDocument();
    expect(within(glance).getByText("Fees still to collect")).toBeInTheDocument();
    expect(
      within(glance).getByText("2 Students owe money. See it by Fee Type"),
    ).toBeInTheDocument();
    expect(within(owes).getByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
    expect(within(owes).getAllByText("***** left")).toHaveLength(2);
    expect(within(owes).getByText("Paid ***** of ***** (23%)")).toBeInTheDocument();
    expect(eye("Show amounts")).toHaveAttribute("aria-pressed", "false");
    expect(eye("Show amounts")).toHaveAttribute("title", "Show amounts");
  });

  it("lets screen readers hear Hidden in place of each amount", async () => {
    onHomeMoney();
    const { glance, owes } = await openHome();

    expect(within(owes).getAllByText("Hidden left")[0]).toHaveClass("sr-only");
    expect(within(owes).getAllByText("***** left")[0]).toHaveAttribute("aria-hidden", "true");
    expect(
      within(glance).getByRole("link", { name: /Fees still to collect/ }),
    ).toHaveAccessibleName(/Hidden/);
  });

  it("shows and hides both sections with the one eye, keeping the scroll and the focus", async () => {
    onHomeMoney();
    const { glance, owes } = await openHome();

    await userEvent.click(eye("Show amounts"));

    expect(
      within(glance).getByText("NPR 58,000 from Students, NPR 0 commission"),
    ).toBeInTheDocument();
    expect(within(owes).getByText("NPR 80,000 left")).toBeInTheDocument();
    expect(within(owes).getByText("Paid NPR 15,000 of NPR 65,000 (23%)")).toBeInTheDocument();
    expect(eye("Hide amounts")).toHaveAttribute("aria-pressed", "true");
    expect(eye("Hide amounts")).toHaveFocus();

    await userEvent.click(eye("Hide amounts"));

    expect(within(glance).queryByText(/NPR/)).not.toBeInTheDocument();
    expect(within(owes).getAllByText("***** left")).toHaveLength(2);
    expect(eye("Show amounts")).toHaveFocus();
  });

  it("remembers the choice on this device", async () => {
    onHomeMoney();
    const { view } = await openHome();
    await userEvent.click(eye("Show amounts"));
    view.unmount();

    onHomeMoney();
    const { owes } = await openHome();

    expect(within(owes).getByText("NPR 80,000 left")).toBeInTheDocument();
    expect(eye("Hide amounts")).toBeInTheDocument();
  });

  it("starts hidden for anything stored that isn't a choice", async () => {
    window.localStorage.setItem(HOME_AMOUNTS_KEY, "<script>");
    onHomeMoney();
    const { owes } = await openHome();

    expect(within(owes).getAllByText("***** left")).toHaveLength(2);
  });

  it("still works for this visit when the browser refuses storage", async () => {
    const refuse = () => {
      throw new DOMException("Storage refused", "SecurityError");
    };
    const reads = vi.spyOn(Storage.prototype, "getItem").mockImplementation(refuse);
    const writes = vi.spyOn(Storage.prototype, "setItem").mockImplementation(refuse);
    try {
      onHomeMoney();
      const { owes } = await openHome();
      expect(within(owes).getAllByText("***** left")).toHaveLength(2);

      await userEvent.click(eye("Show amounts"));

      expect(within(owes).getByText("NPR 80,000 left")).toBeInTheDocument();
    } finally {
      reads.mockRestore();
      writes.mockRestore();
    }
  });

  it("leaves the Accounts page alone", async () => {
    backend(on("GET", OWING_URL, OWING));
    withProviders(ADMIN, <AccountsPage />);

    expect(await screen.findByText("NPR 1,70,000")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show amounts" })).not.toBeInTheDocument();
  });
});

describe("Fee changes in Activity", () => {
  it("describes added, changed and deleted fees", async () => {
    const entry = {
      at: "2026-11-03T10:15:00+05:45",
      by: { name: "Bikash Thapa", is_platform_admin: false },
      detail: "",
    };
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", `/api/students/${uid(7)}/history/`, {
        count: 3,
        page: 1,
        page_size: 50,
        results: [
          { ...entry, id: uid(3), kind: "fee_deleted", before: "PTE class, NPR 18,000", after: "" },
          {
            ...entry,
            id: uid(2),
            kind: "fee_edited",
            before: "Visa processing, NPR 40,000",
            after: "Visa processing, NPR 45,000",
          },
          {
            ...entry,
            id: uid(1),
            kind: "fee_added",
            before: "",
            after: "Visa processing, NPR 40,000",
          },
        ],
      }),
    );
    withProviders(ADMIN, <StudentProfilePage studentId={uid(7)} />);

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(await screen.findByText("Fee deleted: PTE class, NPR 18,000")).toBeInTheDocument();
    expect(screen.getByText("Fee changed: Visa processing, NPR 45,000")).toBeInTheDocument();
    expect(screen.getByText("Fee added: Visa processing, NPR 40,000")).toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("Fees in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the Student fees list and the Fees tab", async () => {
    backend(
      on("GET", OWING_URL, OWING),
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", FEES_URL, ADMIN_FEES),
      on("GET", STUDENT_PAYMENTS, NO_PAYMENTS),
    );
    const accounts = withProviders(ADMIN, <AccountsPage />);
    expect(await screen.findByText("Sita Karki")).toBeInTheDocument();
    accounts.unmount();

    await openFeesTab();

    expect(await screen.findByText("Visa fee (processing)")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});
