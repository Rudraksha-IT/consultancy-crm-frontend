import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomePage } from "@/components/features/home/HomePage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on, onEach } from "@/test/backend";

import { BatchesPage } from "./BatchesPage";
import { BatchPage } from "./BatchPage";
import { ClassesSection } from "./ClassesSection";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks", "batches"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const TEACHER: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(9), name: "Gita Lama", email: "gita@acme.test", role: "teacher" },
};

const DESK: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(4), name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
};

const CLASSES_OFF: StaffContext = { ...COUNSELLOR, modules: ["students", "tasks"] };

const MORNING = {
  id: uid(1),
  name: "IELTS Morning",
  test_type: "ielts",
  teacher: { id: uid(9), name: "Gita Lama" },
  time_slot: "7:00-8:30 AM",
  starts_on: "2026-10-05",
  ends_on: "2026-12-04",
  timing: "running",
  student_count: 2,
  attendance_taken_today: false,
  can_change: true,
};

const JAPANESE = {
  ...MORNING,
  id: uid(2),
  name: "Japanese N5 Evening",
  test_type: "japanese",
  teacher: { id: uid(11), name: "Hari Rai" },
  time_slot: "5:30-7:00 PM",
  starts_on: "2026-11-15",
  ends_on: "2027-01-29",
  timing: "upcoming",
  student_count: 1,
};

const OLD = {
  ...MORNING,
  id: uid(3),
  name: "PTE Summer",
  starts_on: "2026-06-01",
  ends_on: "2026-07-31",
  timing: "finished",
  student_count: 0,
};

const SITA = { id: uid(7), name: "Sita Gurung", attended_percent: null };
const RAM = { id: uid(8), name: "Ram Shrestha", attended_percent: 92 };

const MORNING_WITH_STUDENTS = { ...MORNING, students: [RAM, SITA] };

const TEACHERS = [
  { id: uid(9), name: "Gita Lama" },
  { id: uid(11), name: "Hari Rai" },
];

const LIST = "/api/batches/?page=1";
const ENROLLED = "/api/batches/students/?page=1";

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

function asTeacher(batch: object) {
  return { ...batch, can_change: false };
}

const SEARCH_RESULT = {
  id: uid(7),
  name: "Sita Gurung",
  phone: "9841000001",
  email: "",
  country: "australia",
  source: "walk_in",
  stage: "counselling",
  priority: "normal",
  assigned_counsellor: null,
};

const SEARCH_SITA = on("GET", "/api/students/?q=Sita", {
  count: 1,
  page: 1,
  page_size: 25,
  results: [SEARCH_RESULT],
});

function renderWith(element: React.ReactNode, context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>{element}</ToastProvider>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const [call] = callsTo(fetchFn, verb, path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Classes page", () => {
  it("lists every class with its time, teacher, Students and a worded status", async () => {
    backend(on("GET", LIST, pageOf([MORNING, JAPANESE, OLD])));
    renderWith(<BatchesPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Classes" })).toBeInTheDocument();
    expect(screen.getByText("Test-prep classes. They run Sunday to Friday.")).toBeInTheDocument();
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(3);
    const [morning, japanese, old] = rows;
    expect(morning).toHaveTextContent("IELTS Morning");
    expect(morning).toHaveTextContent("7:00-8:30 AM");
    expect(morning).toHaveTextContent("Gita Lama");
    expect(morning).toHaveTextContent("2 Students");
    expect(morning).toHaveTextContent("Running");
    expect(japanese).toHaveTextContent("1 Student");
    expect(japanese).toHaveTextContent("Starts 15 Nov 2026");
    expect(old).toHaveTextContent("Finished");
    expect(screen.getByRole("link", { name: "IELTS Morning" })).toHaveAttribute(
      "href",
      `/batches/${uid(1)}`,
    );
    expect(screen.getByText("3 classes")).toBeInTheDocument();
  });

  it("offers a Counsellor New class and Enroll a Student", async () => {
    backend(on("GET", LIST, pageOf([MORNING])));
    renderWith(<BatchesPage />);

    expect(await screen.findByRole("button", { name: "New class" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enroll a Student" })).toBeInTheDocument();
  });

  it("shows a Teacher only their classes, opened from the name, with no way to change them", async () => {
    backend(on("GET", LIST, pageOf([asTeacher(MORNING)])));
    renderWith(<BatchesPage />, TEACHER);

    expect(screen.getByText("The classes you teach.")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "IELTS Morning" })).toHaveAttribute(
      "href",
      `/batches/${uid(1)}`,
    );
    expect(screen.queryByRole("button", { name: /Who's in it/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New class" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enroll a Student" })).not.toBeInTheDocument();
  });

  it("tells a Teacher with no classes so", async () => {
    backend(on("GET", LIST, pageOf([])));
    renderWith(<BatchesPage />, TEACHER);

    expect(await screen.findByText("You don't teach any classes yet.")).toBeInTheDocument();
  });

  it.each([
    ["Front Desk", DESK],
    ["anyone, while classes are switched off", CLASSES_OFF],
  ])("isn't available to %s and asks the API nothing", (_, context) => {
    const fetchFn = backend();
    renderWith(<BatchesPage />, context);

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says when the list couldn't load", async () => {
    backend(on("GET", LIST, {}, 500));
    renderWith(<BatchesPage />);

    expect(
      await screen.findByText("We couldn't load the classes. Please try again."),
    ).toBeInTheDocument();
  });

  it("treats an injection-shaped name as text", async () => {
    backend(on("GET", LIST, pageOf([{ ...MORNING, name: "<img src=x onerror=alert(1)>" }])));
    renderWith(<BatchesPage />);

    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("New class", () => {
  it("creates a class with a Teacher from the list, then shows it", async () => {
    let classes: unknown[] = [];
    const fetchFn = backend(
      onEach("GET", LIST, () => pageOf(classes)),
      on("GET", "/api/batches/teachers/", TEACHERS),
      (path, init) => {
        if (init?.method !== "POST" || path !== "/api/batches/") return undefined;
        classes = [MORNING];
        return new Response(JSON.stringify({ ...MORNING, students: [] }), { status: 201 });
      },
    );
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "New class" }));
    const dialog = screen.getByRole("dialog", { name: "New class" });

    await userEvent.type(within(dialog).getByLabelText("Name"), "IELTS Morning");
    await userEvent.selectOptions(within(dialog).getByLabelText("Test type"), "ielts");
    await userEvent.selectOptions(await within(dialog).findByLabelText("Teacher"), uid(9));
    // Only From and To show; "Time slot" names the pair for screen readers alone.
    expect(within(dialog).getByRole("group", { name: "Time slot" })).toBeInTheDocument();
    expect(within(dialog).getByText("Time slot")).toHaveClass("sr-only");
    expect(within(dialog).getByLabelText("From")).toHaveDisplayValue("7:00 AM");
    expect(within(dialog).getByLabelText("To")).toHaveDisplayValue("8:30 AM");
    await userEvent.selectOptions(within(dialog).getByLabelText("From"), "11:30 AM");
    expect(within(dialog).getByLabelText("To")).toHaveDisplayValue("1:00 PM");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create class" }));

    expect(await screen.findByText("Class saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", "/api/batches/")).toEqual({
      name: "IELTS Morning",
      test_type: "ielts",
      teacher: uid(9),
      time_slot: "11:30 AM-1:00 PM",
      starts_on: "2026-11-07",
      ends_on: "2027-01-06",
    });
    expect(await screen.findByText("IELTS Morning")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows why the server refused a field and keeps the dialog open", async () => {
    backend(
      on("GET", LIST, pageOf([])),
      on("GET", "/api/batches/teachers/", TEACHERS),
      on("POST", "/api/batches/", { ends_on: ["It can't end before it starts."] }, 400),
    );
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "New class" }));
    const dialog = screen.getByRole("dialog", { name: "New class" });
    await within(dialog).findByLabelText("Teacher");

    await userEvent.click(within(dialog).getByRole("button", { name: "Create class" }));

    expect(await within(dialog).findByText("It can't end before it starts.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New class" })).toBeInTheDocument();
  });

  it("can't be saved until the teachers have loaded", async () => {
    let answerTeachers: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) =>
        path === "/api/batches/teachers/"
          ? new Promise<Response>((resolve) => {
              answerTeachers = resolve;
            })
          : Promise.resolve(new Response(JSON.stringify(pageOf([])))),
      ),
    );
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "New class" }));
    const dialog = screen.getByRole("dialog", { name: "New class" });

    expect(within(dialog).getByRole("button", { name: "Create class" })).toBeDisabled();
    answerTeachers(new Response(JSON.stringify(TEACHERS)));
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Create class" })).toBeEnabled();
    });
  });

  it("says to add a Teacher first when there is none", async () => {
    backend(on("GET", LIST, pageOf([])), on("GET", "/api/batches/teachers/", []));
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "New class" }));

    expect(
      await screen.findByText("Add a Teacher on the Employees page first."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create class" })).toBeDisabled();
  });

  it("closes with Escape", async () => {
    backend(on("GET", LIST, pageOf([])), on("GET", "/api/batches/teachers/", TEACHERS));
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "New class" }));
    expect(screen.getByLabelText("Name")).toHaveFocus();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Who's in a class", () => {
  async function openMorning() {
    await userEvent.click(
      await screen.findByRole("button", { name: "Who's in it: IELTS Morning" }),
    );
    return screen.findByRole("dialog", { name: "IELTS Morning" });
  }

  it("lists its Students with their attendance, linking each to their profile", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING])),
      on("GET", `/api/batches/${uid(1)}/`, MORNING_WITH_STUDENTS),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    expect(await within(dialog).findByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
    expect(within(dialog).getByText("Attended 92%")).toBeInTheDocument();
    expect(within(dialog).getByText("No classes yet")).toBeInTheDocument();
    expect(within(dialog).getByText("5 Oct 2026 to 4 Dec 2026")).toBeInTheDocument();
    // Editing the class is on its page, as in the prototype; the dialog only closes.
    expect(within(dialog).queryByRole("button", { name: "Edit class details" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("lists matches under the search, leaving out Lost Students and those already in", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING])),
      on("GET", `/api/batches/${uid(1)}/`, { ...MORNING, students: [RAM] }),
      on("GET", "/api/students/?q=S", {
        count: 3,
        page: 1,
        page_size: 25,
        results: [
          { ...SEARCH_RESULT, id: uid(7), name: "Sita Gurung" },
          { ...SEARCH_RESULT, id: uid(12), name: "Sita Lost", stage: "lost" },
          { ...SEARCH_RESULT, id: uid(8), name: "Ram Shrestha" },
        ],
      }),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();
    const search = await within(dialog).findByRole("searchbox", { name: "Find a Student" });

    // The search comes first, above the class's Students.
    const inClass = within(dialog).getByText("Ram Shrestha");
    expect(search.compareDocumentPosition(inClass) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(dialog).queryByLabelText("Student to add")).toBeNull();
    await userEvent.type(search, "S");

    expect(
      await within(dialog).findByRole("button", { name: "Add Sita Gurung to the class" }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Sita Lost/ })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /^Add Ram Shrestha/ })).toBeNull();
  });

  it("says when nobody matches", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING])),
      on("GET", `/api/batches/${uid(1)}/`, { ...MORNING, students: [] }),
      on("GET", "/api/students/?q=Zed", { count: 0, page: 1, page_size: 25, results: [] }),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    await userEvent.type(await within(dialog).findByLabelText("Find a Student"), "Zed");

    expect(await within(dialog).findByText("No Students match.")).toBeInTheDocument();
  });

  it("removes a Student and says so", async () => {
    let current: object = MORNING_WITH_STUDENTS;
    const fetchFn = backend(
      on("GET", LIST, pageOf([MORNING])),
      onEach("GET", `/api/batches/${uid(1)}/`, () => current),
      (path, init) => {
        if (init?.method !== "DELETE" || path !== `/api/batches/${uid(1)}/students/${uid(7)}/`)
          return undefined;
        current = { ...MORNING, student_count: 1, students: [RAM] };
        return new Response(null, { status: 204 });
      },
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Remove Sita Gurung from the class" }),
    );
    const confirm = screen.getByRole("dialog", { name: "Remove Sita Gurung from IELTS Morning?" });
    expect(confirm).toHaveTextContent("Their attendance so far stays in the class record.");
    await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Removed from the class")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `/api/batches/${uid(1)}/students/${uid(7)}/`)).toHaveLength(
      1,
    );
    await waitFor(() => {
      expect(within(dialog).queryByText("Sita Gurung")).not.toBeInTheDocument();
    });
  });

  it("removes nobody until the popup is confirmed", async () => {
    const fetchFn = backend(
      on("GET", LIST, pageOf([MORNING])),
      on("GET", `/api/batches/${uid(1)}/`, MORNING_WITH_STUDENTS),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Remove Sita Gurung from the class" }),
    );
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /^Remove Sita Gurung/ })).toBeNull();
    expect(within(dialog).getByText("Sita Gurung")).toBeVisible();
    expect(callsTo(fetchFn, "DELETE", `/api/batches/${uid(1)}/students/${uid(7)}/`)).toHaveLength(
      0,
    );
  });

  it("adds a Student found by name", async () => {
    const fetchFn = backend(
      on("GET", LIST, pageOf([MORNING])),
      on("GET", `/api/batches/${uid(1)}/`, { ...MORNING, students: [RAM] }),
      SEARCH_SITA,
      on("POST", `/api/batches/${uid(1)}/students/`, MORNING_WITH_STUDENTS, 201),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    await userEvent.type(await within(dialog).findByLabelText("Find a Student"), "Sita");
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Add Sita Gurung to the class" }),
    );

    expect(await screen.findByText("Sita Gurung added to IELTS Morning")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/batches/${uid(1)}/students/`)).toEqual({
      student: uid(7),
    });
  });

  it("clears the search once nobody else it found is left to add", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING])),
      onEach("GET", `/api/batches/${uid(1)}/`, () => ({ ...MORNING, students: [RAM] })),
      SEARCH_SITA,
      on("POST", `/api/batches/${uid(1)}/students/`, MORNING_WITH_STUDENTS, 201),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();
    const search = await within(dialog).findByRole("searchbox", { name: "Find a Student" });

    await userEvent.type(search, "Sita");
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Add Sita Gurung to the class" }),
    );

    await waitFor(() => {
      expect(search).toHaveValue("");
    });
    expect(search).toHaveFocus();
  });

  it("keeps the search while others it found can still be added", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING])),
      onEach("GET", `/api/batches/${uid(1)}/`, () => ({ ...MORNING, students: [RAM] })),
      on("GET", "/api/students/?q=Sita", {
        count: 2,
        page: 1,
        page_size: 25,
        results: [SEARCH_RESULT, { ...SEARCH_RESULT, id: uid(13), name: "Sita Rai" }],
      }),
      on("POST", `/api/batches/${uid(1)}/students/`, MORNING_WITH_STUDENTS, 201),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();
    const search = await within(dialog).findByRole("searchbox", { name: "Find a Student" });

    await userEvent.type(search, "Sita");
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Add Sita Gurung to the class" }),
    );

    expect(await screen.findByText("Sita Gurung added to IELTS Morning")).toBeInTheDocument();
    expect(search).toHaveValue("Sita");
    expect(
      within(dialog).queryByRole("button", { name: "Add Sita Gurung to the class" }),
    ).toBeNull();
    expect(
      within(dialog).getByRole("button", { name: "Add Sita Rai to the class" }),
    ).toBeInTheDocument();
  });

  it("shows why a Student couldn't be added", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING])),
      on("GET", `/api/batches/${uid(1)}/`, { ...MORNING, students: [RAM] }),
      SEARCH_SITA,
      on("POST", `/api/batches/${uid(1)}/students/`, { student: ["Already in this class."] }, 400),
    );
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    await userEvent.type(await within(dialog).findByLabelText("Find a Student"), "Sita");
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Add Sita Gurung to the class" }),
    );

    expect(await within(dialog).findByText("Already in this class.")).toBeInTheDocument();
  });

  it("says when the class couldn't load", async () => {
    backend(on("GET", LIST, pageOf([MORNING])), on("GET", `/api/batches/${uid(1)}/`, {}, 404));
    renderWith(<BatchesPage />);
    const dialog = await openMorning();

    expect(
      await within(dialog).findByText("We couldn't load this class. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("Enroll a Student", () => {
  it("puts a Student found by name in the chosen class", async () => {
    const fetchFn = backend(
      on("GET", LIST, pageOf([MORNING, JAPANESE, OLD])),
      SEARCH_SITA,
      on("POST", `/api/batches/${uid(2)}/students/`, { ...JAPANESE, students: [SITA] }, 201),
    );
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Enroll a Student" }));
    const dialog = screen.getByRole("dialog", { name: "Enroll a Student in a class" });

    await userEvent.type(within(dialog).getByLabelText("Find a Student"), "Sita");
    const student = within(dialog).getByLabelText("Student");
    await within(student).findByRole("option", { name: "Sita Gurung" });
    await userEvent.selectOptions(student, uid(7));
    const classes = within(dialog).getByLabelText("Class");
    // Finished classes aren't offered.
    expect(
      within(classes)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["IELTS Morning (7:00-8:30 AM)", "Japanese N5 Evening (5:30-7:00 PM)"]);
    await userEvent.selectOptions(classes, uid(2));
    await userEvent.click(within(dialog).getByRole("button", { name: "Enroll" }));

    expect(
      await screen.findByText("Sita Gurung enrolled in Japanese N5 Evening"),
    ).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/batches/${uid(2)}/students/`)).toEqual({
      student: uid(7),
    });
  });

  it("asks for a Student before enrolling", async () => {
    const fetchFn = backend(on("GET", LIST, pageOf([MORNING])));
    renderWith(<BatchesPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Enroll a Student" }));
    const dialog = screen.getByRole("dialog", { name: "Enroll a Student in a class" });

    await userEvent.click(within(dialog).getByRole("button", { name: "Enroll" }));

    expect(await within(dialog).findByText("Choose a Student from the list.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", `/api/batches/${uid(1)}/students/`)).toHaveLength(0);
  });
});

describe("Counsellor Home: Classes section", () => {
  const ENROLLED_PAGE = pageOf([
    {
      id: uid(7),
      name: "Sita Gurung",
      batches: [
        { id: uid(1), name: "IELTS Morning" },
        { id: uid(2), name: "Japanese N5 Evening" },
      ],
      attended_percent: null,
    },
    {
      id: uid(8),
      name: "Ram Shrestha",
      batches: [{ id: uid(1), name: "IELTS Morning" }],
      attended_percent: 92,
    },
  ]);

  it("shows a button per class that opens who is in it", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING, JAPANESE, OLD])),
      on("GET", ENROLLED, ENROLLED_PAGE),
      on("GET", `/api/batches/${uid(1)}/`, MORNING_WITH_STUDENTS),
    );
    renderWith(<ClassesSection />);

    const section = await screen.findByRole("region", { name: "Classes" });
    const tabs = within(section).getByRole("group", { name: "Show" });
    expect(await within(tabs).findByRole("button", { name: "Classes 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      await within(tabs).findByRole("button", { name: "Students and their classes 2" }),
    ).toBeInTheDocument();
    const button = within(section).getByRole("button", { name: /IELTS Morning/ });
    expect(button).toHaveTextContent("7:00-8:30 AM");
    expect(button).toHaveTextContent("2 Students");
    expect(within(section).getByRole("button", { name: /PTE Summer/ })).toBeInTheDocument();

    await userEvent.click(button);

    expect(await screen.findByRole("dialog", { name: "IELTS Morning" })).toBeInTheDocument();
  });

  it("switches to the Students and their classes", async () => {
    backend(
      on("GET", LIST, pageOf([MORNING, JAPANESE])),
      on("GET", ENROLLED, ENROLLED_PAGE),
      on("GET", `/api/batches/${uid(2)}/`, { ...JAPANESE, students: [SITA] }),
    );
    renderWith(<ClassesSection />);
    const section = await screen.findByRole("region", { name: "Classes" });

    await userEvent.click(
      await within(section).findByRole("button", { name: "Students and their classes 2" }),
    );

    const table = within(section).getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Student", "Classes", "Attended"]);
    expect(within(table).getByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
    expect(within(table).getByText("92%")).toBeInTheDocument();
    expect(within(table).getByText("—")).toBeInTheDocument();
    await userEvent.click(within(table).getByRole("button", { name: "Japanese N5 Evening" }));
    expect(await screen.findByRole("dialog", { name: "Japanese N5 Evening" })).toBeInTheDocument();
  });

  it("offers Enroll a Student and New class", async () => {
    backend(on("GET", LIST, pageOf([])), on("GET", ENROLLED, pageOf([])));
    renderWith(<ClassesSection />);
    const section = await screen.findByRole("region", { name: "Classes" });

    expect(within(section).getByRole("button", { name: "Enroll a Student" })).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "New class" })).toBeInTheDocument();
    expect(await within(section).findByText("No classes yet.")).toBeInTheDocument();
  });

  it.each([
    ["while classes are switched off", CLASSES_OFF],
    ["for Front Desk", DESK],
  ])("isn't shown %s", (_, context) => {
    const fetchFn = backend();
    renderWith(<HomePage />, context);

    expect(screen.queryByRole("region", { name: "Classes" })).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", LIST)).toHaveLength(0);
  });

  it("isn't shown for a Teacher, who gets their classes today instead", async () => {
    backend(on("GET", LIST, pageOf([asTeacher(MORNING)])));
    renderWith(<HomePage />, TEACHER);

    expect(await screen.findByRole("region", { name: "Your classes today" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Classes" })).not.toBeInTheDocument();
  });
});

describe("One class's page", () => {
  const ONE = `/api/batches/${uid(1)}/`;
  const TODAY = on("GET", `/api/batches/${uid(1)}/attendance/2026-11-02/`, {
    day: "2026-11-02",
    can_mark: false,
    marks: [
      { student: uid(8), mark: null },
      { student: uid(7), mark: null },
    ],
  });

  it("names the class with its time and teacher, and lists its Students", async () => {
    backend(on("GET", ONE, MORNING_WITH_STUDENTS), TODAY);
    renderWith(<BatchPage batchId={uid(1)} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "IELTS Morning" }),
    ).toBeInTheDocument();
    expect(screen.getByText("7:00-8:30 AM with Gita Lama")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All classes" })).toHaveAttribute("href", "/batches");
    expect(await screen.findByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
    expect(screen.getByText("Attended 92% of classes")).toBeInTheDocument();
    expect(screen.getByText("No classes yet")).toBeInTheDocument();
  });

  it("opens who is in it from Add Students", async () => {
    backend(on("GET", ONE, MORNING_WITH_STUDENTS));
    renderWith(<BatchPage batchId={uid(1)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Add Students" }));

    expect(await screen.findByRole("dialog", { name: "IELTS Morning" })).toBeInTheDocument();
  });

  it("opens the class form filled in, and saves the whole class", async () => {
    let current: object = MORNING_WITH_STUDENTS;
    const fetchFn = backend(
      onEach("GET", ONE, () => current),
      on("GET", "/api/batches/teachers/", TEACHERS),
      (path, init) => {
        if (init?.method !== "PUT" || path !== ONE) return undefined;
        current = { ...MORNING_WITH_STUDENTS, name: "IELTS Early" };
        return new Response(JSON.stringify(current));
      },
    );
    renderWith(<BatchPage batchId={uid(1)} />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit class details" }));
    const dialog = screen.getByRole("dialog", { name: "Edit class" });

    expect(within(dialog).getByLabelText("Name")).toHaveValue("IELTS Morning");
    expect(await within(dialog).findByLabelText("Teacher")).toHaveValue(uid(9));
    expect(within(dialog).getByLabelText("From")).toHaveDisplayValue("7:00 AM");
    expect(within(dialog).getByLabelText("To")).toHaveDisplayValue("8:30 AM");
    const ends = within(within(dialog).getByLabelText("To"));
    expect(ends.getByRole("option", { name: "7:30 AM" })).toBeInTheDocument();
    expect(ends.queryByRole("option", { name: "7:00 AM" })).toBeNull();
    await userEvent.clear(within(dialog).getByLabelText("Name"));
    await userEvent.type(within(dialog).getByLabelText("Name"), "IELTS Early");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Class saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", ONE)).toEqual({
      name: "IELTS Early",
      test_type: "ielts",
      teacher: uid(9),
      time_slot: "7:00-8:30 AM",
      starts_on: "2026-10-05",
      ends_on: "2026-12-04",
    });
    expect(
      await screen.findByRole("heading", { level: 1, name: "IELTS Early" }),
    ).toBeInTheDocument();
  });

  it("asks for the times again when the saved slot was typed in some other way", async () => {
    backend(
      on("GET", ONE, { ...MORNING_WITH_STUDENTS, time_slot: "Early mornings" }),
      on("GET", "/api/batches/teachers/", TEACHERS),
    );
    renderWith(<BatchPage batchId={uid(1)} />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit class details" }));
    const dialog = screen.getByRole("dialog", { name: "Edit class" });

    expect(
      within(dialog).getByText('It was "Early mornings". Choose the times again.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("From")).toHaveDisplayValue("7:00 AM");
  });

  it("shows a Teacher the Students by name only, with nothing to change", async () => {
    backend(on("GET", ONE, asTeacher(MORNING_WITH_STUDENTS)), TODAY);
    renderWith(<BatchPage batchId={uid(1)} />, TEACHER);

    expect(await screen.findByText("Sita Gurung")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sita Gurung" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add Students" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit class details" })).toBeNull();
  });

  it("says the class wasn't found, e.g. another Teacher's", async () => {
    backend(on("GET", ONE, { detail: "Not found." }, 404));
    renderWith(<BatchPage batchId={uid(1)} />, TEACHER);

    expect(await screen.findByText("Class not found.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All classes" })).toHaveAttribute("href", "/batches");
  });

  it("says when the class couldn't load", async () => {
    backend(on("GET", ONE, {}, 500));
    renderWith(<BatchPage batchId={uid(1)} />);

    expect(
      await screen.findByText("We couldn't load this class. Please try again."),
    ).toBeInTheDocument();
  });

  it.each([
    ["Front Desk", DESK],
    ["anyone, while classes are switched off", CLASSES_OFF],
  ])("isn't available to %s and asks the API nothing", (_, context) => {
    const fetchFn = backend();
    renderWith(<BatchPage batchId={uid(1)} />, context);

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
