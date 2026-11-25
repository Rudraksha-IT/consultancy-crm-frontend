import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { FeesByTypePage } from "./FeesByTypePage";
import { FeeTypeStudentsPage } from "./FeeTypeStudentsPage";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Sunita Shrestha", email: "sunita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "payments", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const TOTALS_URL = "/api/accounts/fees-by-type/";
const COUNTED_URL = `/api/accounts/fees-by-type/${uid(3)}/?part=counted&page=1`;
const LOST_URL = `/api/accounts/fees-by-type/${uid(3)}/?part=lost&page=1`;

const TOTALS = {
  totals: {
    to_collect: 125000,
    received: 95000,
    remaining: 30000,
    lost_not_counted: 25000,
    owing: 1,
  },
  fee_types: [
    {
      fee_type: { id: uid(1), name: "Application fee", hidden: false },
      fees: 25000,
      received: 24000,
    },
    { fee_type: { id: uid(3), name: "Visa fee", hidden: false }, fees: 80000, received: 66000 },
    { fee_type: { id: uid(5), name: "PTE class", hidden: true }, fees: 0, received: 5000 },
  ],
};

const VISA = { id: uid(3), name: "Visa fee", hidden: false };

function page(part: "counted" | "lost", results: unknown[], extra: object = {}) {
  return {
    fee_type: VISA,
    fees: 80000,
    received: 66000,
    part,
    count: results.length,
    page: 1,
    page_size: 25,
    results,
    ...extra,
  };
}

const AARAV = {
  student: { id: uid(7), name: "Aarav Sharma", stage: "applying" },
  lost_reason: "",
  fee: 40000,
  paid: 10000,
  still_to_pay: 30000,
};
const SITA = {
  student: { id: uid(8), name: "Sita Karki", stage: "offer" },
  lost_reason: "",
  fee: 40000,
  paid: 41000,
  still_to_pay: 0,
};
const HARI = {
  student: { id: uid(9), name: "Hari Lama", stage: "lost" },
  lost_reason: "Went with another office",
  fee: 40000,
  paid: 15000,
  still_to_pay: 25000,
};

function withContext(context: StaffContext, ui: React.ReactNode) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>{ui}</ToastProvider>
    </StaffContextContext>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Fees by type", () => {
  it("shows To collect, Received and Remaining, then one row per Fee Type", async () => {
    backend(on("GET", TOTALS_URL, TOTALS));
    withContext(ADMIN, <FeesByTypePage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Fees by type" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByText("NPR 1,25,000")).toBeInTheDocument();
    expect(screen.getByText("1 Student has fees left to pay")).toBeInTheDocument();
    expect(screen.getByText("NPR 30,000")).toHaveClass("text-warn");

    const table = screen.getByRole("table", { name: "By Fee Type" });
    const rows = within(table).getAllByRole("row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Fee TypeFees addedReceived",
      expect.stringContaining("Application fee"),
      expect.stringContaining("Visa fee"),
      expect.stringContaining("PTE class"),
      "TotalNPR 1,05,000NPR 95,000",
    ]);
    expect(within(table).getByRole("link", { name: "Visa fee" })).toHaveAttribute(
      "href",
      `/accounts/fees-by-type/${uid(3)}`,
    );
    const pte = within(table).getByRole("row", { name: /PTE class/ });
    expect(within(pte).getByText("Hidden")).toBeInTheDocument();
    expect(
      screen.getByText(/Lost Students are left out of Remaining \(NPR 25,000 not counted\)/),
    ).toBeInTheDocument();
  });

  it("says when there is no money yet", async () => {
    backend(
      on("GET", TOTALS_URL, {
        totals: { to_collect: 0, received: 0, remaining: 0, lost_not_counted: 0, owing: 0 },
        fee_types: [],
      }),
    );
    withContext(ADMIN, <FeesByTypePage />);

    expect(await screen.findByText("No Fees or Payments yet.")).toBeInTheDocument();
    expect(
      screen.getByText(/Lost Students are left out of Remaining; what they paid/),
    ).toBeInTheDocument();
  });

  it("says when it can't load, and ignores a bad answer", async () => {
    backend(on("GET", TOTALS_URL, { totals: { received: -5 } }));
    withContext(ADMIN, <FeesByTypePage />);

    expect(
      await screen.findByText("We couldn't load Fees by type. Please refresh the page."),
    ).toBeInTheDocument();
  });

  const COUNSELLOR: StaffContext = { ...ADMIN, staff: { ...ADMIN.staff, role: "counsellor" } };
  const NO_ACCOUNTS: StaffContext = { ...ADMIN, modules: ["students", "payments"] };

  it.each([
    ["a Counsellor", COUNSELLOR],
    ["Accounts off", NO_ACCOUNTS],
  ])("isn't there for %s", (_, context) => {
    const fetchFn = backend();
    withContext(context, <FeesByTypePage />);

    expect(screen.getByText(/isn't available/i)).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", TOTALS_URL)).toHaveLength(0);
  });
});

describe("One Fee Type's Students", () => {
  it("lists the counted Students, each with their whole still to pay", async () => {
    backend(
      on("GET", COUNTED_URL, page("counted", [AARAV, SITA])),
      on("GET", LOST_URL, page("lost", [])),
    );
    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Visa fee" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Fees by type" })).toHaveAttribute(
      "href",
      "/accounts/fees-by-type",
    );
    const table = screen.getByRole("table", { name: "Students" });
    expect(within(table).getByRole("link", { name: "Aarav Sharma" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}?tab=fees`,
    );
    const sita = within(table).getByRole("row", { name: /Sita Karki/ });
    expect(within(sita).getByText("Paid in full")).toBeInTheDocument();
    expect(within(sita).getByText("Offer")).toBeInTheDocument();
    const aarav = within(table).getByRole("row", { name: /Aarav Sharma/ });
    expect(within(aarav).getByText("NPR 30,000")).toHaveClass("text-warn");
    expect(screen.getByText("2 Students")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lost, not counted" })).not.toBeInTheDocument();
  });

  it("shows Lost Students apart, with their reason", async () => {
    backend(
      on("GET", COUNTED_URL, page("counted", [AARAV])),
      on("GET", LOST_URL, page("lost", [HARI])),
    );
    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);

    const lost = await screen.findByRole("region", { name: "Lost, not counted" });
    const row = within(lost).getByRole("row", { name: /Hari Lama/ });
    expect(within(row).getByText("Lost")).toBeInTheDocument();
    expect(within(row).getByText("Went with another office")).toBeInTheDocument();
    expect(within(row).getByText("NPR 25,000")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Hari Lama" })).toHaveAttribute(
      "href",
      `/students/${uid(9)}?tab=fees`,
    );
  });

  it("says when a Fee Type is hidden, and when nobody is counted", async () => {
    const hidden = { fee_type: { ...VISA, hidden: true } };
    backend(
      on("GET", COUNTED_URL, page("counted", [], hidden)),
      on("GET", LOST_URL, page("lost", [], hidden)),
    );
    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);

    expect(await screen.findByText("Nobody is counted here.")).toBeInTheDocument();
    expect(screen.getByText(/This Fee Type is hidden/)).toBeInTheDocument();
  });

  it("pages through the counted Students and keeps focus on the pager", async () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      ...AARAV,
      student: { ...AARAV.student, id: uid(100 + index), name: `Student ${String(index)}` },
    }));
    const second = `/api/accounts/fees-by-type/${uid(3)}/?part=counted&page=2`;
    const fetchFn = backend(
      on("GET", COUNTED_URL, page("counted", many, { count: 26 })),
      on("GET", second, page("counted", [SITA], { count: 26, page: 2 })),
      on("GET", LOST_URL, page("lost", [])),
    );
    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);

    const next = await screen.findByRole("button", { name: /next/i });
    await userEvent.click(next);

    expect(await screen.findByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", second)).toHaveLength(1);
    expect(next).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1, name: "Visa fee" })).toBeInTheDocument();
  });

  it("says when the Fee Type isn't found", async () => {
    backend(
      on("GET", COUNTED_URL, { detail: "Not found." }, 404),
      on("GET", LOST_URL, { detail: "Not found." }, 404),
    );
    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);

    expect(await screen.findByText("We couldn't find this Fee Type.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fees by type" })).toBeInTheDocument();
  });

  it("says when it can't load", async () => {
    backend(on("GET", COUNTED_URL, { results: "x" }), on("GET", LOST_URL, page("lost", [])));
    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);

    expect(
      await screen.findByText(
        "We couldn't load this Fee Type's Students. Please refresh the page.",
      ),
    ).toBeInTheDocument();
  });

  it("isn't there for Front Desk", () => {
    const fetchFn = backend();
    withContext(
      { ...ADMIN, staff: { ...ADMIN.staff, role: "front_desk" } },
      <FeeTypeStudentsPage feeTypeId={uid(3)} />,
    );

    expect(screen.getByText(/isn't available/i)).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe.each(THEME_CASES)("Fees by type in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows both pages", async () => {
    backend(
      on("GET", TOTALS_URL, TOTALS),
      on("GET", COUNTED_URL, page("counted", [AARAV])),
      on("GET", LOST_URL, page("lost", [HARI])),
    );
    const first = withContext(ADMIN, <FeesByTypePage />);
    expect(await screen.findByRole("table", { name: "By Fee Type" })).toBeInTheDocument();
    first.unmount();

    withContext(ADMIN, <FeeTypeStudentsPage feeTypeId={uid(3)} />);
    expect(await screen.findByRole("region", { name: "Lost, not counted" })).toBeInTheDocument();
  });
});
