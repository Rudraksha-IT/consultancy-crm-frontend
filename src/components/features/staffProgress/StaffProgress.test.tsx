import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { consultancySummary } from "@/test/consultancy";
import { testHost } from "@/test/hosts";
import { DEFAULT_THEME } from "@/lib/theme";

import { EmployeeProgressPage } from "./EmployeeProgressPage";
import { MyProgressPage } from "./MyProgressPage";

function context(
  overrides: Partial<StaffContext["staff"]> = {},
  extra: Partial<StaffContext> = {},
) {
  return {
    staff: { id: 1, name: "Asha Admin", email: "asha@acme.test", role: "admin", ...overrides },
    consultancy: consultancySummary(),
    modules: ["staff"],
    dateDisplay: "AD",
    colourMode: "light",
    supportAccess: null,
    theme: DEFAULT_THEME,
    ...extra,
  } satisfies StaffContext;
}

const ADMIN = context();

const BIKASH = {
  id: 3,
  name: "Bikash Thapa",
  job_title: "Senior counsellor",
  mobile: "9841000001",
  role: "counsellor",
  status: "active",
};

function answer(overrides: Record<string, unknown> = {}) {
  return {
    staff: BIKASH,
    from: "2026-11-01",
    to: "2026-11-15",
    cards: [
      { count: "moved_forward", value: 4, counted_from: null, amount: null },
      { count: "applications_made", value: 3, counted_from: null, amount: null },
      { count: "tasks_done", value: 2, counted_from: "2026-11-15", amount: null },
      { count: "payments_taken", value: 2, counted_from: null, amount: 20500 },
    ],
    days: [
      {
        day: "2026-11-04",
        entries: [
          {
            kind: "application_made",
            at: "2026-11-04T09:15:00+00:00",
            before: "",
            after: "Deakin University",
            detail: "Master of IT",
            student: { id: 7, name: "Sita Gurung" },
          },
          {
            kind: "stage_changed",
            at: "2026-11-04T04:15:00+00:00",
            before: "counselling",
            after: "applying",
            detail: "",
            student: { id: 7, name: "Sita Gurung" },
          },
        ],
      },
      {
        day: "2026-11-02",
        entries: [
          {
            kind: "attendance_marked",
            at: "2026-11-02T04:15:00+00:00",
            before: "",
            after: "<b>PTE Day</b>",
            detail: "1",
            student: null,
          },
        ],
      },
    ],
    more: false,
    ...overrides,
  };
}

function stubFetch(respond: (path: string) => Response) {
  const fetchFn = vi.fn((path: string) => Promise.resolve(respond(path)));
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function paths(fetchFn: ReturnType<typeof stubFetch>): unknown[] {
  return fetchFn.mock.calls.map((call) => call[0]);
}

function renderAs(ui: React.ReactNode, staff: StaffContext = ADMIN) {
  return render(<StaffContextContext value={staff}>{ui}</StaffContextContext>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  // A Sunday.
  vi.setSystemTime(new Date("2026-11-15T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("An employee's Progress tab", () => {
  it("shows who they are, this month's cards and what they did day by day", async () => {
    const fetchFn = stubFetch(() => jsonResponse(answer()));

    renderAs(<EmployeeProgressPage idText="3" />);

    expect(await screen.findByRole("heading", { level: 1, name: "Bikash Thapa" })).toBeVisible();
    expect(paths(fetchFn)).toEqual(["/api/staff/3/progress/?from=2026-11-01&to=2026-11-15"]);
    expect(screen.getByRole("link", { name: "All employees" })).toHaveAttribute("href", "/staff");
    expect(screen.getByText("Senior counsellor")).toBeVisible();
    expect(screen.getByText("Counsellor")).toBeVisible();
    expect(screen.getByRole("tab", { name: "Progress" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText(
        "1 Nov 2026 to 15 Nov 2026. Only changes are counted, never what someone looked at.",
      ),
    ).toBeVisible();
    expect(tile("Students moved forward")).toHaveTextContent("4");
    expect(tile("Tasks done")).toHaveTextContent("Counted from 15 Nov 2026");
    expect(tile("Payments taken")).toHaveTextContent("NPR 20,500");
    const list = screen.getByRole("region", { name: "What they did" });
    expect(within(list).getByRole("heading", { name: /Wed, 4 Nov 2026/ })).toHaveTextContent(
      "2 changes",
    );
    expect(
      within(list).getByText("Application made: Deakin University, Master of IT"),
    ).toBeVisible();
    expect(within(list).getByText("Stage: Counselling → Applying")).toBeVisible();
    expect(within(list).getAllByRole("link", { name: "Sita Gurung" })[0]).toHaveAttribute(
      "href",
      "/students/7",
    );
    expect(within(list).getByText("Marked attendance: <b>PTE Day</b> (1 Student)")).toBeVisible();
    expect(within(list).getByRole("heading", { name: /Mon, 2 Nov 2026/ })).toHaveTextContent(
      "1 change",
    );
  });

  it.each([
    ["This week", "2026-11-09", "2026-11-15"],
    ["Last month", "2026-10-01", "2026-10-31"],
  ])("loads %s when it is chosen", async (label, from, to) => {
    const fetchFn = stubFetch(() => jsonResponse(answer()));
    renderAs(<EmployeeProgressPage idText="3" />);
    await screen.findByRole("heading", { level: 1, name: "Bikash Thapa" });

    await userEvent.click(screen.getByRole("button", { name: label }));

    await screen.findByRole("heading", { level: 1, name: "Bikash Thapa" });
    expect(paths(fetchFn).at(-1)).toBe(`/api/staff/3/progress/?from=${from}&to=${to}`);
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });

  it("loads the dates picked, and shows the server's refusal on the field", async () => {
    const fetchFn = stubFetch((path) =>
      path.includes("from=2025-01-01")
        ? jsonResponse({ to: ["Choose a period of one year or less."] }, 400)
        : jsonResponse(answer()),
    );
    renderAs(<EmployeeProgressPage idText="3" />);
    await screen.findByRole("heading", { level: 1, name: "Bikash Thapa" });

    await userEvent.click(screen.getByRole("button", { name: "Pick dates" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-30" } });
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    await screen.findByText(/Only changes are counted/);
    expect(paths(fetchFn).at(-1)).toBe("/api/staff/3/progress/?from=2026-09-01&to=2026-09-30");

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2025-01-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Show" }));

    expect(await screen.findByText("Choose a period of one year or less.")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Bikash Thapa" })).toBeVisible();
  });

  it("says when nothing was recorded, and when only the latest changes are shown", async () => {
    stubFetch(() => jsonResponse(answer({ days: [], more: true })));

    renderAs(<EmployeeProgressPage idText="3" />);

    expect(await screen.findByText("Nothing recorded in this period.")).toBeVisible();
    expect(
      screen.getByText("Showing the latest 500 changes. Pick a shorter period to see the rest."),
    ).toBeVisible();
  });

  it("says when the employee doesn't exist", async () => {
    stubFetch(() => jsonResponse({ detail: "Not found." }, 404));

    renderAs(<EmployeeProgressPage idText="99" />);

    expect(await screen.findByText("We couldn't find this employee.")).toBeVisible();
    expect(screen.getByRole("link", { name: "All employees" })).toHaveAttribute("href", "/staff");
  });

  it("finds nobody for an address that isn't an id, without asking the server", () => {
    const fetchFn = stubFetch(() => jsonResponse(answer()));

    renderAs(<EmployeeProgressPage idText="abc" />);

    expect(screen.getByText("We couldn't find this employee.")).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("isn't available to someone who isn't an Admin", () => {
    const fetchFn = stubFetch(() => jsonResponse(answer()));

    renderAs(<EmployeeProgressPage idText="3" />, context({ id: 3, role: "counsellor" }));

    expect(screen.getByText("This page isn't available to you.")).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses an answer that doesn't match what we expect", async () => {
    stubFetch(() => jsonResponse(answer({ cards: [{ count: "page_views", value: 1 }] })));

    renderAs(<EmployeeProgressPage idText="3" />);

    expect(await screen.findByText("We couldn't load this progress. Try again.")).toBeVisible();
  });
});

describe("An employee's Work from home tab", () => {
  const WITH_CLOCK = context({}, { modules: ["staff", "clock_in"] });
  const PERSON = "/api/clock/staff/3/work-from-home/";

  function renderWithToasts(ui: React.ReactNode, staff: StaffContext = WITH_CLOCK) {
    return renderAs(<ToastProvider>{ui}</ToastProvider>, staff);
  }

  function responder(path: string): Response {
    if (path === PERSON) {
      return jsonResponse({
        staff: { id: 3, name: "Bikash Thapa", job_title: "", has_left: false },
        needs_dates: true,
        results: [],
      });
    }
    return jsonResponse(answer());
  }

  it("is next to Progress while Clock-in is on, and opens from the address", async () => {
    const fetchFn = stubFetch(responder);

    renderWithToasts(<EmployeeProgressPage idText="3" initialTab="wfh" />);

    const tab = await screen.findByRole("tab", { name: "Work from home" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("No work from home dates yet.")).toBeVisible();
    expect(paths(fetchFn)).toContain(PERSON);
  });

  it("switches between the tabs", async () => {
    stubFetch(responder);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderWithToasts(<EmployeeProgressPage idText="3" />);

    await user.click(await screen.findByRole("tab", { name: "Work from home" }));

    expect(await screen.findByRole("button", { name: "Set dates" })).toBeVisible();
  });

  it("isn't there with Clock-in off", async () => {
    stubFetch(responder);

    renderWithToasts(<EmployeeProgressPage idText="3" initialTab="wfh" />, ADMIN);

    expect(await screen.findByRole("tab", { name: "Progress" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("tab", { name: "Work from home" })).not.toBeInTheDocument();
  });
});

describe("My progress", () => {
  it("shows my own progress from My account", async () => {
    const me = context({ id: 3, role: "counsellor", name: "Bikash Thapa" });
    const fetchFn = stubFetch(() => jsonResponse(answer()));

    renderAs(<MyProgressPage />, me);

    expect(await screen.findByRole("heading", { level: 1, name: "My progress" })).toBeVisible();
    expect(await screen.findByRole("region", { name: "What you did" })).toBeVisible();
    expect(paths(fetchFn)).toEqual(["/api/staff/3/progress/?from=2026-11-01&to=2026-11-15"]);
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/settings");
    expect(tile("Students moved forward")).toHaveTextContent("4");
  });

  it("names no Student as a link for a Teacher, who can't open Students", async () => {
    const teacher = context({ id: 3, role: "teacher", name: "Gita Lama" });
    stubFetch(() => jsonResponse(answer()));

    renderAs(<MyProgressPage />, teacher);

    const list = await screen.findByRole("region", { name: "What you did" });
    expect(within(list).queryByRole("link")).toBeNull();
    expect(within(list).getAllByText("Sita Gurung")[0]).toBeVisible();
  });

  it("says when a Teacher has no cards because classes are off", async () => {
    const teacher = context({ id: 3, role: "teacher", name: "Gita Lama" });
    stubFetch(() => jsonResponse(answer({ cards: [], days: [] })));

    renderAs(<MyProgressPage />, teacher);

    expect(
      await screen.findByText("Nothing is counted for this Role while classes are switched off."),
    ).toBeVisible();
  });

  it("isn't there for a Platform Admin, who has no account in the office", () => {
    const fetchFn = stubFetch(() => jsonResponse(answer()));
    const visitor = context(
      {},
      { supportAccess: { platformAdminName: "Ops", platformHost: testHost("platform") } },
    );

    renderAs(<MyProgressPage />, visitor);

    expect(screen.getByText("This page isn't available to you.")).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

function tile(label: string): HTMLElement {
  const found = screen.getByText(label).closest("div");
  if (found === null) throw new Error(`No tile ${label}`);
  return found;
}
