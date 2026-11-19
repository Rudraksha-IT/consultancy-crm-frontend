import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend as backendOnly, callsTo, on, type Answer } from "@/test/backend";
import { feeTypeRef, onFeeTypes } from "@/test/feeTypes";
import { PROFILE } from "@/test/studentProfile";
import { consultancySummary } from "@/test/consultancy";

/** The canned backend, always with the office's Fee Types for the form. */
function backend(...answers: Answer[]) {
  return backendOnly(...answers, onFeeTypes);
}

const FRONT_DESK: StaffContext = {
  staff: { id: 8, name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const ADMIN: StaffContext = {
  ...FRONT_DESK,
  staff: { id: 1, name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
};

const DESK_PROFILE = { ...PROFILE, can_change: false, can_set_stage: false, can_transfer: false };

const RECEIPT = {
  id: 412,
  receipt_number: "000412",
  student: { id: 7, name: "Sita Gurung", phone: "9841000001" },
  amount: 25000,
  paid_on: "2026-11-02",
  method: "esewa",
  fee_type: feeTypeRef(1),
  note: "",
  recorded_by: { name: "Ramesh KC" },
  recorded_at: "2026-11-02T10:15:00+05:45",
};

const PAYMENTS = "/api/students/7/payments/";

function renderPage(context: StaffContext = FRONT_DESK) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={7} />
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

async function fillAndSave(dialog: HTMLElement): Promise<void> {
  await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "25000");
  await userEvent.selectOptions(within(dialog).getByLabelText("Method"), "esewa");
  await userEvent.selectOptions(
    await within(dialog).findByRole("combobox", { name: "Fee Type" }),
    await within(dialog).findByRole("option", { name: "Application fee" }),
  );
  await userEvent.click(within(dialog).getByRole("button", { name: "Save and show receipt" }));
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
  it("opens the form with the amount focused, today's date in AD and BS, and Cash", async () => {
    backend(on("GET", "/api/students/7/", DESK_PROFILE));
    renderPage();

    const dialog = await openPaymentDialog();

    expect(within(dialog).getByLabelText("Amount (NPR)")).toHaveFocus();
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2026-11-02");
    expect(within(dialog).getByText("16 Kartik 2083 BS")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Method")).toHaveValue("cash");
    expect(
      within(dialog).getByText(
        "After saving you'll see the receipt. Other Payments and totals stay with the Admin.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the BS date of the day chosen", async () => {
    backend(on("GET", "/api/students/7/", DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();
    const date = within(dialog).getByLabelText("Date");

    await userEvent.clear(date);
    await userEvent.type(date, "2026-04-14");

    expect(within(dialog).getByText("1 Baisakh 2083 BS")).toBeInTheDocument();
  });

  it("doesn't tell an Admin that totals stay with the Admin", async () => {
    backend(on("GET", "/api/students/7/", PROFILE));
    renderPage(ADMIN);

    const dialog = await openPaymentDialog();

    expect(within(dialog).getByText("After saving you'll see the receipt.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/stay with the Admin/)).not.toBeInTheDocument();
  });

  it("saves the Payment and shows its receipt", async () => {
    const fetchFn = backend(
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("POST", PAYMENTS, RECEIPT, 201),
    );
    renderPage();

    await fillAndSave(await openPaymentDialog());

    const receipt = await screen.findByRole("dialog", { name: "Receipt" });
    expect(sentBody(fetchFn)).toEqual({
      amount: 25000,
      paid_on: "2026-11-02",
      method: "esewa",
      fee_type: 1,
      note: "",
    });
    expect(screen.getByText("Payment recorded")).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Record a payment from Sita Gurung" }),
    ).not.toBeInTheDocument();
    expect(within(receipt).getByRole("heading", { name: "Acme Education" })).toBeInTheDocument();
    for (const text of [
      "000412",
      "2 Nov 2026",
      "16 Kartik 2083 BS",
      "Sita Gurung, 9841000001",
      "Application fee",
      "eSewa",
      "NPR 25,000",
      "Rupees Twenty-Five Thousand only",
      "Received by Ramesh KC",
    ]) {
      expect(within(receipt).getByText(text)).toBeInTheDocument();
    }
  });

  it("puts the office logo on the receipt, with the office name", async () => {
    backend(on("GET", "/api/students/7/", DESK_PROFILE), on("POST", PAYMENTS, RECEIPT, 201));
    const logo = { url: "/api/consultancy/logo/2/", showName: false };
    renderPage({ ...FRONT_DESK, consultancy: { ...consultancySummary(), logo } });

    await fillAndSave(await openPaymentDialog());

    const receipt = await screen.findByRole("dialog", { name: "Receipt" });
    expect(receipt.querySelector("img")).toHaveAttribute("src", "/api/consultancy/logo/2/");
    // A receipt always names the office, whatever the sidebar shows.
    expect(within(receipt).getByRole("heading", { name: "Acme Education" })).toBeInTheDocument();
  });

  it("prints the receipt with the browser's print dialog", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    backend(on("GET", "/api/students/7/", DESK_PROFILE), on("POST", PAYMENTS, RECEIPT, 201));
    renderPage();
    await fillAndSave(await openPaymentDialog());
    const receipt = await screen.findByRole("dialog", { name: "Receipt" });

    await userEvent.click(within(receipt).getByRole("button", { name: "Print receipt" }));

    expect(print).toHaveBeenCalledOnce();
  });

  it("closes the receipt with Escape", async () => {
    backend(on("GET", "/api/students/7/", DESK_PROFILE), on("POST", PAYMENTS, RECEIPT, 201));
    renderPage();
    await fillAndSave(await openPaymentDialog());
    await screen.findByRole("dialog", { name: "Receipt" });

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Receipt" })).not.toBeInTheDocument();
  });

  it("shows text the person typed as text, never as HTML", async () => {
    const note = "<img src=x onerror=alert(1)>";
    backend(
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("POST", PAYMENTS, { ...RECEIPT, note }, 201),
    );
    renderPage();

    await fillAndSave(await openPaymentDialog());

    const receipt = await screen.findByRole("dialog", { name: "Receipt" });
    expect(within(receipt).getByText(`Application fee (${note})`)).toBeInTheDocument();
    expect(receipt.querySelector("img")).toBeNull();
  });

  it("shows the server's message under a refused field and stays open", async () => {
    const message = "Enter a date from 1 Jan 2000 to today.";
    backend(
      on("GET", "/api/students/7/", DESK_PROFILE),
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
      const fetchFn = backend(on("GET", "/api/students/7/", DESK_PROFILE));
      renderPage();
      const dialog = await openPaymentDialog();

      if (amount !== "")
        await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), amount);
      await userEvent.selectOptions(
        await within(dialog).findByRole("combobox", { name: "Fee Type" }),
        await within(dialog).findByRole("option", { name: "Visa fee" }),
      );
      await userEvent.click(within(dialog).getByRole("button", { name: "Save and show receipt" }));

      expect(
        within(dialog).getByText("Enter a whole amount from NPR 1 to NPR 10,00,00,000."),
      ).toBeInTheDocument();
      expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);
    },
  );

  it("offers the Fee Types in order without the hidden ones, and asks for one", async () => {
    const fetchFn = backend(on("GET", "/api/students/7/", DESK_PROFILE));
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
    await userEvent.click(within(dialog).getByRole("button", { name: "Save and show receipt" }));

    expect(within(dialog).getByText("Choose a Fee Type.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);
  });

  it("needs a note for Other before sending, and sends it", async () => {
    const fetchFn = backend(
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("POST", PAYMENTS, { ...RECEIPT, fee_type: feeTypeRef(7), note: "SOP check" }, 201),
    );
    renderPage();
    const dialog = await openPaymentDialog();
    await userEvent.type(within(dialog).getByLabelText("Amount (NPR)"), "500");
    await userEvent.selectOptions(
      await within(dialog).findByRole("combobox", { name: "Fee Type" }),
      await within(dialog).findByRole("option", { name: "Other" }),
    );
    expect(within(dialog).getByText("Needed for Other: say what it is for.")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save and show receipt" }));
    expect(within(dialog).getByText("Add a short note for Other.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PAYMENTS)).toHaveLength(0);

    await userEvent.type(within(dialog).getByLabelText("Note"), "  SOP check ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save and show receipt" }));

    const receipt = await screen.findByRole("dialog", { name: "Receipt" });
    expect(sentBody(fetchFn)).toMatchObject({ fee_type: 7, note: "SOP check" });
    expect(within(receipt).getByText("Other (SOP check)")).toBeInTheDocument();
  });

  it("says so when the Fee Types can't be loaded", async () => {
    backendOnly(on("GET", "/api/students/7/", DESK_PROFILE));
    renderPage();
    const dialog = await openPaymentDialog();

    expect(
      await within(dialog).findByText("We couldn't load the Fee Types. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("says so when the save isn't allowed", async () => {
    backend(
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("POST", PAYMENTS, { detail: "Teachers can't see Students." }, 403),
    );
    renderPage();
    const dialog = await openPaymentDialog();

    await fillAndSave(dialog);

    expect(await within(dialog).findByText(/Refresh the page to see why/)).toBeInTheDocument();
  });

  it("asks to try again when the server fails", async () => {
    backend(on("GET", "/api/students/7/", DESK_PROFILE), on("POST", PAYMENTS, {}, 500));
    renderPage();
    const dialog = await openPaymentDialog();

    await fillAndSave(dialog);

    expect(
      await within(dialog).findByText("We couldn't save. Please try again."),
    ).toBeInTheDocument();
  });

  it("isn't offered when the Staff member can't take payments", async () => {
    backend(on("GET", "/api/students/7/", { ...DESK_PROFILE, can_record_payment: false }));
    renderPage();

    await screen.findByRole("heading", { name: "Sita Gurung" });

    expect(screen.queryByRole("button", { name: "Take a payment" })).not.toBeInTheDocument();
  });

  it("sits beside Assign a counsellor for a Student who has none", async () => {
    backend(
      on("GET", "/api/students/7/", {
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
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("GET", "/api/students/7/visits/?page=1", {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", "/api/students/7/history/", {
        count: 1,
        page: 1,
        page_size: 50,
        results: [
          {
            id: 3,
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
    backend(on("GET", "/api/students/7/", DESK_PROFILE));
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
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("POST", PAYMENTS, { ...RECEIPT, paid_on: "2026-10-20" }, 201),
    );
    renderPage(BS_DESK);
    const dialog = await openPaymentDialog();

    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Day" }), "3");
    await fillAndSave(dialog);

    await screen.findByRole("dialog", { name: "Receipt" });
    expect(sentBody(fetchFn)).toMatchObject({ paid_on: "2026-10-20" });
  });

  it("shows the receipt's date in BS with the AD date under it", async () => {
    backend(on("GET", "/api/students/7/", DESK_PROFILE), on("POST", PAYMENTS, RECEIPT, 201));
    renderPage(BS_DESK);

    await fillAndSave(await openPaymentDialog());

    const receipt = await screen.findByRole("dialog", { name: "Receipt" });
    // Once at the top and once on the "Received" stamp.
    expect(within(receipt).getAllByText("16 Kartik 2083")).toHaveLength(2);
    expect(within(receipt).getByText("2 Nov 2026 AD")).toBeInTheDocument();
    expect(within(receipt).queryByText("16 Kartik 2083 BS")).not.toBeInTheDocument();
  });

  it("dates Activity in BS", async () => {
    backend(
      on("GET", "/api/students/7/", DESK_PROFILE),
      on("GET", "/api/students/7/visits/?page=1", {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", "/api/students/7/history/", {
        count: 1,
        page: 1,
        page_size: 50,
        results: [
          {
            id: 3,
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
