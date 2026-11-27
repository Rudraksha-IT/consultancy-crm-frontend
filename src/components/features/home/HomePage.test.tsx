import type { RecordId } from "@/lib/recordId";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { fakeMatchMedia } from "@/test/matchMedia";

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

const PROGRESS_ADMIN = "/api/home/progress/?counsellor=any&limit=5";
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
    expect(await region("New visitors to assign")).toBeInTheDocument();
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

  it("draws the pipeline as five beads on one thread, each opening the Students at that Stage", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const pipeline = within(await region("Pipeline"));

    const thread = await pipeline.findByRole("list", { name: "Students at each Stage" });
    const beads = within(thread).getAllByRole("listitem");
    expect(beads.map((bead) => bead.textContent)).toEqual([
      "Lead440%",
      "Counselling330%",
      "Applying220%",
      "Offer110%",
      "Visa00%",
    ]);
    expect(beads.map((bead) => bead.dataset.bead)).toEqual(["1", "2", "3", "4", "5"]);
    expect(pipeline.getByRole("link", { name: "Lead: 4 Students" })).toHaveAttribute(
      "href",
      "/students?stage=lead",
    );
    expect(pipeline.getByRole("link", { name: "Visa: 0 Students" })).toHaveAttribute(
      "href",
      "/students?stage=visa",
    );
  });

  it("writes how many are in progress beside the Pipeline heading, not in it", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const pipeline = await region("Pipeline");

    const count = await within(pipeline).findByText("10 Students in progress");
    expect(within(pipeline).getByRole("heading", { name: "Pipeline" })).not.toContainElement(count);
    expect(count.parentElement).toContainElement(
      within(pipeline).getByRole("heading", { name: "Pipeline" }),
    );
  });

  it("keeps Lost off the thread, as a quiet line under it", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const pipeline = within(await region("Pipeline"));

    const lost = await pipeline.findByRole("link", { name: "2 Lost, not in progress" });
    expect(lost).toHaveAttribute("href", "/students?stage=lost");
    expect(pipeline.getByRole("list", { name: "Students at each Stage" })).not.toContainElement(
      lost,
    );
  });

  it("has no Lost line when nobody is Lost", async () => {
    backend(on("GET", PIPELINE, { counts: { ...COUNTS, lost: 0 } }), ...EVERYTHING);
    renderHome(ADMIN);
    const pipeline = within(await region("Pipeline"));

    await pipeline.findByRole("list", { name: "Students at each Stage" });
    expect(pipeline.queryByText(/Lost/)).toBeNull();
  });

  it("marks the beads a Student has reached, the current one and those to come", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));

    const applying = await progress.findByRole("list", { name: "Stage: Applying" });
    expect(
      within(applying)
        .getAllByRole("listitem")
        .map((bead) => bead.dataset.state),
    ).toEqual(["past", "past", "now", "next", "next"]);
    const lead = progress.getByRole("list", { name: "Stage: Lead" });
    expect(
      within(lead)
        .getAllByRole("listitem")
        .map((bead) => bead.dataset.state),
    ).toEqual(["now", "next", "next", "next", "next"]);
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

  it("shows the furthest along with their counsellor, and one See all beside the title (owner)", async () => {
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
    expect(progress.queryByText(/furthest along/)).toBeNull();
    const seeAll = progress.getAllByRole("link", { name: "See all (9)" });
    expect(seeAll).toHaveLength(1);
    expect(seeAll[0]).toHaveAttribute("href", "/students");
    expect(progress.queryByRole("link", { name: /All Students/ })).toBeNull();
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

  it("shows the name, the Next line on one line and the documents button on phones, not the thread", async () => {
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));

    const thread = await progress.findByRole("list", { name: "Stage: Applying" });
    expect(thread.closest("[data-progress-stage]")).toHaveClass("max-phone:hidden");
    expect(progress.getByText("Next: Waiting for an offer, Deakin University")).toHaveClass(
      "max-phone:truncate",
    );
  });

  it("on a phone shows the Stage at the row's right in place of the documents button (owner, 2026-11-27)", async () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY,
      ).matchMedia,
    );
    backend(...EVERYTHING);
    renderHome(ADMIN);
    const progress = within(await region("Students' progress"));

    const name = await progress.findByRole("link", { name: "Sita Gurung" });
    const row = name.closest("li");
    if (row === null) throw new Error("no row for Sita Gurung");
    expect(within(row).queryByRole("button", { name: /Open the checklist/ })).toBeNull();
    const stage = within(row).getByText("Applying", { selector: "[data-progress-end] *" });
    expect(stage.closest("[data-progress-end]")).toHaveClass(
      "max-phone:col-start-2",
      "max-phone:row-start-1",
    );
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
    const visitors = within(await region("New visitors to assign"));

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

describe("Waiting for you, as cards to act on (UI revamp 07)", () => {
  it("shows a Counsellor each card with its count and words, opening where the work is", async () => {
    backend(...withWaiting(SOME_WAITING));
    renderHome(COUNSELLOR);
    const waiting = within(await region("Waiting for you"));

    expect(await waiting.findByRole("link", { name: "3 documents to check" })).toHaveAttribute(
      "href",
      "/documents?waiting=true",
    );
    expect(waiting.getByRole("link", { name: "2 transfer requests" })).toHaveAttribute(
      "href",
      "/transfer-requests",
    );
    const appointments = waiting.getByRole("link", {
      name: "2 visa appointments in the next 7 days",
    });
    expect(appointments).toHaveAttribute("href", "/visas?appointment=next_7");
    expect(appointments).toHaveAccessibleDescription(
      "Sita Gurung, Biometrics 4 Nov 2026 at 2:00 PM · <b>Ram</b>, Interview 6 Nov 2026 at 9:30 AM",
    );
  });

  it("words one of each in the singular", async () => {
    backend(
      ...withWaiting({
        documents_waiting: 1,
        transfer_requests_waiting: 1,
        documents_in_bin: 1,
        work_from_home_requests: { count: 1, first_staff_id: uid(6) },
        visa_appointments: {
          count: 1,
          results: SOME_WAITING.visa_appointments.results.slice(0, 1),
        },
      }),
    );
    renderHome(ADMIN);
    const waiting = within(await region("Waiting for you"));

    expect(
      (await waiting.findAllByRole("link")).map((card) => card.getAttribute("aria-label")),
    ).toEqual([
      "1 document to check",
      "1 work from home request",
      "1 transfer request",
      "1 document in the Bin",
      "1 visa appointment in the next 7 days",
    ]);
  });

  it("is a card with an icon, the count, the words and an arrow; amber for what needs an answer", async () => {
    backend(...withWaiting({ ...SOME_WAITING, documents_in_bin: 4 }));
    renderHome(ADMIN);
    const waiting = within(await region("Waiting for you"));

    const documents = await waiting.findByRole("link", { name: "3 documents to check" });
    expect(documents).toHaveTextContent(/^3documents to check$/);
    expect(documents.querySelectorAll("svg")).toHaveLength(2);
    expect(documents.querySelector("[data-todo-icon]")).toHaveClass("bg-warn-tint", "text-warn");
    const bin = waiting.getByRole("link", { name: "4 documents in the Bin" });
    expect(bin.querySelector("[data-todo-icon]")).toHaveClass("bg-fill", "text-ink-2");
    const appointments = waiting.getByRole("link", { name: /visa appointments/ });
    expect(appointments.querySelector("[data-todo-icon]")).toHaveClass("bg-fill", "text-ink-2");
  });

  it("names the first two appointments and says how many more there are", async () => {
    backend(
      ...withWaiting({
        ...NOTHING_WAITING,
        visa_appointments: { ...SOME_WAITING.visa_appointments, count: 7 },
      }),
    );
    renderHome(COUNSELLOR);

    expect(
      await screen.findByText(
        "Sita Gurung, Biometrics 4 Nov 2026 at 2:00 PM · <b>Ram</b>, Interview 6 Nov 2026 at 9:30 AM and 5 more",
      ),
    ).toBeVisible();
  });

  it("shows only what is waiting", async () => {
    backend(...withWaiting({ ...NOTHING_WAITING, transfer_requests_waiting: 1 }));
    renderHome(ADMIN);
    const waiting = within(await region("Waiting for you"));

    expect(await waiting.findByRole("link", { name: "1 transfer request" })).toBeVisible();
    expect(waiting.getAllByRole("link")).toHaveLength(1);
  });

  it("tells an Admin how many Documents are in the Bin, opening the Bin tab", async () => {
    backend(...withWaiting({ ...NOTHING_WAITING, documents_in_bin: 2 }));
    renderHome(ADMIN);
    const waiting = within(await region("Waiting for you"));

    expect(await waiting.findByRole("link", { name: "2 documents in the Bin" })).toHaveAttribute(
      "href",
      "/documents?tab=bin",
    );
  });

  it("tells an Admin how many Work from home requests wait, opening the first", async () => {
    backend(
      ...withWaiting({
        ...NOTHING_WAITING,
        work_from_home_requests: { count: 2, first_staff_id: uid(6) },
      }),
    );
    renderHome(ADMIN);
    const waiting = within(await region("Waiting for you"));

    expect(await waiting.findByRole("link", { name: "2 work from home requests" })).toHaveAttribute(
      "href",
      `/staff/${uid(6)}?tab=wfh`,
    );
  });

  it("sits side by side on computers and is one sheet of rows on phones", async () => {
    backend(...withWaiting(SOME_WAITING));
    renderHome(ADMIN);
    const waiting = await region("Waiting for you");

    expect(waiting).toHaveClass(
      "phone:grid-cols-[repeat(auto-fit,minmax(var(--spacing-todo),1fr))]",
      "max-phone:rounded-panel",
      "max-phone:bg-paper",
    );
    const card = await within(waiting).findByRole("link", { name: "3 documents to check" });
    expect(card).toHaveClass(
      "phone:min-h-todo-card",
      "max-phone:min-h-todo-row",
      "phone:rounded-panel",
    );
  });

  it("shows no row at all when nothing waits", async () => {
    backend(...EVERYTHING);
    renderHome(COUNSELLOR);

    await region("Your Students' progress");
    expect(screen.queryByRole("region", { name: "Waiting for you" })).toBeNull();
  });

  it("shows no row when it can't load, and the rest of the Home still works", async () => {
    backend(...withWaiting({ documents_waiting: "x" }));
    renderHome(ADMIN);

    expect(await region("Pipeline")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Waiting for you" })).toBeNull();
  });

  it.each([
    ["Front Desk", DESK],
    ["a Teacher", TEACHER],
  ])("isn't asked for on the Home of %s", async (_name, context) => {
    const fetchFn = backend(...withWaiting(SOME_WAITING));
    renderHome(context);

    await screen.findByRole("heading", { level: 1 });
    expect(callsTo(fetchFn, "GET", WAITING)).toHaveLength(0);
    expect(screen.queryByRole("region", { name: "Waiting for you" })).toBeNull();
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
  "Waiting for you",
  "High priority Students",
  "Pipeline",
  "This month at a glance",
  "Who still owes fees",
  "New visitors to assign",
  "Students' progress",
  "Your Students' progress",
  "Classes",
  "Your tasks due soon",
];

/** The Home's sections, top to bottom. */
async function sectionOrder(): Promise<string[]> {
  await region("Your tasks due soon");
  await region("High priority Students");
  await region("Waiting for you");
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
  it("puts what waits for the Admin first, then the work, then the money (UI revamp 07)", async () => {
    backend(...TIDY);
    renderHome(ADMIN);

    expect(await sectionOrder()).toEqual([
      "Waiting for you",
      "High priority Students",
      "Your tasks due soon",
      "New visitors to assign",
      "Pipeline",
      "Students' progress",
      "This month at a glance",
      "Who still owes fees",
    ]);
  });

  it("keeps the same order without the Accounts Module", async () => {
    backend(...TIDY);
    renderHome({ ...ADMIN, modules: ["students", "batches", "reports"] });

    expect(await sectionOrder()).toEqual([
      "Waiting for you",
      "High priority Students",
      "Your tasks due soon",
      "New visitors to assign",
      "Pipeline",
      "Students' progress",
    ]);
  });

  it("is a desk from 1280px: the work on the left, what waits on the right, the money under both", async () => {
    backend(...TIDY);
    renderHome(ADMIN);

    const side = (await region("High priority Students")).parentElement;
    const main = (await region("Pipeline")).parentElement;
    expect(side).toContainElement(await region("Your tasks due soon"));
    expect(side).toContainElement(await region("New visitors to assign"));
    expect(main).toContainElement(await region("Students' progress"));
    expect(side).toHaveClass("desk:order-2");
    const desk = side?.parentElement;
    expect(desk).toBe(main?.parentElement);
    expect(desk).toHaveClass("desk:grid-cols-[minmax(0,1fr)_var(--spacing-desk-side)]");
    // Below 1280px it is one column in this order: the waiting parts come first.
    expect(desk?.firstElementChild).toBe(side);
    const glance = await region("This month at a glance");
    const owes = await region("Who still owes fees");
    expect(desk).not.toContainElement(glance);
    expect(desk).not.toContainElement(owes);
  });

  it("puts who still owes across the full width, a Student to a column", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const owes = within(await region("Who still owes fees"));

    expect(await owes.findByRole("list", { name: "Who still owes fees" })).toHaveClass(
      "mid:grid-cols-3",
      "mid:divide-x",
    );
  });

  it("puts the counsellor's sections in order, with their own High Students", async () => {
    const fetchFn = backend(...TIDY);
    renderHome(COUNSELLOR);

    expect(await sectionOrder()).toEqual([
      "Waiting for you",
      "High priority Students",
      "Your tasks due soon",
      "Your Students' progress",
      "Classes",
    ]);
    const side = (await region("High priority Students")).parentElement;
    expect(side).toContainElement(await region("Your tasks due soon"));
    expect((await region("Your Students' progress")).parentElement).toContainElement(
      await region("Classes"),
    );
    expect(callsTo(fetchFn, "GET", HIGH_MINE)).toHaveLength(1);
    expect(callsTo(fetchFn, "GET", HIGH_ALL)).toHaveLength(0);
  });

  it("leaves out Classes for a counsellor without the test-prep Module", async () => {
    backend(...TIDY);
    renderHome({ ...COUNSELLOR, modules: ["students"] });

    expect(await sectionOrder()).toEqual([
      "Waiting for you",
      "High priority Students",
      "Your tasks due soon",
      "Your Students' progress",
    ]);
  });

  it("shows at most 4 High Students on one sheet, each opening the Student", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const high = within(await region("High priority Students"));

    const asha = await high.findByRole("link", { name: /^Asha Rai/ });
    const boxes = high.getByRole("list", { name: "High priority Students" });
    expect(boxes).toHaveClass("wide:grid-cols-4", "desk:grid-cols-1", "bg-paper");
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
    const seeAll = owes.getByRole("link", { name: "See all (7)" });
    expect(seeAll).toHaveAttribute("href", "/accounts");
    expect(seeAll.parentElement?.parentElement).toContainElement(
      owes.getByRole("heading", { name: "Who still owes fees" }),
    );
  });

  it("shows 3 new visitors and See all opening the list at No counsellor yet", async () => {
    backend(on("GET", UNASSIGNED, SIX_VISITORS), ...TIDY);
    renderHome(ADMIN);
    const visitors = within(await region("New visitors to assign"));

    expect(await visitors.findByRole("link", { name: "Visitor 1" })).toBeInTheDocument();
    expect(visitors.getAllByRole("listitem")).toHaveLength(3);
    const seeAll = visitors.getByRole("link", { name: "See all (6)" });
    expect(seeAll).toHaveAttribute("href", "/students?stage=lead&counsellor=none");
    // Beside the title, on its line, never under the sheet.
    const titleLine = visitors.getByRole("heading", { name: "New visitors to assign" })
      .parentElement?.parentElement;
    expect(titleLine).toContainElement(seeAll);
    expect(titleLine).toHaveClass("flex-nowrap");
  });

  it("shows at most 4 tasks and 5 Students in progress on the Admin's Home", async () => {
    const fetchFn = backend(
      on(
        "GET",
        TASKS,
        pageOf(
          [1, 2, 3, 4, 5, 6].map((n) => task(uid(n), `Task ${String(n)}`, "2026-11-03", "today")),
        ),
      ),
      ...TIDY,
    );
    renderHome(ADMIN);
    const tasks = within(await region("Your tasks due soon"));

    expect(await tasks.findByText("Task 4")).toBeInTheDocument();
    expect(tasks.getAllByRole("checkbox")).toHaveLength(4);
    expect(tasks.getByRole("link", { name: "See all tasks" })).toHaveAttribute("href", "/tasks");
    expect(callsTo(fetchFn, "GET", PROGRESS_ADMIN)).toHaveLength(1);
  });

  it("clamps a long task title to two lines and keeps who and when on one line in the desk column", async () => {
    const long = "Call the university about the missing transcript and the deposit ".repeat(4);
    backend(
      on("GET", TASKS, pageOf([task(uid(1), long, "2026-11-05", "upcoming", "high")])),
      ...TIDY,
    );
    renderHome(ADMIN);
    const tasks = within(await region("Your tasks due soon"));

    const title = await tasks.findByText(long.trim());
    expect(title).toHaveClass("desk:line-clamp-2");
    const row = title.closest("li");
    expect(row).toHaveAttribute("data-look", "desk");
    const due = tasks.getByText("5 Nov 2026");
    expect(due.closest("[data-task-due]")).toHaveClass("desk:row-start-2", "desk:col-start-3");
  });

  it("gives a High priority Student a name and one line on the desk, long names cut short", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const high = within(await region("High priority Students"));

    const asha = await high.findByRole("link", { name: /^Asha Rai/ });
    expect(within(asha).getByText("Asha Rai")).toHaveClass("truncate");
    const line = within(asha).getByText("Counsellor: Not assigned").parentElement;
    expect(line).toContainElement(within(asha).getByText("Stage: Counselling"));
    expect(line).toHaveClass("desk:flex", "desk:whitespace-nowrap");
  });

  it("keeps an empty part of the desk column as tall as two rows", async () => {
    backend(
      on("GET", HIGH_ALL, pageOf([])),
      on("GET", TASKS, pageOf([])),
      on("GET", UNASSIGNED, pageOf([])),
      ...TIDY,
    );
    renderHome(ADMIN);

    for (const words of [
      "No Students are High priority right now.",
      "Nothing due in the next two days.",
      "Everyone has a counsellor.",
    ]) {
      const empty = (await screen.findByText(words)).closest("[data-desk-empty]");
      expect(empty).toHaveClass("desk:min-h-desk-empty");
    }
  });

  it("makes Assign a small pill beside the visitor's name on phones, still 44 tall to tap", async () => {
    backend(...TIDY);
    renderHome(ADMIN);
    const visitors = within(await region("New visitors to assign"));

    const assign = await visitors.findByRole("button", {
      name: "Assign a counsellor to Hari Bhandari",
    });
    expect(assign).toHaveClass("min-h-control", "max-phone:bg-transparent");
    expect(within(assign).getByText("Assign")).toHaveClass(
      "max-phone:rounded-pill",
      "max-phone:bg-accent",
    );
    const row = assign.closest("li");
    expect(row).toHaveClass("max-phone:grid-cols-[minmax(0,1fr)_auto]");
    expect(visitors.getByRole("link", { name: "Hari Bhandari" })).toHaveClass("desk:truncate");
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
