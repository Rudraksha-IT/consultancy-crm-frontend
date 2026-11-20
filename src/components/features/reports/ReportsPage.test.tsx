import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { ReportsPage } from "./ReportsPage";
import { consultancySummary } from "@/test/consultancy";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "reports"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const SIX_MONTHS = "/api/reports/students/?months=6";
const TWELVE_MONTHS = "/api/reports/students/?months=12";
const SOURCES = "/api/reports/sources/?from=2026-08-03&to=2026-11-03";
const STAFF_PROGRESS = "/api/reports/staff-progress/?from=2026-08-03&to=2026-11-03";
const CLASSES = "/api/reports/batches/?from=2026-08-03&to=2026-11-03";
const WITH_CLASSES: StaffContext = { ...ADMIN, modules: [...ADMIN.modules, "batches"] };
const WITH_ACCOUNTS: StaffContext = { ...ADMIN, modules: [...ADMIN.modules, "accounts"] };
const MONEY_SIX = "/api/reports/money/?months=6";
const MONEY_TWELVE = "/api/reports/money/?months=12";

function moneyMonth(key: string, fromStudents = 0, fromCommission = 0, moneyOut = 0) {
  return {
    month: key,
    from_students: fromStudents,
    from_commission: fromCommission,
    money_out: moneyOut,
  };
}

const MONEY = {
  months: [
    moneyMonth("2026-06"),
    moneyMonth("2026-07"),
    moneyMonth("2026-08", 300000, 0, 100000),
    moneyMonth("2026-09", 180000, 290000, 91500),
    moneyMonth("2026-10", 120000, 0, 120000),
    moneyMonth("2026-11", 18000, 0, 2500),
  ],
  money_out_by_category: [
    { category: "salaries", amount: 220000 },
    { category: "office_rent", amount: 85000 },
    { category: "internet", amount: 9000 },
  ],
  money_in_by_fee_type: [],
};

function month(key: string, counts: Record<string, number> = {}) {
  return {
    month: key,
    new_visitors: 0,
    signed_up: 0,
    applied: 0,
    visas_granted: 0,
    visas_refused: 0,
    lost: 0,
    ...counts,
  };
}

const MONTHS = [
  month("2026-06"),
  month("2026-07"),
  month("2026-08", { new_visitors: 38, signed_up: 15, applied: 13, visas_granted: 6 }),
  month("2026-09", {
    new_visitors: 30,
    signed_up: 12,
    applied: 14,
    visas_granted: 9,
    visas_refused: 2,
  }),
  month("2026-10", { new_visitors: 14, signed_up: 5, applied: 6, visas_granted: 3, lost: 4 }),
  month("2026-11", { new_visitors: 18, signed_up: 8, applied: 2, lost: 3 }),
];
const TWELVE = [
  ...["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"].map((key) =>
    month(key, { new_visitors: 1 }),
  ),
  ...MONTHS,
];
const SOURCE_COUNTS = {
  total: 7,
  sources: [
    { source: "walk_in", count: 4 },
    { source: "facebook", count: 3 },
    { source: "phone_call", count: 0 },
  ],
};
const STAFF_PROGRESS_ROWS = {
  counsellors: [
    {
      id: 3,
      name: "Bikash Thapa",
      is_active: true,
      students: 12,
      moved_forward: 4,
      applications_made: 3,
      visas_applied_for: 2,
      visas_granted: 1,
      students_lost: 2,
      tasks_done: 9,
    },
    {
      id: 5,
      name: "<b>Old</b> Counsellor",
      is_active: false,
      students: 2,
      moved_forward: 0,
      applications_made: 0,
      visas_applied_for: 0,
      visas_granted: 0,
      students_lost: 0,
      tasks_done: 0,
    },
  ],
  front_desk: [
    {
      id: 7,
      name: "Sunita Shrestha",
      is_active: true,
      visitors_registered: 1234,
      new_leads: 8,
      payments_taken: 5,
    },
  ],
  teachers: [],
  counted_from: { tasks_done: "2026-11-15" },
};

const COUNTRIES = {
  visas_granted_by_country: [
    { country: "australia", count: 9 },
    { country: "uk", count: 6 },
    { country: "other", count: 1 },
  ],
  countries_wanted: [
    { country: "canada", count: 40 },
    { country: "australia", count: 35 },
    { country: "new_zealand", count: 25 },
  ],
};
const NO_COUNTRIES = { visas_granted_by_country: [], countries_wanted: [] };

const EVERYTHING = [
  on("GET", SIX_MONTHS, { months: MONTHS, ...COUNTRIES }),
  on("GET", TWELVE_MONTHS, { months: TWELVE, ...NO_COUNTRIES }),
  on("GET", SOURCES, SOURCE_COUNTS),
  on("GET", STAFF_PROGRESS, STAFF_PROGRESS_ROWS),
  on("GET", MONEY_SIX, MONEY),
  on("GET", MONEY_TWELVE, {
    months: [moneyMonth("2025-12", 1000, 0, 0), ...MONEY.months],
    money_out_by_category: MONEY.money_out_by_category,
    money_in_by_fee_type: [],
  }),
  on("GET", CLASSES, {
    batches: [
      {
        id: 4,
        name: "IELTS Morning",
        test_type: "ielts",
        teacher: "Gita Lama",
        students: 12,
        attended_percent: 86,
      },
      {
        id: 6,
        name: "<i>PTE</i> Day",
        test_type: "pte",
        teacher: "Gita Lama",
        students: 1,
        attended_percent: null,
      },
    ],
  }),
];

function renderReports(context: StaffContext = ADMIN) {
  return render(
    <StaffContextContext value={context}>
      <ReportsPage />
    </StaffContextContext>,
  );
}

function region(name: string) {
  return screen.findByRole("region", { name });
}

/** The figure tile whose footnote is `footnote`. */
async function tile(footnote: string) {
  return (await screen.findByText(footnote)).parentElement;
}

async function openTab(name: string) {
  await userEvent.click(screen.getByRole("button", { name }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  resetTheme();
});

describe("Who sees the Reports", () => {
  it.each([
    ["a Counsellor", { ...ADMIN, staff: { ...ADMIN.staff, role: "counsellor" as const } }],
    ["a Teacher", { ...ADMIN, staff: { ...ADMIN.staff, role: "teacher" as const } }],
    [
      "an Admin without the Reports Module",
      { ...ADMIN, modules: ADMIN.modules.filter((module) => module !== "reports") },
    ],
  ])("tells %s the page isn't available and loads nothing", (_, context) => {
    const fetchFn = backend(...EVERYTHING);
    renderReports(context);

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe.each(THEME_CASES)("The Students report in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  it("shows the totals, the monthly chart and what happened to them", async () => {
    backend(...EVERYTHING);
    renderReports();

    expect(screen.getByRole("heading", { level: 1, name: "Reports" })).toBeInTheDocument();
    expect(await tile("in the last 6 months")).toHaveTextContent("New visitors100");
    expect(await tile("40% of visitors")).toHaveTextContent("Signed up40");
    expect(await tile("90% of visa decisions")).toHaveTextContent("Visas granted18");
    const chart = within(await region("Visitors, sign-ups and visas each month"));
    expect(
      chart.getByRole("img", { name: "Visitors, sign-ups and visas each month" }),
    ).toBeInTheDocument();
    const legend = within(chart.getByRole("list", { name: "Legend" }));
    expect(legend.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "New visitors",
      "Signed up",
      "Visa granted",
    ]);
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});

describe("The Students report", () => {
  it("adds up what happened to them, with the ones that didn't go through in grey", async () => {
    backend(...EVERYTHING);
    renderReports();

    const funnel = within(await screen.findByRole("list", { name: "What happened to them" }));
    const rows = funnel.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual([
      "Came inNew visitors100",
      "Signed upBecame Students40",
      "AppliedSent at least one application35",
      "Got a visa18",
      "Visa refused2",
      "StoppedMarked Lost7",
    ]);
    expect(
      screen.getByText(
        "Counts for the last 6 months. Grey bars are the ones that didn't go through.",
      ),
    ).toBeInTheDocument();
  });

  it("gives exact values for a month in the table view", async () => {
    backend(...EVERYTHING);
    renderReports();

    const chart = within(await region("Visitors, sign-ups and visas each month"));
    const table = chart.getByRole("table");
    const september = within(table).getByRole("row", { name: /Sep 2026/ });
    expect(
      within(september)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["Sep 2026", "30", "12", "9"]);
    expect(chart.getByText("Show as a table")).toBeInTheDocument();
  });

  it("switches to the last 12 months", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderReports();
    await screen.findByText("in the last 6 months");

    await userEvent.click(screen.getByRole("button", { name: "Last 12 months" }));

    expect(await tile("in the last 12 months")).toHaveTextContent("New visitors106");
    expect(screen.getByRole("button", { name: "Last 12 months" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(callsTo(fetchFn, "GET", TWELVE_MONTHS)).toHaveLength(1);
  });

  it("says so when the report can't be loaded", async () => {
    backend();
    renderReports();

    expect(
      await screen.findByText("We couldn't load this report. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("The Students report's countries", () => {
  it("shows visas granted by country and the countries Students want, most first", async () => {
    backend(...EVERYTHING);
    renderReports();

    const granted = within(await region("Visas granted by country"));
    expect(
      within(granted.getByRole("list", { name: "Visas granted by country" }))
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["Australia9", "UK6", "Other1"]);
    expect(granted.getByText("The country of the visa's university.")).toBeInTheDocument();
    const wanted = within(await region("Countries Students want"));
    expect(
      within(wanted.getByRole("list", { name: "Countries Students want" }))
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["Canada40", "Australia35", "New Zealand25"]);
    expect(
      wanted.getByText("Students who came in during the last 6 months, by the country they want."),
    ).toBeInTheDocument();
  });

  it("names the series, shows exact values on focus and lists every country as a table", async () => {
    backend(...EVERYTHING);
    renderReports();

    const wanted = within(await region("Countries Students want"));
    const legend = within(wanted.getByRole("list", { name: "Legend" }));
    expect(legend.getByText("Students")).toBeInTheDocument();
    wanted.getByRole("button", { name: "Canada: Students 40" }).focus();
    expect(await wanted.findByRole("tooltip")).toHaveTextContent("Canada");
    await userEvent.click(wanted.getByText("Show as a table"));
    const rows = within(wanted.getByRole("table")).getAllByRole("row");
    expect(rows.map((row) => row.textContent)).toEqual([
      "CountryStudents",
      "Canada40",
      "Australia35",
      "New Zealand25",
    ]);
  });

  it("says so when no visa was granted and nobody came in", async () => {
    backend(...EVERYTHING);
    renderReports();
    await screen.findByText("in the last 6 months");

    await userEvent.click(screen.getByRole("button", { name: "Last 12 months" }));

    const granted = within(await region("Visas granted by country"));
    expect(await granted.findByText("No visas granted in this time.")).toBeInTheDocument();
    const wanted = within(await region("Countries Students want"));
    expect(wanted.getByText("Nobody came in during this time.")).toBeInTheDocument();
    expect(
      wanted.getByText("Students who came in during the last 12 months, by the country they want."),
    ).toBeInTheDocument();
  });
});

describe("Where visitors came from", () => {
  it("shows a bar per Source between the last three months' dates", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Where visitors came from");

    const bars = within(await screen.findByRole("list", { name: "Where visitors came from" }));
    expect(bars.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Walk-in4",
      "Facebook3",
      "Phone call0",
    ]);
    expect(screen.getByText("7 new visitors between the dates.")).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-08-03");
    expect(screen.getByLabelText("To")).toHaveValue("2026-11-03");
    expect(screen.queryByRole("group", { name: "How far back" })).toBeNull();
  });

  it("asks again for the dates chosen", async () => {
    const chosen = "/api/reports/sources/?from=2026-01-01&to=2026-03-31";
    const fetchFn = backend(...EVERYTHING, on("GET", chosen, { total: 1, sources: [] }));
    renderReports();
    await openTab("Where visitors came from");
    await screen.findByText("7 new visitors between the dates.");

    await userEvent.clear(screen.getByLabelText("From"));
    await userEvent.type(screen.getByLabelText("From"), "2026-01-01");
    await userEvent.clear(screen.getByLabelText("To"));
    await userEvent.type(screen.getByLabelText("To"), "2026-03-31");
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(await screen.findByText("1 new visitor between the dates.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", chosen)).toHaveLength(1);
  });

  it("shows the server's reason on the date it refused", async () => {
    const refused = "/api/reports/sources/?from=2026-03-31&to=2026-01-01";
    backend(
      ...EVERYTHING,
      on("GET", refused, { to: ["Choose an end date on or after the start date."] }, 400),
    );
    renderReports();
    await openTab("Where visitors came from");
    await screen.findByText("7 new visitors between the dates.");

    await userEvent.clear(screen.getByLabelText("From"));
    await userEvent.type(screen.getByLabelText("From"), "2026-03-31");
    await userEvent.clear(screen.getByLabelText("To"));
    await userEvent.type(screen.getByLabelText("To"), "2026-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(
      await screen.findByText("Choose an end date on or after the start date."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/between the dates/)).toBeNull();
  });
});

function cells(row: HTMLElement) {
  return within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
}

describe("Staff Progress", () => {
  it("lists each counsellor's Students and the changes they made, marking those who left", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Staff Progress");

    const counsellors = within(await region("Counsellors"));
    const bikash = counsellors.getByRole("row", { name: /Bikash Thapa/ });
    expect(cells(bikash)).toEqual([
      "Students 12",
      "Moved forward 4",
      "Applications made 3",
      "Visas applied for 2",
      "Visas granted 1",
      "Lost 2",
      "Tasks done 9",
    ]);
    expect(counsellors.getByText("<b>Old</b> Counsellor")).toBeInTheDocument();
    expect(counsellors.getByText("(has left)")).toBeInTheDocument();
    expect(screen.queryByText("Completed")).toBeNull();
  });

  it("fits its panel: a long name is cut with … rather than the table scrolling", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Staff Progress");

    const table = within(await region("Counsellors")).getByRole("table");
    expect(table).toHaveAttribute("data-stacks");
    expect(table).toHaveAttribute("data-wraps");
    const name = within(table).getByRole("rowheader", { name: /Bikash Thapa/ });
    expect(name).toHaveAttribute("data-shrinks", "large");
    expect(within(name).getByText("Bikash Thapa")).toHaveAttribute("title", "Bikash Thapa");
  });

  it("links each name to that person's Progress", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Staff Progress");

    expect(await screen.findByRole("link", { name: "Bikash Thapa" })).toHaveAttribute(
      "href",
      "/staff/3",
    );
    expect(screen.getByRole("link", { name: "Sunita Shrestha" })).toHaveAttribute(
      "href",
      "/staff/7",
    );
    expect(
      screen.getByText("Click a name to see that person's Progress, day by day."),
    ).toBeInTheDocument();
  });

  it("shows Front Desk under the counsellors and leaves out an empty Teachers table", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Staff Progress");

    const desk = within(await region("Front Desk"));
    expect(cells(desk.getByRole("row", { name: /Sunita Shrestha/ }))).toEqual([
      "Visitors registered 1,234",
      "New Leads 8",
      "Payments taken 5",
    ]);
    expect(screen.queryByRole("region", { name: "Teachers" })).toBeNull();
  });

  it("shows the Teachers table when there are teachers", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", STAFF_PROGRESS, {
        ...STAFF_PROGRESS_ROWS,
        teachers: [
          { id: 9, name: "Gita Lama", is_active: true, classes_taken: 12, attendance_marked: 140 },
        ],
      }),
    );
    renderReports(WITH_CLASSES);

    await openTab("Staff Progress");

    const teachers = within(await region("Teachers"));
    expect(cells(teachers.getByRole("row", { name: /Gita Lama/ }))).toEqual([
      "Classes taken 12",
      "Attendance marked 140",
    ]);
  });

  it("says when a count only began being recorded inside the period", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Staff Progress");

    expect(await screen.findByText("Tasks done: counted from 15 Nov 2026.")).toBeInTheDocument();
  });

  it("says nothing about when counting began when it began before the period", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", STAFF_PROGRESS, { ...STAFF_PROGRESS_ROWS, counted_from: {} }),
    );
    renderReports();

    await openTab("Staff Progress");

    await region("Counsellors");
    expect(screen.queryByText(/counted from/)).toBeNull();
  });

  it("says when there is nobody to show", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", STAFF_PROGRESS, {
        counsellors: [],
        front_desk: [],
        teachers: [],
        counted_from: {},
      }),
    );
    renderReports();

    await openTab("Staff Progress");

    expect(await screen.findByText("Nobody to show for these dates.")).toBeInTheDocument();
  });

  it("shows a period over a year refused on the To date", async () => {
    const refused = "/api/reports/staff-progress/?from=2025-01-01&to=2026-11-03";
    backend(
      ...EVERYTHING,
      on("GET", refused, { to: ["Choose a period of one year or less."] }, 400),
    );
    renderReports();
    await openTab("Staff Progress");
    await region("Counsellors");

    await userEvent.clear(screen.getByLabelText("From"));
    await userEvent.type(screen.getByLabelText("From"), "2025-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(await screen.findByText("Choose a period of one year or less.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Counsellors" })).toBeNull();
  });

  it("says so when the report can't be loaded", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", STAFF_PROGRESS, { counsellors: "everyone" }),
    );
    renderReports();

    await openTab("Staff Progress");

    expect(
      await screen.findByText("We couldn't load this report. Please try again."),
    ).toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("The Classes report in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  it("shows the class bars", async () => {
    backend(...EVERYTHING);
    renderReports(WITH_CLASSES);

    await openTab("Classes");

    expect(await screen.findByRole("list", { name: "Classes" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });

  it("shows the Staff Progress tables", async () => {
    backend(...EVERYTHING);
    renderReports();

    await openTab("Staff Progress");

    expect(await region("Counsellors")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bikash Thapa" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});

describe("Classes", () => {
  it("isn't offered while the test-prep Module is off", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderReports();
    await screen.findByText("in the last 6 months");

    expect(screen.queryByRole("button", { name: "Classes" })).toBeNull();
    expect(callsTo(fetchFn, "GET", CLASSES)).toHaveLength(0);
  });

  it("shows each class's share attended with its Students and Teacher", async () => {
    backend(...EVERYTHING);
    renderReports(WITH_CLASSES);

    await openTab("Classes");

    const bars = within(await screen.findByRole("list", { name: "Classes" }));
    expect(bars.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "IELTS Morning12 Students · Gita Lama86%",
      "<i>PTE</i> Day1 Student · Gita Lama—",
    ]);
    expect(
      screen.getByText(
        "Share of class days attended between the dates. Present and Late both count; — means nobody was marked yet.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-08-03");
    expect(screen.queryByRole("group", { name: "How far back" })).toBeNull();
  });

  it("asks again for the dates chosen", async () => {
    const chosen = "/api/reports/batches/?from=2026-01-01&to=2026-03-31";
    const fetchFn = backend(...EVERYTHING, on("GET", chosen, { batches: [] }));
    renderReports(WITH_CLASSES);
    await openTab("Classes");
    await screen.findByRole("list", { name: "Classes" });

    await userEvent.clear(screen.getByLabelText("From"));
    await userEvent.type(screen.getByLabelText("From"), "2026-01-01");
    await userEvent.clear(screen.getByLabelText("To"));
    await userEvent.type(screen.getByLabelText("To"), "2026-03-31");
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(await screen.findByText("No classes ran between these dates.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", chosen)).toHaveLength(1);
  });
});

describe.each(THEME_CASES)("The Money report in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  it("shows the totals and the monthly chart", async () => {
    backend(...EVERYTHING);
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    expect(await tile("last 6 months")).toHaveTextContent("Money inNPR 9,08,000");
    expect(await tile("expenses")).toHaveTextContent("Money outNPR 3,14,000");
    expect(await tile("money in minus money out")).toHaveTextContent("Left overNPR 5,94,000");
    const chart = within(await region("Money in and money out each month"));
    expect(
      chart.getByRole("img", { name: "Money in and money out each month" }),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});

describe("Money", () => {
  it("isn't offered while the Accounts Module is off", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderReports();
    await screen.findByText("in the last 6 months");

    expect(screen.queryByRole("button", { name: "Money" })).toBeNull();
    expect(callsTo(fetchFn, "GET", MONEY_SIX)).toHaveLength(0);
  });

  it("comes after Students in the report picker", async () => {
    backend(...EVERYTHING);
    renderReports({ ...WITH_ACCOUNTS, modules: [...WITH_ACCOUNTS.modules, "batches"] });
    await screen.findByText("in the last 6 months");

    const picker = within(screen.getByRole("group", { name: "Choose a report" }));
    expect(picker.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Students",
      "Money",
      "Where visitors came from",
      "Staff Progress",
      "Classes",
    ]);
  });

  it("charts money in against money out with a legend and exact values in the table", async () => {
    backend(...EVERYTHING);
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    const chart = within(await region("Money in and money out each month"));
    const legend = within(chart.getByRole("list", { name: "Legend" }));
    expect(legend.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Money in",
      "Money out",
    ]);
    const september = within(chart.getByRole("table")).getByRole("row", { name: /Sep 2026/ });
    expect(
      within(september)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["Sep 2026", "NPR 4,70,000", "NPR 91,500"]);
  });

  it("shows where the money came from and where it went", async () => {
    backend(...EVERYTHING);
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    const came = within(await screen.findByRole("list", { name: "Where the money came from" }));
    expect(came.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Student feesNPR 6,18,000",
      "University commissionNPR 2,90,000",
    ]);
    const went = within(screen.getByRole("list", { name: "Where the money went" }));
    expect(went.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "SalariesNPR 2,20,000",
      "Office rentNPR 85,000",
      "InternetNPR 9,000",
    ]);
  });

  it("splits the money from Students by Fee Type, largest first", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", MONEY_SIX, {
        ...MONEY,
        money_in_by_fee_type: [
          { fee_type: { id: 3, name: "Visa fee" }, amount: 400000 },
          { fee_type: { id: 4, name: "<b>IELTS class</b>" }, amount: 218000 },
        ],
      }),
    );
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    const came = within(await screen.findByRole("list", { name: "Where the money came from" }));
    expect(came.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Visa feeNPR 4,00,000",
      "<b>IELTS class</b>NPR 2,18,000",
      "University commissionNPR 2,90,000",
    ]);
  });

  it("says how much it is short by, in red, when more went out than came in", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", MONEY_SIX, {
        months: [moneyMonth("2026-11", 1000, 0, 5000)],
        money_out_by_category: [{ category: "other", amount: 5000 }],
        money_in_by_fee_type: [],
      }),
    );
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    expect(await tile("money in minus money out")).toHaveTextContent("Short byNPR 4,000");
    expect(screen.getByText("NPR 4,000")).toHaveClass("text-bad");
  });

  it("says when nothing went out", async () => {
    backend(
      on("GET", SIX_MONTHS, { months: MONTHS }),
      on("GET", MONEY_SIX, {
        months: [moneyMonth("2026-11")],
        money_out_by_category: [],
        money_in_by_fee_type: [],
      }),
    );
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    expect(await screen.findByText("No money went out in these months.")).toBeInTheDocument();
  });

  it("switches to the last 12 months", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderReports(WITH_ACCOUNTS);
    await openTab("Money");
    await screen.findByText("last 6 months");

    await userEvent.click(screen.getByRole("button", { name: "Last 12 months" }));

    expect(await tile("last 12 months")).toHaveTextContent("Money inNPR 9,09,000");
    expect(callsTo(fetchFn, "GET", MONEY_TWELVE)).toHaveLength(1);
  });

  it("says so when the report can't be loaded", async () => {
    backend(on("GET", SIX_MONTHS, { months: MONTHS }));
    renderReports(WITH_ACCOUNTS);

    await openTab("Money");

    expect(
      await screen.findByText("We couldn't load this report. Please try again."),
    ).toBeInTheDocument();
  });
});
