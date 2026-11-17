import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { HomePage } from "./HomePage";
import { consultancySummary } from "@/test/consultancy";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "batches", "accounts", "reports"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};
const COUNSELLOR: StaffContext = {
  ...ADMIN,
  staff: { id: 3, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
};
const TEACHER: StaffContext = {
  ...ADMIN,
  staff: { id: 9, name: "Gita Lama", email: "gita@acme.test", role: "teacher" },
};
const DESK: StaffContext = {
  ...ADMIN,
  staff: { id: 4, name: "Asha Rai", email: "asha@acme.test", role: "front_desk" },
};

const PROGRESS_ADMIN = "/api/home/progress/?counsellor=any&limit=6";
const PROGRESS_MINE = "/api/home/progress/?counsellor=me&limit=10";
const PIPELINE = "/api/home/pipeline/";
const UNASSIGNED = "/api/students/?stage=lead&counsellor=none";
// Only Tasks due by the day after tomorrow, in the server's order (overdue, priority, due date).
const TASKS = "/api/tasks/?view=mine&page=1&due_by=2026-11-05";
const CLASSES = "/api/batches/?page=1";
const ENROLLED = "/api/batches/students/?page=1";
const WAITING = "/api/home/waiting/";
const NOTHING_WAITING = {
  documents_waiting: 0,
  transfer_requests_waiting: 0,
  visa_appointments: { count: 0, results: [] },
};
const SOME_WAITING = {
  documents_waiting: 3,
  transfer_requests_waiting: 2,
  visa_appointments: {
    count: 2,
    results: [
      {
        visa_id: 4,
        student: { id: 7, name: "Sita Gurung" },
        kind: "biometrics",
        at: "2026-11-04T14:00",
      },
      {
        visa_id: 5,
        student: { id: 8, name: "<b>Ram</b>" },
        kind: "interview",
        at: "2026-11-06T09:30",
      },
    ],
  },
};

function progressRow(id: number, name: string, overrides: object = {}) {
  return {
    student: {
      id,
      name,
      stage: "applying",
      country: "australia",
      assigned_counsellor: { id: 3, name: "Bikash Thapa" },
    },
    percent: 45,
    next_step: "Waiting for an offer, Deakin University",
    is_done: false,
    documents: { done: 5, total: 9, rejected: 1, waiting: 0, missing: 3 },
    ...overrides,
  };
}

const SITA = progressRow(7, "Sita Gurung");
const RAM = progressRow(8, "Ram Karki", {
  student: { ...SITA.student, id: 8, name: "Ram Karki", stage: "lead", assigned_counsellor: null },
  percent: 8,
  next_step: "Have the first counselling session",
  documents: { done: 0, total: 9, rejected: 0, waiting: 0, missing: 9 },
});

const COUNTS = {
  lead: 4,
  counselling: 3,
  applying: 2,
  offer: 1,
  visa: 0,
  lost: 2,
};

const NEW_VISITOR = {
  id: 12,
  name: "Hari Bhandari",
  phone: "9841000012",
  email: "",
  country: "canada",
  source: "facebook",
  stage: "lead",
  assigned_counsellor: null,
};

function task(id: number, title: string, dueOn: string, timing: string, priority = "normal") {
  return {
    id,
    title,
    due_on: dueOn,
    priority,
    only_me: false,
    timing,
    is_done: false,
    done_at: null,
    assignee: { id: 9, name: "Gita Lama" },
    created_by: { id: 1, name: "Maya Shrestha" },
    student: null,
    can_mark_done: true,
  };
}

const TASK_PAGE = {
  count: 4,
  page: 1,
  page_size: 25,
  results: [
    task(1, "Call Sita about her IELTS score", "2026-11-01", "overdue"),
    task(2, "Check the mock test", "2026-11-03", "today"),
    task(3, "Book the hall", "2026-11-05", "upcoming"),
    task(4, "Plan next month", "2026-11-20", "upcoming"),
  ],
};

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

const EVERYTHING = [
  on("GET", PROGRESS_ADMIN, { count: 9, results: [SITA, RAM] }),
  on("GET", PROGRESS_MINE, { count: 2, results: [SITA, RAM] }),
  on("GET", PIPELINE, { counts: COUNTS }),
  on("GET", UNASSIGNED, pageOf([NEW_VISITOR])),
  on("GET", TASKS, TASK_PAGE),
  on("GET", CLASSES, pageOf([])),
  on("GET", ENROLLED, pageOf([])),
  on("GET", "/api/staff/counsellors/", [{ id: 3, name: "Bikash Thapa" }]),
  on("GET", "/api/visits/today/", { count: 0, results: [] }),
  on("GET", WAITING, NOTHING_WAITING),
];

const withWaiting = (answer: unknown) => [on("GET", WAITING, answer), ...EVERYTHING];

function renderHome(context: StaffContext) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function region(name: string) {
  return screen.findByRole("region", { name });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  resetTheme();
});

describe("Every Home", () => {
  it("greets by first name with today's date and the BS date beside it", () => {
    backend(...EVERYTHING);
    renderHome(COUNSELLOR);

    expect(screen.getByRole("heading", { level: 1, name: "Namaste, Bikash" })).toBeInTheDocument();
    expect(screen.getByText(/^Tuesday, 3 Nov 2026 \(.+ BS\)$/)).toBeInTheDocument();
  });

  it("writes today in BS alone when the office shows BS", () => {
    backend(...EVERYTHING);
    renderHome({ ...COUNSELLOR, dateDisplay: "BS" });

    const line = screen.getByText(/^Tuesday, /);
    expect(line.textContent).not.toContain("Nov");
    expect(line.textContent).not.toContain("(");
  });
});

describe.each(THEME_CASES)("The Homes in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  it("gives an Admin the pipeline, everyone's progress, new visitors and tasks", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);

    expect(await region("Pipeline")).toBeInTheDocument();
    expect(await region("Students' progress")).toBeInTheDocument();
    expect(await region("New visitors without a counsellor")).toBeInTheDocument();
    expect(await region("Your tasks due soon")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });

  it("gives a Counsellor their Students' progress, classes and tasks", async () => {
    backend(...EVERYTHING);
    renderHome(COUNSELLOR);

    expect(await region("Your Students' progress")).toBeInTheDocument();
    expect(await region("Classes")).toBeInTheDocument();
    expect(await region("Your tasks due soon")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pipeline" })).toBeNull();
  });

  it("gives Front Desk the visitor desk and today's visitors", async () => {
    backend(...EVERYTHING);
    renderHome(DESK);

    expect(await screen.findByRole("button", { name: "New visitor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByText("No visitors yet today.")).toBeInTheDocument();
  });

  it("gives a Teacher their classes today and tasks by when", async () => {
    backend(...EVERYTHING);
    renderHome(TEACHER);

    expect(await region("Your classes today")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: "Overdue 1" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /progress/ })).toBeNull();
  });
});

describe("The Admin's Home", () => {
  it("links the pipeline to the charts when the Reports Module is on", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);

    expect(
      within(await region("Pipeline")).getByRole("link", { name: "See charts" }),
    ).toHaveAttribute("href", "/reports");
  });

  it("has no charts link without the Reports Module", async () => {
    backend(...EVERYTHING);
    renderHome({ ...ADMIN, modules: ["students", "batches", "accounts"] });

    expect(within(await region("Pipeline")).queryByRole("link", { name: "See charts" })).toBeNull();
  });

  it("shows a card per Stage that opens the Student list at that Stage, and the Lost", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const pipeline = within(await region("Pipeline"));

    expect(await pipeline.findByRole("link", { name: "Lead: 4 Students" })).toHaveAttribute(
      "href",
      "/students?stage=lead",
    );
    expect(pipeline.getByRole("link", { name: "Applying: 2 Students" })).toHaveTextContent(
      "20% of Students",
    );
    expect(pipeline.getByText("10 Students in progress")).toBeInTheDocument();
    expect(pipeline.getByRole("link", { name: "2 Lost" })).toHaveAttribute(
      "href",
      "/students?stage=lost",
    );
  });

  it("says Done for a Student whose Visa is granted", async () => {
    const granted = progressRow(9, "Asha Rai", {
      student: { ...SITA.student, id: 9, name: "Asha Rai", stage: "visa" },
      percent: 100,
      next_step: "Visa granted. Help with flights and pre-departure.",
      is_done: true,
    });
    backend(on("GET", PROGRESS_ADMIN, { count: 1, results: [granted] }), ...EVERYTHING);
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));

    expect(
      await progress.findByText("Done: Visa granted. Help with flights and pre-departure."),
    ).toBeInTheDocument();
    expect(progress.queryByText(/^Next:/)).not.toBeInTheDocument();
  });

  it("shows the furthest along with their counsellor, and how many more there are", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));

    expect(await progress.findByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      "/students/7",
    );
    expect(progress.getByText("Australia, Bikash Thapa")).toBeInTheDocument();
    expect(progress.getByText("Australia, no counsellor yet")).toBeInTheDocument();
    expect(progress.getAllByRole("list", { name: "Stage: Applying" })).toHaveLength(1);
    expect(progress.getByText("Next: Waiting for an offer, Deakin University")).toBeInTheDocument();
    expect(progress.getByText("Showing the 2 furthest along out of 9.")).toBeInTheDocument();
    expect(progress.getByRole("link", { name: "See all Students" })).toHaveAttribute(
      "href",
      "/students",
    );
  });

  it("opens a Student's checklist from their documents button", async () => {
    backend(
      ...EVERYTHING,
      on("GET", "/api/students/7/documents/", {
        done: 0,
        total: 0,
        can_change: true,
        items: [],
      }),
    );
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));
    const button = await progress.findByRole("button", {
      name: "Open the checklist for Sita Gurung: 5 of 9 documents, 1 rejected",
    });
    expect(button).toHaveTextContent("5/9 documents");

    await userEvent.click(button);

    const dialog = await screen.findByRole("dialog", { name: "Documents for Sita Gurung" });
    await userEvent.keyboard("{Escape}");
    expect(dialog).not.toBeInTheDocument();
  });

  it("stacks a progress row on phones so the documents button never squeezes the name (issue 91)", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));
    const button = await progress.findByRole("button", {
      name: /Open the checklist for Sita Gurung/,
    });

    const row = button.closest("li");
    expect(row).toHaveClass("grid-cols-1", "phone:grid-cols-[minmax(0,1fr)_auto]");
    expect(button.parentElement).toHaveClass("justify-self-start", "phone:justify-self-end");
  });

  it("lists new visitors without a counsellor, each with Assign", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const visitors = within(await region("New visitors without a counsellor"));

    expect(await visitors.findByRole("link", { name: "Hari Bhandari" })).toHaveAttribute(
      "href",
      "/students/12",
    );
    expect(visitors.getByText("Wants Canada")).toBeInTheDocument();

    await userEvent.click(
      visitors.getByRole("button", { name: "Assign a counsellor to Hari Bhandari" }),
    );

    expect(await screen.findByRole("dialog", { name: /Hari Bhandari/ })).toBeInTheDocument();
  });

  it("says when everyone has a counsellor", async () => {
    backend(on("GET", UNASSIGNED, pageOf([])), ...EVERYTHING);
    renderHome(ADMIN);

    expect(await screen.findByText("Everyone has a counsellor.")).toBeInTheDocument();
  });

  it("lists tasks due in the next two days as one list, leaving later ones out", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const tasks = within(await region("Your tasks due soon"));

    expect(await tasks.findByText("Call Sita about her IELTS score")).toBeInTheDocument();
    expect(tasks.getByText("Book the hall")).toBeInTheDocument();
    expect(tasks.queryByText("Plan next month")).toBeNull();
    expect(tasks.queryByRole("heading", { level: 3 })).toBeNull();
    expect(tasks.getByRole("link", { name: "See all tasks" })).toHaveAttribute("href", "/tasks");
  });

  it("shows each task's priority, in the order the server gives", async () => {
    backend(
      on(
        "GET",
        TASKS,
        pageOf([
          task(1, "Overdue call", "2026-11-01", "overdue", "low"),
          task(5, "Urgent offer", "2026-11-05", "upcoming", "high"),
          task(2, "Mock test", "2026-11-03", "today"),
        ]),
      ),
      ...EVERYTHING,
    );
    renderHome(ADMIN);
    const tasks = within(await region("Your tasks due soon"));

    const rows = await tasks.findAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Overdue call.*Low priority/),
      expect.stringMatching(/^Urgent offer.*High priority/),
      expect.stringMatching(/^Mock test/),
    ]);
  });

  it("has no money sections without the Accounts Module, and no charts", async () => {
    backend(...EVERYTHING);
    renderHome({ ...ADMIN, modules: ["students", "batches", "reports"] });
    await region("Pipeline");

    expect(screen.queryByText(/at a glance|Profit this month|still owes/)).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show as a table" })).toBeNull();
  });

  it("says so when the progress can't load", async () => {
    backend(on("GET", PROGRESS_ADMIN, {}, 500), ...EVERYTHING);
    renderHome(ADMIN);

    expect(
      await screen.findByText("We couldn't load the Students' progress. Please try again."),
    ).toBeInTheDocument();
  });

  it("refuses an answer that isn't the expected shape", async () => {
    backend(on("GET", PIPELINE, { counts: { lead: "<script>" } }), ...EVERYTHING);
    renderHome(ADMIN);

    expect(
      await screen.findByText("We couldn't load the pipeline. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("The Counsellor's Home", () => {
  it("asks only for their own Students and lists them without a counsellor", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderHome(COUNSELLOR);
    const progress = within(await region("Your Students' progress"));

    expect(await progress.findAllByText("Australia")).toHaveLength(2);
    expect(callsTo(fetchFn, "GET", PROGRESS_MINE)).toHaveLength(1);
    expect(callsTo(fetchFn, "GET", PIPELINE)).toHaveLength(0);
    expect(progress.queryByText(/furthest along/)).toBeNull();
  });

  it("says when they have no Students yet", async () => {
    backend(on("GET", PROGRESS_MINE, { count: 0, results: [] }), ...EVERYTHING);
    renderHome(COUNSELLOR);

    expect(await screen.findByText("No Students yet.")).toBeInTheDocument();
  });

  it("has no Classes while test-prep classes are off", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderHome({ ...COUNSELLOR, modules: ["students"] });
    await region("Your Students' progress");

    expect(screen.queryByRole("region", { name: "Classes" })).toBeNull();
    expect(callsTo(fetchFn, "GET", CLASSES)).toHaveLength(0);
  });
});

describe("The Teacher's Home", () => {
  it("groups tasks into Overdue, Today and Next two days", async () => {
    backend(...EVERYTHING);
    renderHome(TEACHER);

    const tasks = within(await region("Your tasks due soon"));
    expect((await tasks.findAllByRole("heading", { level: 3 })).map((h) => h.textContent)).toEqual([
      "Overdue 1",
      "Today 1",
      "Next two days 1",
    ]);
    expect(tasks.queryByText("Plan next month")).toBeNull();
  });

  it("says when nothing is due soon", async () => {
    backend(on("GET", TASKS, pageOf([])), ...EVERYTHING);
    renderHome(TEACHER);

    expect(await screen.findByText("Nothing due in the next two days.")).toBeInTheDocument();
  });

  it("never asks for Students' progress or the pipeline", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderHome(TEACHER);
    await region("Your tasks due soon");

    expect(callsTo(fetchFn, "GET", PROGRESS_ADMIN)).toHaveLength(0);
    expect(callsTo(fetchFn, "GET", PROGRESS_MINE)).toHaveLength(0);
    expect(callsTo(fetchFn, "GET", PIPELINE)).toHaveLength(0);
  });
});

describe("The Front Desk's Home", () => {
  it("is the visitor desk and today's visitors, with no Students' progress", async () => {
    const fetchFn = backend(...EVERYTHING);
    renderHome(DESK);

    expect(await screen.findByRole("group", { name: "Type of visit" })).toBeInTheDocument();
    expect(await region("Today's visitors")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", PROGRESS_ADMIN)).toHaveLength(0);
    expect(callsTo(fetchFn, "GET", PIPELINE)).toHaveLength(0);
  });
});

describe("What's waiting on you", () => {
  it("shows a Counsellor each item with its count, opening the matching list", async () => {
    backend(...withWaiting(SOME_WAITING));
    renderHome(COUNSELLOR);
    const waiting = within(await region("Waiting on you"));

    expect(
      await waiting.findByRole("link", { name: /Documents waiting to be checked\s*3/ }),
    ).toHaveAttribute("href", "/documents?waiting=true");
    expect(
      waiting.getByRole("link", { name: /Transfer requests waiting for you\s*2/ }),
    ).toHaveAttribute("href", "/transfer-requests");
    const interviews = waiting.getByRole("link", {
      name: /Visa appointments in the next 7 days/,
    });
    expect(interviews).toHaveAttribute("href", "/visas?appointment=next_7");
    expect(
      within(interviews).getByText("Sita Gurung, Biometrics 4 Nov 2026 at 2:00 PM"),
    ).toBeVisible();
    expect(
      within(interviews).getByText("<b>Ram</b>, Interview 6 Nov 2026 at 9:30 AM"),
    ).toBeVisible();
  });

  it("says how many more appointments there are than it lists", async () => {
    backend(
      ...withWaiting({
        ...NOTHING_WAITING,
        visa_appointments: { ...SOME_WAITING.visa_appointments, count: 7 },
      }),
    );
    renderHome(COUNSELLOR);

    expect(await screen.findByText("and 5 more")).toBeVisible();
  });

  it("hides items with nothing waiting", async () => {
    backend(...withWaiting({ ...NOTHING_WAITING, transfer_requests_waiting: 1 }));
    renderHome(ADMIN);
    const waiting = within(await region("Waiting on you"));

    expect(await waiting.findByRole("link", { name: /Transfer requests/ })).toBeVisible();
    expect(waiting.queryByRole("link", { name: /Documents/ })).toBeNull();
    expect(waiting.queryByRole("link", { name: /Visa appointments/ })).toBeNull();
  });

  it("tells an Admin how many Documents are in the Bin, opening the Bin tab", async () => {
    backend(...withWaiting({ ...NOTHING_WAITING, documents_in_bin: 2 }));
    renderHome(ADMIN);
    const waiting = within(await region("Waiting on you"));

    const link = await waiting.findByRole("link", { name: /Documents in the Bin/ });
    expect(link).toHaveAttribute("href", "/documents?tab=bin");
    expect(link).toHaveTextContent("2");
  });

  it("tells an Admin how many Work from home requests wait, opening the first", async () => {
    backend(
      ...withWaiting({
        ...NOTHING_WAITING,
        work_from_home_requests: { count: 2, first_staff_id: 6 },
      }),
    );
    renderHome(ADMIN);
    const waiting = within(await region("Waiting on you"));

    const link = await waiting.findByRole("link", { name: /Work from home requests/ });
    expect(link).toHaveAttribute("href", "/staff/6?tab=wfh");
    expect(link).toHaveTextContent("2");
  });

  it("shows no row at all when nothing waits", async () => {
    backend(...EVERYTHING);
    renderHome(COUNSELLOR);

    await region("Your Students' progress");
    expect(screen.queryByRole("region", { name: "Waiting on you" })).toBeNull();
  });

  it("shows no row when it can't load, and the rest of the Home still works", async () => {
    backend(...withWaiting({ documents_waiting: "x" }));
    renderHome(ADMIN);

    expect(await region("Pipeline")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Waiting on you" })).toBeNull();
  });

  it.each([
    ["Front Desk", DESK],
    ["a Teacher", TEACHER],
  ])("isn't asked for on the Home of %s", async (_name, context) => {
    const fetchFn = backend(...withWaiting(SOME_WAITING));
    renderHome(context);

    await screen.findByRole("heading", { level: 1 });
    expect(callsTo(fetchFn, "GET", WAITING)).toHaveLength(0);
    expect(screen.queryByRole("region", { name: "Waiting on you" })).toBeNull();
  });
});
