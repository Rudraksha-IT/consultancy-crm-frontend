import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { TaskCountContext } from "@/components/features/shell/taskCount";
import { StudentProfilePage } from "@/components/features/students/profile/StudentProfilePage";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SESSION_TEXT } from "@/constants/session";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { PROFILE } from "@/test/studentProfile";

import { TasksPage } from "./TasksPage";
import { consultancySummary } from "@/test/consultancy";
import { testHost } from "@/test/hosts";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const DESK: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(4), name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
};

const TEACHER: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(9), name: "Gita Lama", email: "gita@acme.test", role: "teacher" },
};

const BS_COUNSELLOR: StaffContext = { ...COUNSELLOR, dateDisplay: "BS" };

const TASK = {
  id: uid(31),
  title: "Call Sita about her IELTS retake date",
  due_on: "2026-10-30",
  priority: "normal",
  only_me: false,
  timing: "overdue",
  is_done: false,
  done_at: null,
  assignee: { id: uid(5), name: "Bikash Thapa" },
  created_by: { id: uid(5), name: "Bikash Thapa" },
  student: { id: uid(7), name: "Sita Gurung" },
  can_mark_done: true,
};

const TODAY_TASK = {
  ...TASK,
  id: uid(32),
  title: "Collect the bank statement",
  due_on: "2026-11-02",
  timing: "today",
  created_by: { id: uid(4), name: "Ramesh KC" },
  student: null,
};

const LATER_TASK = { ...TASK, id: uid(33), title: "Book biometrics", due_on: "2026-11-06" };
const LATER_TASK_ANSWER = { ...LATER_TASK, timing: "upcoming" };

const ASSIGNEES = [
  { id: uid(5), name: "Bikash Thapa", role: "counsellor" },
  { id: uid(9), name: "Gita Lama", role: "teacher" },
  { id: uid(4), name: "Ramesh KC", role: "front_desk" },
];

const MINE = "/api/tasks/?view=mine&page=1";
const GIVEN = "/api/tasks/?view=given&page=1";
const DONE = "/api/tasks/?view=done&page=1";

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

function renderTasks(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <TasksPage />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function renderProfile(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={uid(7)} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const [call] = callsTo(fetchFn, verb, path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

async function openNewTask(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "New task" }));
  return screen.getByRole("dialog", { name: "New Task" });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Tasks page", () => {
  it("lists my open Tasks with overdue and today named, not only coloured", async () => {
    backend(on("GET", MINE, pageOf([TASK, TODAY_TASK, LATER_TASK_ANSWER])));
    renderTasks();

    expect(screen.getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(
      screen.getByText("Overdue first, then the most important. Tick a task when it's done."),
    ).toBeInTheDocument();
    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Retake date.*Overdue$/i),
      expect.stringMatching(/bank statement.*Today$/),
      expect.stringMatching(/biometrics.*6 Nov 2026$/),
    ]);
    expect(screen.getByText("3 tasks")).toBeInTheDocument();
  });

  it("links the Student and says who gave a Task, but not who it's for when it's mine", async () => {
    backend(on("GET", MINE, pageOf([TASK, TODAY_TASK])));
    renderTasks();

    const link = await screen.findByRole("link", { name: "Sita Gurung" });
    expect(link).toHaveAttribute("href", `/students/${uid(7)}`);
    // A 44 px touch target, not just the height of its text.
    expect(link).toHaveClass("min-h-control");
    expect(screen.getByText("From Ramesh KC")).toBeInTheDocument();
    expect(screen.queryByText("For Bikash Thapa")).not.toBeInTheDocument();
  });

  it("says when I'm all caught up", async () => {
    backend(on("GET", MINE, pageOf([])));
    renderTasks();

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });

  it("shows a problem when the list doesn't load", async () => {
    backend();
    renderTasks();

    expect(await screen.findByText("We couldn't load the tasks. Please try again.")).toBeVisible();
  });

  it("switches to Tasks given to others, naming who each is for", async () => {
    const given = { ...TASK, assignee: { id: uid(2), name: "Anita Rai" } };
    const fetchFn = backend(on("GET", MINE, pageOf([])), on("GET", GIVEN, pageOf([given])));
    renderTasks();
    await screen.findByText("You're all caught up.");

    await userEvent.click(screen.getByRole("button", { name: "Given to others" }));

    expect(await screen.findByText("For Anita Rai")).toBeInTheDocument();
    expect(screen.queryByText("From Bikash Thapa")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Given to others" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(callsTo(fetchFn, "GET", GIVEN)).toHaveLength(1);
  });

  it("shows done Tasks struck through with the day they were done", async () => {
    const done = { ...TASK, timing: "done", is_done: true, done_at: "2026-11-01T15:00:00+05:45" };
    backend(on("GET", MINE, pageOf([])), on("GET", DONE, pageOf([done])));
    renderTasks();
    await screen.findByText("You're all caught up.");

    await userEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(await screen.findByText("Done 1 Nov 2026")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: `Mark not done: ${TASK.title}` })).toBeChecked();
    expect(screen.getByText(TASK.title)).toHaveClass("line-through");
  });

  it("shows due dates in BS when the office uses BS", async () => {
    backend(on("GET", MINE, pageOf([LATER_TASK_ANSWER])));
    renderTasks(BS_COUNSELLOR);

    expect(await screen.findByText("20 Kartik 2083")).toBeInTheDocument();
  });

  it("ticks a Task done, says so and loads the list again", async () => {
    let isDone = false;
    const fetchFn = backend(
      onEach("GET", MINE, () => pageOf(isDone ? [] : [TASK])),
      (path, init) => {
        if (path !== `/api/tasks/${uid(31)}/` || init?.method !== "PATCH") return undefined;
        isDone = true;
        return new Response(JSON.stringify({ ...TASK, is_done: true, timing: "done" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    renderTasks();

    await userEvent.click(
      await screen.findByRole("checkbox", { name: `Mark done: ${TASK.title}` }),
    );

    expect(await screen.findByText("Task done")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PATCH", `/api/tasks/${uid(31)}/`)).toEqual({ done: true });
    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });

  it("says why when ticking is refused", async () => {
    backend(
      on("GET", MINE, pageOf([TASK])),
      on("PATCH", `/api/tasks/${uid(31)}/`, { detail: "No" }, 403),
    );
    renderTasks();

    await userEvent.click(
      await screen.findByRole("checkbox", { name: `Mark done: ${TASK.title}` }),
    );

    expect(
      await screen.findByText("Only the person it's for, who gave it, or an Admin can tick it."),
    ).toBeInTheDocument();
  });

  it("says the app is being updated when that is why ticking failed (ticket 14)", async () => {
    backend(
      on("GET", MINE, pageOf([TASK])),
      on(
        "PATCH",
        `/api/tasks/${uid(31)}/`,
        { detail: SESSION_TEXT.updating, code: "updating" },
        503,
      ),
    );
    renderTasks();

    await userEvent.click(
      await screen.findByRole("checkbox", { name: `Mark done: ${TASK.title}` }),
    );

    expect(await screen.findByText(SESSION_TEXT.updating)).toBeInTheDocument();
  });

  it("can't tick a Task the API says I may not", async () => {
    backend(on("GET", MINE, pageOf([{ ...TASK, can_mark_done: false }])));
    renderTasks();

    expect(
      await screen.findByRole("checkbox", { name: `Mark done: ${TASK.title}` }),
    ).toBeDisabled();
  });

  it("shows typed HTML in a title as text", async () => {
    backend(on("GET", MINE, pageOf([{ ...TASK, title: "<b>Call</b> <script>x</script>" }])));
    renderTasks();

    expect(await screen.findByText("<b>Call</b> <script>x</script>")).toBeInTheDocument();
  });
});

describe("Priority and Only me on the list", () => {
  it("shows High and Low priority and Only me with words, and nothing for Normal", async () => {
    backend(
      on(
        "GET",
        MINE,
        pageOf([
          { ...TASK, priority: "high" },
          { ...TODAY_TASK, priority: "low", only_me: true },
          LATER_TASK_ANSWER,
        ]),
      ),
    );
    renderTasks();

    const rows = await screen.findAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Retake date.*High priority/i),
      expect.stringMatching(/bank statement.*Low priority.*Only me/),
      expect.not.stringMatching(/priority|Only me/),
    ]);
  });

  it("filters by priority, and says when none have it", async () => {
    const fetchFn = backend(
      on("GET", MINE, pageOf([TASK])),
      on("GET", `${MINE}&priority=high`, pageOf([])),
      on("GET", `${GIVEN}&priority=high`, pageOf([{ ...TASK, priority: "high" }])),
    );
    renderTasks();
    await screen.findByText(TASK.title);

    await userEvent.selectOptions(screen.getByLabelText("Priority"), "high");

    expect(await screen.findByText("No tasks with this priority.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Given to others" }));
    expect(await screen.findByText("High priority")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", `${GIVEN}&priority=high`)).toHaveLength(1);
  });

  it("offers Any, High, Normal and Low, Any first", async () => {
    backend(on("GET", MINE, pageOf([])));
    renderTasks();

    const filter = await screen.findByLabelText("Priority");

    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Any", "High", "Normal", "Low"]);
    expect(filter).toHaveValue("");
  });
});

describe("The menu's Tasks count", () => {
  function renderCounted(refresh: () => void) {
    return render(
      <StaffContextContext value={COUNSELLOR}>
        <TaskCountContext value={{ count: 1, refresh }}>
          <ToastProvider>
            <TasksPage />
          </ToastProvider>
        </TaskCountContext>
      </StaffContextContext>,
    );
  }

  it("is asked for again after a Task is ticked", async () => {
    const refresh = vi.fn<() => void>();
    backend(
      on("GET", MINE, pageOf([TASK])),
      on("PATCH", `/api/tasks/${uid(31)}/`, { ...TASK, is_done: true, timing: "done" }),
    );
    renderCounted(refresh);

    await userEvent.click(
      await screen.findByRole("checkbox", { name: `Mark done: ${TASK.title}` }),
    );

    await screen.findByText("Task done");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("is asked for again after a Task is created", async () => {
    const refresh = vi.fn<() => void>();
    backend(
      on("GET", MINE, pageOf([])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      on("POST", "/api/tasks/", { ...TASK, student: null }, 201),
    );
    renderCounted(refresh);
    const dialog = await openNewTask();

    await userEvent.type(within(dialog).getByLabelText("What needs doing"), "Call Sita");
    await within(dialog).findByLabelText("Assign to");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));

    await screen.findByText("Task created");
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("New Task priority and Only me", () => {
  it("starts at Normal and sends the priority chosen", async () => {
    const fetchFn = backend(
      on("GET", MINE, pageOf([])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      on("POST", "/api/tasks/", { ...TASK, student: null, priority: "high" }, 201),
    );
    renderTasks();
    const dialog = await openNewTask();
    const priority = within(dialog).getByRole("radiogroup", { name: "Priority" });

    expect(within(priority).getByRole("radio", { name: "Normal" })).toBeChecked();
    await userEvent.type(within(dialog).getByLabelText("What needs doing"), "Call Sita");
    await within(dialog).findByLabelText("Assign to");
    await userEvent.click(within(priority).getByRole("radio", { name: "High" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));

    await screen.findByText("Task created");
    expect(sentBody(fetchFn, "POST", "/api/tasks/")).toMatchObject({
      priority: "high",
      only_me: false,
    });
  });

  it("keeps an Only me Task for me, with no Student", async () => {
    const fetchFn = backend(
      on("GET", MINE, pageOf([])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      on("POST", "/api/tasks/", { ...TASK, student: null, only_me: true }, 201),
    );
    renderTasks();
    const dialog = await openNewTask();
    await userEvent.type(within(dialog).getByLabelText("What needs doing"), "Renew my licence");
    await userEvent.selectOptions(await within(dialog).findByLabelText("Assign to"), uid(4));

    await userEvent.click(
      within(dialog).getByRole("checkbox", {
        name: "Only me. Nobody else sees it, and it isn't about a Student.",
      }),
    );

    expect(within(dialog).queryByLabelText("Assign to")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("About a Student (optional)")).not.toBeInTheDocument();
    expect(within(dialog).getByText("You")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));
    await screen.findByText("Task created");
    expect(sentBody(fetchFn, "POST", "/api/tasks/")).toEqual({
      title: "Renew my licence",
      due_on: "2026-11-03",
      assignee: uid(5),
      student: null,
      priority: "normal",
      only_me: true,
    });
  });

  it("gives the choice back when Only me is unticked", async () => {
    backend(on("GET", MINE, pageOf([])), on("GET", "/api/tasks/assignees/", ASSIGNEES));
    renderTasks(DESK);
    const dialog = await openNewTask();
    await within(dialog).findByLabelText("Assign to");
    const onlyMe = within(dialog).getByRole("checkbox", { name: /^Only me/ });

    await userEvent.click(onlyMe);
    await userEvent.click(onlyMe);

    expect(within(dialog).getByLabelText("Assign to")).toHaveValue(uid(4));
    expect(within(dialog).getByLabelText("About a Student (optional)")).toBeInTheDocument();
  });

  it("isn't offered to a Platform Admin, who has no Tasks of their own here", async () => {
    backend(on("GET", MINE, pageOf([])), on("GET", "/api/tasks/assignees/", ASSIGNEES));
    renderTasks({
      ...COUNSELLOR,
      staff: { ...COUNSELLOR.staff, id: uid(0), role: "admin" },
      supportAccess: { platformAdminName: "Ramesh", platformHost: testHost("admin") },
    });
    const dialog = await openNewTask();
    await within(dialog).findByLabelText("Assign to");

    expect(within(dialog).queryByRole("checkbox", { name: /^Only me/ })).not.toBeInTheDocument();
  });
});

describe("New Task", () => {
  it("opens with focus in the title, due tomorrow, given to me by default", async () => {
    backend(on("GET", MINE, pageOf([])), on("GET", "/api/tasks/assignees/", ASSIGNEES));
    renderTasks();

    const dialog = await openNewTask();

    expect(within(dialog).getByLabelText("What needs doing")).toHaveFocus();
    expect(within(dialog).getByLabelText("Due")).toHaveValue("2026-11-03");
    const assignTo = await within(dialog).findByLabelText("Assign to");
    expect(assignTo).toHaveValue(uid(5));
    expect(
      within(assignTo)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Bikash Thapa (Counsellor)", "Gita Lama (Teacher)", "Ramesh KC (Front Desk)"]);
  });

  it("gives a Counsellor a Task about a Student found by name, and says it was given", async () => {
    const created = { ...TASK, assignee: { id: uid(5), name: "Bikash Thapa" } };
    const fetchFn = backend(
      on("GET", MINE, pageOf([])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      on("GET", "/api/students/?q=Sita", {
        count: 1,
        page: 1,
        page_size: 25,
        results: [
          {
            id: uid(7),
            name: "Sita Gurung",
            phone: "9841000001",
            email: "",
            country: "australia",
            source: "walk_in",
            stage: "lead",
            priority: "normal",
            assigned_counsellor: null,
          },
        ],
      }),
      on("POST", "/api/tasks/", created, 201),
    );
    renderTasks(DESK);
    const dialog = await openNewTask();

    await userEvent.type(within(dialog).getByLabelText("What needs doing"), "Call Sita");
    await userEvent.selectOptions(await within(dialog).findByLabelText("Assign to"), uid(5));
    await userEvent.type(within(dialog).getByLabelText("Find a Student (optional)"), "Sita");
    const about = within(dialog).getByLabelText("About a Student (optional)");
    await within(about).findByRole("option", { name: "Sita Gurung" });
    await userEvent.selectOptions(about, uid(7));
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));

    expect(
      await screen.findByText("Task given to Bikash Thapa. They'll get a notification."),
    ).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", "/api/tasks/")).toEqual({
      title: "Call Sita",
      due_on: "2026-11-03",
      assignee: uid(5),
      student: uid(7),
      priority: "normal",
      only_me: false,
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("says a Task for myself was created", async () => {
    backend(
      on("GET", MINE, pageOf([])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      on("POST", "/api/tasks/", { ...TASK, student: null }, 201),
    );
    renderTasks();
    const dialog = await openNewTask();

    await userEvent.type(within(dialog).getByLabelText("What needs doing"), "Call Sita");
    await within(dialog).findByLabelText("Assign to");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));

    expect(await screen.findByText("Task created")).toBeInTheDocument();
  });

  it("shows the server's reasons beside the fields and keeps the dialog open", async () => {
    backend(
      on("GET", MINE, pageOf([])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      on(
        "POST",
        "/api/tasks/",
        {
          title: ["Say what needs doing."],
          due_on: ["Enter a due date from today to 5 years ahead."],
        },
        400,
      ),
    );
    renderTasks();
    const dialog = await openNewTask();
    await within(dialog).findByLabelText("Assign to");

    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));

    expect(await within(dialog).findByText("Say what needs doing.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Enter a due date from today to 5 years ahead."),
    ).toBeInTheDocument();
  });

  it("says so when the people to give it to don't load", async () => {
    backend(on("GET", MINE, pageOf([])));
    renderTasks();

    const dialog = await openNewTask();

    expect(
      await within(dialog).findByText(
        "We couldn't load who tasks can be given to. Please try again.",
      ),
    ).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(on("GET", MINE, pageOf([])), on("GET", "/api/tasks/assignees/", ASSIGNEES));
    renderTasks();
    await openNewTask();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("never offers a Student to a Teacher", async () => {
    backend(on("GET", MINE, pageOf([])), on("GET", "/api/tasks/assignees/", ASSIGNEES));
    renderTasks(TEACHER);

    const dialog = await openNewTask();

    await within(dialog).findByLabelText("Assign to");
    expect(within(dialog).queryByLabelText("About a Student (optional)")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Find a Student (optional)")).not.toBeInTheDocument();
  });
});

describe("A Student's Tasks tab", () => {
  const STUDENT_TASKS = `/api/students/${uid(7)}/tasks/?page=1`;

  it("counts and lists the Student's open Tasks without repeating their name", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, { ...PROFILE, open_tasks: 2 }),
      on("GET", STUDENT_TASKS, pageOf([TASK, LATER_TASK_ANSWER])),
    );
    renderProfile();

    const tab = await screen.findByRole("tab", { name: "Tasks 2" });
    await userEvent.click(tab);

    expect(await screen.findByRole("heading", { name: "Open tasks" })).toBeInTheDocument();
    expect(screen.getByText(TASK.title)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sita Gurung" })).not.toBeInTheDocument();
  });

  it("says when nothing is open", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, PROFILE), on("GET", STUDENT_TASKS, pageOf([])));
    renderProfile();

    await userEvent.click(await screen.findByRole("tab", { name: "Tasks 0" }));

    expect(await screen.findByText("Nothing open for this Student.")).toBeInTheDocument();
  });

  it("adds a Task about the Student, given to their counsellor, then counts it", async () => {
    let created = false;
    const fetchFn = backend(
      onEach("GET", `/api/students/${uid(7)}/`, () => ({
        ...PROFILE,
        open_tasks: created ? 1 : 0,
      })),
      onEach("GET", STUDENT_TASKS, () => pageOf(created ? [TASK] : [])),
      on("GET", "/api/tasks/assignees/", ASSIGNEES),
      (path, init) => {
        if (path !== "/api/tasks/" || init?.method !== "POST") return undefined;
        created = true;
        return new Response(JSON.stringify(TASK), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    renderProfile(DESK);
    await userEvent.click(await screen.findByRole("tab", { name: "Tasks 0" }));

    await userEvent.click(await screen.findByRole("button", { name: "Add a task" }));
    const dialog = screen.getByRole("dialog", { name: "New Task" });
    expect(within(dialog).getByText("Sita Gurung")).toBeInTheDocument();
    expect(await within(dialog).findByLabelText("Assign to")).toHaveValue(uid(5));
    await userEvent.type(within(dialog).getByLabelText("What needs doing"), "Call Sita");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create Task" }));

    expect(await screen.findByRole("tab", { name: "Tasks 1" })).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", "/api/tasks/")).toMatchObject({
      assignee: uid(5),
      student: uid(7),
    });
    expect(await screen.findByText(TASK.title)).toBeInTheDocument();
  });
});
