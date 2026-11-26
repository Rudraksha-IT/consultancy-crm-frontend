import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import type { RecordId } from "@/lib/recordId";
import { backend as backendOnly, callsTo, on, type Answer } from "@/test/backend";
import { feeTypeRef, onFeeTypes } from "@/test/feeTypes";
import { PROFILE } from "@/test/studentProfile";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

/** The canned backend, always with the office's Fee Types for the form. */
function backend(...answers: Answer[]) {
  return backendOnly(...answers, onFeeTypes);
}

const FRONT_DESK: StaffContext = {
  staff: { id: uid(8), name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const ADMIN: StaffContext = {
  ...FRONT_DESK,
  staff: { id: uid(1), name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
};

const DESK_PROFILE = { ...PROFILE, can_change: false, can_set_stage: false, can_transfer: false };

type Line = {
  id: RecordId;
  fee_type: { id: RecordId; name: string };
  note: string;
  amount: number;
};

const APPLICATION_FEE: Line = {
  id: uid(412),
  fee_type: feeTypeRef(uid(1)),
  note: "",
  amount: 25000,
};

/** A receipt as the API answers it, for Payment 412 (the first line), with these lines. */
function receiptWith(first: Line, ...more: Line[]) {
  const lines = [first, ...more];
  return {
    id: uid(412),
    receipt_number: "000412",
    student: { id: uid(7), name: "Sita Gurung", phone: "9841000001" },
    amount: first.amount,
    paid_on: "2026-11-02",
    method: "esewa",
    fee_type: first.fee_type,
    note: first.note,
    recorded_by: { name: "Ramesh KC" },
    recorded_at: "2026-11-02T10:15:00+05:45",
    lines: lines.map((line) => ({ ...line, paid_on: "2026-11-02", method: "esewa" })),
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}

const RECEIPT = receiptWith(APPLICATION_FEE);

const PAYMENTS = `/api/students/${uid(7)}/payments/`;

function renderPage(context: StaffContext = FRONT_DESK) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={uid(7)} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>): unknown {
  const [call] = callsTo(fetchFn, "POST", PAYMENTS);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

async function openPaymentDialog(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole("button", { name: "Take a payment" }));
  return screen.getByRole("dialog", { name: "Record a payment from Sita Gurung" });
}

/** One line of the form, by its place (1 for the first). */
function line(dialog: HTMLElement, place: number): HTMLElement {
  return within(dialog).getByRole("group", { name: `Line ${String(place)}` });
}

/** Choose the Fee Type, then type the note (if any) and the amount, on one line. */
async function fillLine(
  row: HTMLElement,
  feeType: string,
  amount: string,
  note = "",
): Promise<void> {
  await userEvent.selectOptions(
    await within(row).findByRole("combobox", { name: "Fee Type" }),
    await within(row).findByRole("option", { name: feeType }),
  );
  if (note !== "") await userEvent.type(within(row).getByLabelText(/^Note/), note);
  if (amount !== "") await userEvent.type(within(row).getByLabelText("Amount (NPR)"), amount);
}

function save(dialog: HTMLElement): Promise<void> {
  return userEvent.click(within(dialog).getByRole("button", { name: "Save payment" }));
}

async function fillAndSave(dialog: HTMLElement): Promise<void> {
  await userEvent.selectOptions(within(dialog).getByLabelText("Method"), "esewa");
  await fillLine(line(dialog, 1), "Application fee", "25000");
  await save(dialog);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("taking a payment", () => {
  it("opens on today's date in AD and BS, Cash, and one line with no total yet", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();

    const dialog = await openPaymentDialog();

    expect(within(dialog).getByLabelText("Date")).toHaveFocus();
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-11-02");
    expect(within(dialog).getByRole("group", { name: "What it's for" })).toBeInTheDocument();
    expect(within(dialog).getAllByRole("group", { name: /^Line / })).toHaveLength(1);
    expect(within(line(dialog, 1)).getByLabelText("Amount (NPR)")).toHaveValue(null);
    expect(within(dialog).queryByRole("button", { name: /^Remove line/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("Total NPR 0");
    expect(within(dialog).getByText("16 Kartik 2083 BS")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Method")).toHaveValue("cash");
    expect(
      within(dialog).getByText("Other Payments and totals stay with the Admin."),
    ).toBeInTheDocument();
  });

  it("shows the BS date of the day chosen", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();
    const date = within(dialog).getByLabelText("Date");

    await userEvent.clear(date);
    await userEvent.type(date, "2026-04-14");

    expect(within(dialog).getByText("1 Baisakh 2083 BS")).toBeInTheDocument();
  });

  it("doesn't tell an Admin that totals stay with the Admin", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, PROFILE));
    renderPage(ADMIN);

    const dialog = await openPaymentDialog();

    // No receipt is shown or printed for now (asked 2026-11-20).
    expect(within(dialog).queryByText(/receipt/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/stay with the Admin/)).not.toBeInTheDocument();
  });

  it("saves the Payment, says so and closes, with no receipt to show or print (2026-11-20)", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("POST", PAYMENTS, RECEIPT, 201),
    );
    renderPage();

    await fillAndSave(await openPaymentDialog());

    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
    expect(sentBody(fetchFn)).toEqual({
      paid_on: "2026-11-02",
      method: "esewa",
      lines: [{ fee_type: uid(1), note: "", amount: 25000 }],
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print receipt" })).not.toBeInTheDocument();
  });

  it("shows the server's message under a refused field and stays open", async () => {
    const message = "Enter a date from 1 Jan 2000 to today.";
    backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("POST", PAYMENTS, { paid_on: [message] }, 400),
    );
    renderPage();
    const dialog = await openPaymentDialog();

    await fillAndSave(dialog);

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Receipt" })).not.toBeInTheDocument();
  });

  it.each(["", "0", "12.5", "-4", "100000001"])(
    "refuses the amount %j before sending it",
    async (amount) => {
      const fetchFn = backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
      renderPage();
      const dialog = await openPaymentDialog();

      await fillLine(line(dialog, 1), "Visa fee", amount);
      await save(dialog);

      expect(
        within(dialog).getByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
      ).toBeInTheDocument();
      expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);
    },
  );

  it("offers the Fee Types in order without the hidden ones, and asks for one", async () => {
    const fetchFn = backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();
    const picker = await within(dialog).findByRole("combobox", { name: "Fee Type" });
    await within(dialog).findByRole("option", { name: "Visa fee" });

    expect(
      within(picker)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Choose a Fee Type",
      "Application fee",
      "College / tuition fee",
      "Visa fee",
      "IELTS class",
      "Documentation / other services",
      "Other",
    ]);
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "500");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save payment" }));

    expect(within(dialog).getByText("Choose a Fee Type.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);
  });

  it("needs a note for Other before sending, and sends it", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on(
        "POST",
        PAYMENTS,
        receiptWith({ id: uid(412), fee_type: feeTypeRef(uid(7)), note: "SOP check", amount: 500 }),
        201,
      ),
    );
    renderPage();
    const dialog = await openPaymentDialog();
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "500");
    await userEvent.selectOptions(
      await within(dialog).findByRole("combobox", { name: "Fee Type" }),
      await within(dialog).findByRole("option", { name: "Other" }),
    );
    expect(within(dialog).getByText("Needed for Other: say what it is for.")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save payment" }));
    expect(within(dialog).getByText("Add a short note for Other.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);

    await userEvent.type(within(dialog).getByLabelText("Note"), "  SOP check ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save payment" }));

    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
    expect(sentBody(fetchFn)).toMatchObject({
      lines: [{ fee_type: uid(7), note: "SOP check", amount: 500 }],
    });
  });

  it("says so when the Fee Types can't be loaded", async () => {
    backendOnly(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();

    expect(
      await within(dialog).findByText("We couldn't load the Fee Types. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("says so when the save isn't allowed", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("POST", PAYMENTS, { detail: "Teachers can't see Students." }, 403),
    );
    renderPage();
    const dialog = await openPaymentDialog();

    await fillAndSave(dialog);

    expect(await within(dialog).findByText(/Refresh the page to see why/)).toBeInTheDocument();
  });

  it("asks to try again when the server fails", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE), on("POST", PAYMENTS, {}, 500));
    renderPage();
    const dialog = await openPaymentDialog();

    await fillAndSave(dialog);

    expect(
      await within(dialog).findByText("We couldn't save. Please try again."),
    ).toBeInTheDocument();
  });

  it("splits one visit across Fee Types and saves every line together", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on(
        "POST",
        PAYMENTS,
        receiptWith(
          { id: uid(412), fee_type: feeTypeRef(uid(3)), note: "", amount: 40000 },
          { id: uid(413), fee_type: feeTypeRef(uid(4)), note: "first half", amount: 10000 },
        ),
        201,
      ),
    );
    renderPage();
    const dialog = await openPaymentDialog();
    await fillLine(line(dialog, 1), "Visa fee", "40000");

    await userEvent.click(within(dialog).getByRole("button", { name: "Add another line" }));

    expect(within(line(dialog, 2)).getByRole("combobox", { name: "Fee Type" })).toHaveFocus();
    await fillLine(line(dialog, 2), "IELTS class", "10000", "first half");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Total NPR 50,000");
    await save(dialog);

    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
    expect(sentBody(fetchFn)).toEqual({
      paid_on: "2026-11-02",
      method: "cash",
      lines: [
        { fee_type: uid(3), note: "", amount: 40000 },
        { fee_type: uid(4), note: "first half", amount: 10000 },
      ],
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes a line, keeps focus on the line now in its place, and updates the total", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();
    await fillLine(line(dialog, 1), "Visa fee", "40000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add another line" }));
    await fillLine(line(dialog, 2), "IELTS class", "10000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add another line" }));
    await fillLine(line(dialog, 3), "Other", "500", "Courier");

    await userEvent.click(within(dialog).getByRole("button", { name: "Remove line 2" }));

    expect(within(dialog).getAllByRole("group", { name: /^Line / })).toHaveLength(2);
    expect(within(line(dialog, 2)).getByRole("combobox", { name: "Fee Type" })).toHaveFocus();
    expect(within(line(dialog, 2)).getByLabelText(/^Note/)).toHaveValue("Courier");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Total NPR 40,500");

    await userEvent.click(within(dialog).getByRole("button", { name: "Remove line 2" }));

    expect(within(line(dialog, 1)).getByRole("combobox", { name: "Fee Type" })).toHaveFocus();
    expect(within(dialog).queryByRole("button", { name: /^Remove line/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("Total NPR 40,000");
  });

  it("takes up to ten lines", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();

    for (let added = 1; added < 10; added += 1) {
      await userEvent.click(within(dialog).getByRole("button", { name: "Add another line" }));
    }

    expect(within(dialog).getAllByRole("group", { name: /^Line / })).toHaveLength(10);
    expect(
      within(dialog).queryByRole("button", { name: "Add another line" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText("Up to 10 lines in one payment.")).toBeInTheDocument();
  });

  it("names a refused line before sending anything", async () => {
    const fetchFn = backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();
    await fillLine(line(dialog, 1), "Visa fee", "40000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add another line" }));
    await fillLine(line(dialog, 2), "Other", "");

    await save(dialog);

    expect(within(line(dialog, 2)).getByText("Add a short note for Other.")).toBeInTheDocument();
    expect(
      within(line(dialog, 2)).getByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
    ).toBeInTheDocument();
    expect(within(line(dialog, 1)).queryByText(/Enter a whole amount/)).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);
  });

  it("shows the server's refusal of one line under that line, and saves nothing", async () => {
    const hidden = "This Fee Type is hidden. Choose another.";
    backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("POST", PAYMENTS, { lines: [{}, { fee_type: [hidden] }] }, 400),
    );
    renderPage();
    const dialog = await openPaymentDialog();
    await fillLine(line(dialog, 1), "Visa fee", "40000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add another line" }));
    await fillLine(line(dialog, 2), "IELTS class", "10000");

    await save(dialog);

    expect(await within(line(dialog, 2)).findByText(hidden)).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Receipt" })).not.toBeInTheDocument();
  });

  it("shows the server's refusal of the lines as a whole", async () => {
    const message = "Add 1 to 10 lines, each with a Fee Type and an amount.";
    backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("POST", PAYMENTS, { lines: [message] }, 400),
    );
    renderPage();
    const dialog = await openPaymentDialog();

    await fillAndSave(dialog);

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
  });

  it("isn't offered when the Staff member can't take payments", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, { ...DESK_PROFILE, can_record_payment: false }));
    renderPage();

    await screen.findByRole("heading", { name: "Sita Gurung" });

    expect(screen.queryByRole("button", { name: "Take a payment" })).not.toBeInTheDocument();
  });

  it("sits beside Assign a counsellor for a Student who has none", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, {
        ...DESK_PROFILE,
        assigned_counsellor: null,
        can_assign: true,
      }),
    );
    renderPage();

    expect(await screen.findByRole("button", { name: "Assign a counsellor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a payment" })).toBeInTheDocument();
  });
});

describe("the Activity tab", () => {
  it("describes a recorded Payment with its receipt number", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", `/api/students/${uid(7)}/history/`, {
        count: 1,
        page: 1,
        page_size: 50,
        results: [
          {
            id: uid(3),
            kind: "payment_recorded",
            at: "2026-11-02T10:15:00+05:45",
            by: { name: "Ramesh KC", is_platform_admin: false },
            before: "",
            after: "NPR 25,000, Application processing fee, eSewa",
            detail: "Receipt 000412",
          },
        ],
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(
      await screen.findByText("Payment recorded: NPR 25,000, Application processing fee, eSewa"),
    ).toBeInTheDocument();
    expect(screen.getByText("Receipt 000412")).toBeInTheDocument();
  });
});

describe("when the office shows dates in BS", () => {
  const BS_DESK: StaffContext = { ...FRONT_DESK, dateDisplay: "BS" };

  it("takes the date as a BS day, month and year, with the AD date under it", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE));
    renderPage(BS_DESK);

    const dialog = await openPaymentDialog();

    const date = within(dialog).getByRole("group", { name: "Date" });
    expect(within(date).getByRole("combobox", { name: "Day" })).toHaveValue("16");
    expect(within(date).getByRole("combobox", { name: "Month" })).toHaveDisplayValue("Kartik");
    expect(within(date).getByRole("textbox", { name: "Year" })).toHaveValue("2083");
    expect(within(date).getByText("2 Nov 2026 AD")).toBeInTheDocument();
  });

  it("sends the AD date of the BS day chosen", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("POST", PAYMENTS, { ...RECEIPT, paid_on: "2026-10-20" }, 201),
    );
    renderPage(BS_DESK);
    const dialog = await openPaymentDialog();

    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Day" }), "3");
    await fillAndSave(dialog);

    await screen.findByText("Payment recorded");
    expect(sentBody(fetchFn)).toMatchObject({ paid_on: "2026-10-20" });
  });

  it("dates Activity in BS", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, DESK_PROFILE),
      on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", `/api/students/${uid(7)}/history/`, {
        count: 1,
        page: 1,
        page_size: 50,
        results: [
          {
            id: uid(3),
            kind: "payment_recorded",
            at: "2026-11-02T10:15:00+05:45",
            by: { name: "Ramesh KC", is_platform_admin: false },
            before: "",
            after: "NPR 25,000, Application processing fee, eSewa",
            detail: "Receipt 000412",
          },
        ],
      }),
    );
    renderPage(BS_DESK);

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(await screen.findByText(/Ramesh KC, 16 Kartik 2083, \d{2}:\d{2}/)).toBeInTheDocument();
  });
});
