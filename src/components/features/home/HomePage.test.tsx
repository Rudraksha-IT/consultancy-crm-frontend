import type { RecordId } from "@/lib/recordId";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { HomePage } from "./HomePage";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "batches", "accounts", "reports"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};
const COUNSELLOR: StaffContext = {
  ...ADMIN,
  staff: { id: uid(3), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
};
const TEACHER: StaffContext = {
  ...ADMIN,
  staff: { id: uid(9), name: "Gita Lama", email: "gita@acme.test", role: "teacher" },
};
const DESK: StaffContext = {
  ...ADMIN,
  staff: { id: uid(4), name: "Asha Rai", email: "asha@acme.test", role: "front_desk" },
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
        visa_id: uid(4),
        student: { id: uid(7), name: "Sita Gurung" },
        kind: "biometrics",
        at: "2026-11-04T14:00",
      },
      {
        visa_id: uid(5),
        student: { id: uid(8), name: "<b>Ram</b>" },
        kind: "interview",
        at: "2026-11-06T09:30",
      },
    ],
  },
};

function progressRow(id: RecordId, name: string, overrides: object = {}) {
  return {
    student: {
      id,
      name,
      stage: "applying",
      country: "australia",
      assigned_counsellor: { id: uid(3), name: "Bikash Thapa" },
    },
    percent: 45,
    next_step: "Waiting for an offer, Deakin University",
    is_done: false,
    documents: { done: 5, total: 9, rejected: 1, waiting: 0, missing: 3 },
    ...overrides,
  };
}

const SITA = progressRow(uid(7), "Sita Gurung");
const RAM = progressRow(uid(8), "Ram Karki", {
  student: {
    ...SITA.student,
    id: uid(8),
    name: "Ram Karki",
    stage: "lead",
    priority: "normal",
    assigned_counsellor: null,
  },
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
  id: uid(12),
  name: "Hari Bhandari",
  phone: "9841000012",
  email: "",
  country: "canada",
  source: "facebook",
  stage: "lead",
  priority: "normal",
  assigned_counsellor: null,
};

function task(id: RecordId, title: string, dueOn: string, timing: string, priority = "normal") {
  return {
    id,
    title,
    due_on: dueOn,
    priority,
    only_me: false,
    timing,
    is_done: false,
    done_at: null,
    assignee: { id: uid(9), name: "Gita Lama" },
    created_by: { id: uid(1), name: "Maya Shrestha" },
    student: null,
    can_mark_done: true,
  };
}

const TASK_PAGE = {
  count: 4,
  page: 1,
  page_size: 25,
  results: [
    task(uid(1), "Call Sita about her IELTS score", "2026-11-01", "overdue"),
    task(uid(2), "Check the mock test", "2026-11-03", "today"),
    task(uid(3), "Book the hall", "2026-11-05", "upcoming"),
    task(uid(4), "Plan next month", "2026-11-20", "upcoming"),
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
  on("GET", "/api/staff/counsellors/", [{ id: uid(3), name: "Bikash Thapa" }]),
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

describe.each(THEME_CASES)("The Homes in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
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
    const granted = progressRow(uid(9), "Asha Rai", {
      student: { ...SITA.student, id: uid(9), name: "Asha Rai", stage: "visa" },
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
      `/students/${uid(7)}`,
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
      on("GET", `/api/students/${uid(7)}/documents/`, {
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
      `/students/${uid(12)}`,
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
          task(uid(1), "Overdue call", "2026-11-01", "overdue", "low"),
          task(uid(5), "Urgent offer", "2026-11-05", "upcoming", "high"),
          task(uid(2), "Mock test", "2026-11-03", "today"),
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

  it("says when no Student is on their way, finished ones left out (list tidy-ups 14)", async () => {
    backend(on("GET", PROGRESS_MINE, { count: 0, results: [] }), ...EVERYTHING);
    renderHome(COUNSELLOR);

    expect(await screen.findByText("No Students on their way right now.")).toBeInTheDocument();
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
        work_from_home_requests: { count: 2, first_staff_id: uid(6) },
      }),
    );
    renderHome(ADMIN);
    const waiting = within(await region("Waiting on you"));

    const link = await waiting.findByRole("link", { name: /Work from home requests/ });
    expect(link).toHaveAttribute("href", `/staff/${uid(6)}?tab=wfh`);
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

// A tidier Home with High priority Students (ticket 12; spec 90-94, 98-104).
const HIGH_ALL = "/api/students/?priority=high&hide_lost=true";
const HIGH_MINE = "/api/students/?priority=high&hide_lost=true&counsellor=me";
const HOME_OWING = "/api/accounts/student-fees/?page=1&leave_out=lost";

function highStudent(n: number, name: string, stage = "counselling") {
  return { ...NEW_VISITOR, id: uid(40 + n), name, stage, priority: "high" };
}

const FIVE_HIGH = {
  count: 5,
  page: 1,
  page_size: 25,
  results: [
    highStudent(1, "Asha Rai"),
    highStudent(2, "Bina KC", "applying"),
    highStudent(3, "Chet Lama"),
    highStudent(4, "Dev Shah"),
    highStudent(5, "Esha Gurung"),
  ],
};

const owingRow = (n: number) => ({
  student: { id: uid(60 + n), name: `Owes ${String(n)}` },
  fees: 50000,
  paid: 10000,
  still_to_pay: 40000,
});

const SEVEN_OWING = {
  count: 7,
  page: 1,
  page_size: 25,
  totals: { agreed: 350000, collected: 70000, still_to_collect: 280000, students: 9, owing: 7 },
  results: [1, 2, 3, 4, 5, 6, 7].map(owingRow),
};

const SIX_VISITORS = pageOf(
  [1, 2, 3, 4, 5, 6].map((n) => ({
    ...NEW_VISITOR,
    id: uid(80 + n),
    name: `Visitor ${String(n)}`,
  })),
);

const TIDY = [
  on("GET", HIGH_ALL, FIVE_HIGH),
  on("GET", HIGH_MINE, FIVE_HIGH),
  on("GET", HOME_OWING, SEVEN_OWING),
  ...withWaiting(SOME_WAITING),
];

const SECTION_NAMES = [
  "Waiting on you",
  "High priority Students",
  "Pipeline",
  "This month at a glance",
  "Who still owes fees",
  "New visitors without a counsellor",
  "Students' progress",
  "Your Students' progress",
  "Classes",
  "Your tasks due soon",
];

/** The Home's sections, top to bottom. */
async function sectionOrder(): Promise<string[]> {
  await region("Your tasks due soon");
  await region("High priority Students");
  await region("Waiting on you");
  return screen
    .getAllByRole("region")
    .map(
      (section) =>
        section.getAttribute("aria-label") ??
        document.getElementById(section.getAttribute("aria-labelledby") ?? "")?.textContent ??
        "",
    )
    .filter((name) => SECTION_NAMES.includes(name));
}

describe("A tidier Home (ticket 12)", () => {
  it("puts the Admin's sections in the order they work in", async () => {
    backend(...TIDY);
    renderHome(ADMIN);

    expect(await sectionOrder()).toEqual([
      "Waiting on you",
      "High priority Students",
      "Pipeline",
      "This month at a glance",
      "Students' progress",
      "Who still owes fees",
      "New visitors without a counsellor",
      "Your tasks due soon",
    ]);
  });

  it("keeps the same order without the Accounts Module, the visitors on a row of their own", async () => {
    backend(...TIDY);
    renderHome({ ...ADMIN, modules: ["students", "batches", "reports"] });

    expect(await sectionOrder()).toEqual([
      "Waiting on you",
      "High priority Students",
      "Pipeline",
      "Students' progress",
      "New visitors without a counsellor",
      "Your tasks due soon",
    ]);
    const visitors = await region("New visitors without a counsellor");
    expect(visitors.parentElement).not.toHaveClass("wide:grid-cols-2");
  });

  it("puts who owes and the new visitors side by side, the same height", async () => {
    backend(...TIDY);
    renderHome(ADMIN);

    const owes = await region("Who still owes fees");
    const visitors = await region("New visitors without a counsellor");
    expect(owes.parentElement).toBe(visitors.parentElement);
    expect(owes.parentElement).toHaveClass("wide:grid-cols-2");
    expect(owes).toHaveClass("h-full");
    expect(visitors).toHaveClass("h-full");
  });

  it("puts the counsellor's sections in order, with their own High Students", async () => {
    const fetchFn = backend(...TIDY);
    renderHome(COUNSELLOR);

    expect(await sectionOrder()).toEqual([
      "Waiting on you",
      "High priority Students",
      "Your Students' progress",
      "Classes",
      "Your tasks due soon",
    ]);
    expect(callsTo(fetchFn, "GET", HIGH_MINE)).toHaveLength(1);
    expect(callsTo(fetchFn, "GET", HIGH_ALL)).toHaveLength(0);
  });

  it("leaves out Classes for a counsellor without the test-prep Module", async () => {
    backend(...TIDY);
    renderHome({ ...COUNSELLOR, modules: ["students"] });

    expect(await sectionOrder()).toEqual([
      "Waiting on you",
      "High priority Students",
      "Your Students' progress",
      "Your tasks due soon",
    ]);
  });

  it("shows at most 4 High Students as slim boxes in one row, each opening the Student", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const high = within(await region("High priority Students"));

    const asha = await high.findByRole("link", { name: /^Asha Rai/ });
    const boxes = high.getByRole("list", { name: "High priority Students" });
    expect(boxes).toHaveClass("wide:grid-cols-4");
    expect(asha).toHaveAttribute("href", `/students/${uid(41)}`);
    expect(asha).toHaveTextContent("Counsellor: Not assigned");
    expect(asha).toHaveTextContent("Stage: Counselling");
    expect(within(boxes).getAllByRole("listitem")).toHaveLength(4);
    expect(high.getByRole("link", { name: /^Dev Shah/ })).toBeInTheDocument();
    expect(high.queryByText("Esha Gurung")).toBeNull();
  });

  it("puts See all at the right of the title only when there are more than 4", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const section = await region("High priority Students");

    const seeAll = await within(section).findByRole("link", { name: "See all (5)" });
    expect(seeAll).toHaveAttribute("href", "/students?priority=high");
    expect(within(section).getByRole("list")).not.toContainElement(seeAll);
  });

  it("shows no See all when there are 4 or fewer", async () => {
    backend(
      on("GET", HIGH_ALL, { ...FIVE_HIGH, count: 4, results: FIVE_HIGH.results.slice(0, 4) }),
      ...TIDY,
    );
    renderHome(ADMIN);
    const high = within(await region("High priority Students"));

    expect(await high.findByRole("link", { name: /^Dev Shah/ })).toBeInTheDocument();
    expect(high.queryByRole("link", { name: /See all/ })).toBeNull();
  });

  it("sends a counsellor's See all to their own High Students", async () => {
    backend(...TIDY);
    renderHome(COUNSELLOR);
    const high = within(await region("High priority Students"));

    expect(await high.findByRole("link", { name: "See all (5)" })).toHaveAttribute(
      "href",
      "/students?priority=high&counsellor=me",
    );
  });

  it("says so plainly when no Student is High priority", async () => {
    backend(on("GET", HIGH_ALL, pageOf([])), ...TIDY);
    renderHome(ADMIN);
    const high = within(await region("High priority Students"));

    expect(await high.findByText("No Students are High priority right now.")).toBeInTheDocument();
    expect(high.queryByRole("link", { name: /See all/ })).toBeNull();
  });

  it("says so when the High Students can't load, and the rest still works", async () => {
    backend(on("GET", HIGH_ALL, {}, 500), ...TIDY);
    renderHome(ADMIN);

    expect(
      await screen.findByText("We couldn't load the High priority Students. Please try again."),
    ).toBeInTheDocument();
    expect(await region("Pipeline")).toBeInTheDocument();
  });

  it("shows 3 who owe and See all opening Accounts at Student fees", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const owes = within(await region("Who still owes fees"));

    expect(await owes.findByRole("link", { name: "Owes 1" })).toBeInTheDocument();
    expect(owes.getAllByRole("listitem")).toHaveLength(3);
    expect(owes.getByRole("link", { name: "See all (7)" })).toHaveAttribute("href", "/accounts");
  });

  it("shows 3 new visitors and See all opening the list at No counsellor yet", async () => {
    backend(on("GET", UNASSIGNED, SIX_VISITORS), ...TIDY);
    renderHome(ADMIN);
    const visitors = within(await region("New visitors without a counsellor"));

    expect(await visitors.findByRole("link", { name: "Visitor 1" })).toBeInTheDocument();
    expect(visitors.getAllByRole("listitem")).toHaveLength(3);
    expect(visitors.getByRole("link", { name: "See all (6)" })).toHaveAttribute(
      "href",
      "/students?stage=lead&counsellor=none",
    );
  });

  it("leaves the Front Desk and Teacher Homes as they were", async () => {
    const fetchFn = backend(...TIDY);
    renderHome(TEACHER);

    expect(await region("Your classes today")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "High priority Students" })).toBeNull();
    expect(callsTo(fetchFn, "GET", HIGH_ALL)).toHaveLength(0);
    expect(callsTo(fetchFn, "GET", HIGH_MINE)).toHaveLength(0);
  });
});
