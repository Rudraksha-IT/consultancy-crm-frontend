import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomePage } from "@/components/features/home/HomePage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { StudentClassSchema } from "@/lib/api/classes/attendance";
import { formatOtherCalendar } from "@/lib/dates";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";

import { BatchPage } from "./BatchPage";
import { ClassesToday } from "./ClassesToday";
import { StudentClasses } from "./StudentClasses";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const TEACHER: StaffContext = {
  staff: { id: 9, name: "Gita Lama", email: "gita@acme.test", role: "teacher" },
  consultancy: consultancySummary(),
  modules: ["students", "tasks", "batches"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const COUNSELLOR: StaffContext = {
  ...TEACHER,
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
};

const DESK: StaffContext = {
  ...TEACHER,
  staff: { id: 4, name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
};

const MORNING = {
  id: 1,
  name: "IELTS Morning",
  test_type: "ielts",
  teacher: { id: 9, name: "Gita Lama" },
  time_slot: "7:00-8:30 AM",
  starts_on: "2026-10-05",
  ends_on: "2026-12-04",
  timing: "running",
  student_count: 2,
  attendance_taken_today: false,
  can_change: false,
};

const SITA = { id: uid(7), name: "Sita Gurung", attended_percent: null };
const RAM = { id: uid(8), name: "Ram Shrestha", attended_percent: 92 };
const MORNING_WITH_STUDENTS = { ...MORNING, students: [RAM, SITA] };

const ONE = "/api/batches/1/";
const TODAY = "/api/batches/1/attendance/2026-11-02/";

function dayAnswer(marks: Record<number, string | null>, canMark = true, day = "2026-11-02") {
  return {
    day,
    can_mark: canMark,
    marks: [
      { student: uid(8), mark: marks[8] ?? null },
      { student: uid(7), mark: marks[7] ?? null },
    ],
  };
}

function renderWith(element: React.ReactNode, context: StaffContext = TEACHER) {
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

async function attendanceSection() {
  return within(await screen.findByRole("region", { name: "Attendance" }));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-02T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Taking attendance on a class's page", () => {
  it("opens on today, with the day in BS beside it and each Student's choices", async () => {
    backend(on("GET", ONE, MORNING_WITH_STUDENTS), on("GET", TODAY, dayAnswer({ 8: "late" })));
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();

    const dayField = section.getByLabelText("Day");
    expect(dayField).toHaveValue("2026-11-02");
    expect(dayField).toHaveAttribute("min", "2026-10-05");
    expect(dayField).toHaveAttribute("max", "2026-12-04");
    const bs = formatOtherCalendar("2026-11-02", "AD");
    expect(bs).not.toBeNull();
    expect(section.getByText(bs ?? "")).toBeInTheDocument();
    const ram = await section.findByRole("radiogroup", { name: "Attendance for Ram Shrestha" });
    expect(within(ram).getByRole("radio", { name: "Late" })).toBeChecked();
    expect(
      within(ram)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["present", "absent", "late", "leave"]);
    const sita = section.getByRole("radiogroup", { name: "Attendance for Sita Gurung" });
    expect(within(sita).queryByRole("radio", { checked: true })).toBeNull();
    expect(section.getByText("Attended 92% of classes")).toBeInTheDocument();
    expect(section.getByText("No classes yet")).toBeInTheDocument();
  });

  it("saves the marks chosen, says so and shows the new shares", async () => {
    let current: object = MORNING_WITH_STUDENTS;
    const fetchFn = backend(
      onEach("GET", ONE, () => current),
      on("GET", TODAY, dayAnswer({})),
      (path, init) => {
        if (init?.method !== "PUT" || path !== TODAY) return undefined;
        current = { ...MORNING_WITH_STUDENTS, students: [RAM, { ...SITA, attended_percent: 100 }] };
        return new Response(JSON.stringify(dayAnswer({ 7: "present", 8: "absent" })));
      },
    );
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();
    const ram = await section.findByRole("radiogroup", { name: "Attendance for Ram Shrestha" });
    const sita = section.getByRole("radiogroup", { name: "Attendance for Sita Gurung" });

    await userEvent.click(within(ram).getByRole("radio", { name: "Absent" }));
    await userEvent.click(within(sita).getByRole("radio", { name: "Present" }));
    await userEvent.click(section.getByRole("button", { name: "Save attendance" }));

    expect(await screen.findByText("Attendance saved for 2 Nov 2026")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", TODAY)).toEqual({
      // In the order they were marked: Ram first, then Sita.
      marks: [
        { student: uid(8), mark: "absent" },
        { student: uid(7), mark: "present" },
      ],
    });
    expect(await screen.findByText("Attended 100% of classes")).toBeInTheDocument();
  });

  it("marks everyone present in one go, to change the odd one before saving", async () => {
    backend(on("GET", ONE, MORNING_WITH_STUDENTS), on("GET", TODAY, dayAnswer({ 8: "late" })));
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();
    await section.findByRole("radiogroup", { name: "Attendance for Ram Shrestha" });

    await userEvent.click(section.getByRole("button", { name: "Everyone is present" }));

    const present = section.getAllByRole("radio", { name: "Present" });
    expect(present).toHaveLength(2);
    for (const radio of present) expect(radio).toBeChecked();
  });

  it("loads another day when the day is changed, and warns on a Saturday", async () => {
    const saturday = "/api/batches/1/attendance/2026-11-07/";
    const fetchFn = backend(
      on("GET", ONE, MORNING_WITH_STUDENTS),
      on("GET", TODAY, dayAnswer({})),
      on("GET", saturday, dayAnswer({ 7: "leave" }, true, "2026-11-07")),
    );
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();
    expect(section.queryByText("This is a Saturday. There's usually no class.")).toBeNull();

    const dayField = section.getByLabelText("Day");
    await userEvent.clear(dayField);
    await userEvent.type(dayField, "2026-11-07");

    expect(
      await section.findByText("This is a Saturday. There's usually no class."),
    ).toBeInTheDocument();
    const sita = await section.findByRole("radiogroup", { name: "Attendance for Sita Gurung" });
    await waitFor(() => {
      expect(within(sita).getByRole("radio", { name: "Leave" })).toBeChecked();
    });
    expect(callsTo(fetchFn, "GET", saturday)).toHaveLength(1);
  });

  it("shows a refused save next to the day", async () => {
    const refused = { marks: ["Mark only Students in this class, once each."] };
    backend(
      on("GET", ONE, MORNING_WITH_STUDENTS),
      on("GET", TODAY, dayAnswer({ 7: "present" })),
      on("PUT", TODAY, refused, 400),
    );
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();
    await section.findByRole("radiogroup", { name: "Attendance for Sita Gurung" });

    await userEvent.click(section.getByRole("button", { name: "Save attendance" }));

    expect(
      await section.findByText("Mark only Students in this class, once each."),
    ).toBeInTheDocument();
  });

  it("shows a Counsellor the marks as words, with nothing to change", async () => {
    backend(
      on("GET", ONE, MORNING_WITH_STUDENTS),
      on("GET", TODAY, dayAnswer({ 8: "late" }, false)),
    );
    renderWith(<BatchPage batchId={1} />, COUNSELLOR);
    const section = await attendanceSection();

    expect(await section.findByText("Late")).toBeInTheDocument();
    expect(section.getByText("Not marked")).toBeInTheDocument();
    expect(section.queryByRole("radio")).toBeNull();
    expect(section.queryByRole("button", { name: "Save attendance" })).toBeNull();
    expect(
      section.getByText("Only this class's teacher or an Admin can take attendance."),
    ).toBeInTheDocument();
    expect(section.getByRole("link", { name: "Sita Gurung" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
  });

  it("opens a class that hasn't started on its first day", async () => {
    const later = { ...MORNING_WITH_STUDENTS, starts_on: "2026-11-15", timing: "upcoming" };
    const first = "/api/batches/1/attendance/2026-11-15/";
    const fetchFn = backend(
      on("GET", ONE, later),
      on("GET", first, dayAnswer({}, true, "2026-11-15")),
    );
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();

    expect(section.getByLabelText("Day")).toHaveValue("2026-11-15");
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", first)).toHaveLength(1);
    });
  });

  it("says when nobody is in the class yet", async () => {
    backend(
      on("GET", ONE, { ...MORNING, student_count: 0, students: [] }),
      on("GET", TODAY, { day: "2026-11-02", can_mark: true, marks: [] }),
    );
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();

    expect(await section.findByText("Nobody in this class yet.")).toBeInTheDocument();
    expect(section.queryByRole("button", { name: "Save attendance" })).toBeNull();
  });

  it("says when the day couldn't load", async () => {
    backend(on("GET", ONE, MORNING_WITH_STUDENTS), on("GET", TODAY, {}, 500));
    renderWith(<BatchPage batchId={1} />);
    const section = await attendanceSection();

    expect(
      await section.findByText("We couldn't load this day's attendance. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("Teacher Home: your classes today", () => {
  const LIST = "/api/batches/?page=1";
  const UPCOMING = { ...MORNING, id: 2, name: "PTE Later", timing: "upcoming" };
  const TAKEN = { ...MORNING, id: 3, name: "IELTS Day", attendance_taken_today: true };

  async function todayRows() {
    backend(
      on("GET", LIST, { count: 3, page: 1, page_size: 25, results: [MORNING, UPCOMING, TAKEN] }),
    );
    renderWith(<ClassesToday />);
    const section = within(await screen.findByRole("region", { name: "Your classes today" }));
    return (await section.findAllByRole("listitem")).map((row) => within(row));
  }

  it("lists only the classes running today, by name, time and size", async () => {
    const [morning, taken, ...others] = await todayRows();

    expect(others).toEqual([]);
    expect(taken).toBeDefined();
    expect(morning?.getByRole("link", { name: "IELTS Morning" })).toHaveAttribute(
      "href",
      "/batches/1",
    );
    expect(morning?.getByText("7:00-8:30 AM")).toBeInTheDocument();
    expect(morning?.getByText("2 Students")).toBeInTheDocument();
    expect(screen.queryByText("PTE Later")).toBeNull();
  });

  it("offers Take attendance, or Attendance done and View once anyone is marked", async () => {
    const [morning, taken] = await todayRows();

    expect(morning?.getByRole("link", { name: "Take attendance IELTS Morning" })).toHaveAttribute(
      "href",
      "/batches/1",
    );
    expect(morning?.queryByText("Attendance done")).toBeNull();
    expect(taken?.getByText("Attendance done")).toBeInTheDocument();
    expect(taken?.getByRole("link", { name: "View IELTS Day" })).toHaveAttribute(
      "href",
      "/batches/3",
    );
  });

  it("says when there is no class today", async () => {
    backend(on("GET", LIST, { count: 1, page: 1, page_size: 25, results: [UPCOMING] }));
    renderWith(<ClassesToday />);

    expect(await screen.findByText("No classes today.")).toBeInTheDocument();
  });

  it("isn't on the Home while classes are switched off, and isn't asked for", () => {
    const fetchFn = backend();
    renderWith(<HomePage />, { ...TEACHER, modules: ["students", "tasks"] });

    expect(screen.queryByRole("region", { name: "Your classes today" })).toBeNull();
    expect(callsTo(fetchFn, "GET", LIST)).toHaveLength(0);
  });
});

describe("A Student's classes on their profile", () => {
  const CLASSES = [
    {
      id: 1,
      name: "IELTS Morning",
      time_slot: "7:00-8:30 AM",
      attended_percent: 67,
      recent_days: [
        { day: "2026-10-29", mark: "present" },
        { day: "2026-10-30", mark: "absent" },
        { day: "2026-11-01", mark: "late" },
        { day: "2026-11-02", mark: null },
      ],
    },
    { id: 2, name: "PTE Day", time_slot: "11 AM", attended_percent: null, recent_days: [] },
  ];

  it("shows each class with the share attended and its latest days in words", () => {
    renderWith(<StudentClasses classes={StudentClassSchema.array().parse(CLASSES)} />, COUNSELLOR);

    const rows = screen.getAllByRole("listitem");
    const morning = within(rows[0] ?? document.body);
    expect(morning.getByRole("link", { name: "IELTS Morning" })).toHaveAttribute(
      "href",
      "/batches/1",
    );
    expect(morning.getByText("67%")).toBeInTheDocument();
    expect(morning.getAllByText("classes attended")).toHaveLength(1);
    expect(
      morning.getByText("Last 4 class days: 1 present, 1 late, 1 absent, 1 not marked"),
    ).toBeInTheDocument();
    const pte = within(rows[1] ?? document.body);
    expect(pte.getByText("—")).toBeInTheDocument();
    expect(pte.getByText("No classes yet")).toBeInTheDocument();
  });

  it("names the classes without links for Front Desk, who can't open classes", () => {
    renderWith(<StudentClasses classes={StudentClassSchema.array().parse(CLASSES)} />, DESK);

    expect(screen.getByText("IELTS Morning")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "IELTS Morning" })).toBeNull();
  });
});
