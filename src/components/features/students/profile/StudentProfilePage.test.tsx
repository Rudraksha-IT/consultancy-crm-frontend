import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/test-helpers";
import { formatDateTime } from "@/lib/dates/display";
import { DEFAULT_THEME } from "@/lib/theme";
import { PROFILE } from "@/test/studentProfile";

import { StudentProfilePage } from "./StudentProfilePage";
import { consultancySummary } from "@/test/consultancy";

const COUNSELLOR: StaffContext = {
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function as(role: StaffContext["staff"]["role"], id = 9): StaffContext {
  return { ...COUNSELLOR, staff: { ...COUNSELLOR.staff, id, name: "Someone Else", role } };
}

const ENTRY = {
  id: 2,
  kind: "note_edited",
  at: "2026-10-22T13:48:00+05:45",
  by: { name: "Bikash Thapa", is_platform_admin: false },
  before: "Wanted Sydney.",
  after: "Wants Melbourne only.",
  detail: "",
};

type Answer = (path: string, init?: RequestInit) => Response | undefined;

function backend(...answers: Answer[]) {
  const fetchFn = vi.fn((path: string, init?: RequestInit) => {
    for (const answer of answers) {
      const response = answer(path, init);
      if (response !== undefined) return Promise.resolve(response);
    }
    return Promise.resolve(jsonResponse({}, 500));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

const method = (init?: RequestInit): string => init?.method ?? "GET";

const profile =
  (body: unknown = PROFILE, status = 200): Answer =>
  (path, init) =>
    method(init) === "GET" && path === "/api/students/7/" ? jsonResponse(body, status) : undefined;

const history =
  (results: unknown[] = [ENTRY], count = results.length): Answer =>
  (path, init) =>
    method(init) === "GET" && path.startsWith("/api/students/7/history/")
      ? jsonResponse({
          count,
          page: path.endsWith("page=2") ? 2 : 1,
          page_size: 50,
          results,
        })
      : undefined;

const VISIT = {
  id: 4,
  kind: "follow_up",
  purpose: "Bringing documents: Passport copy",
  at: "2026-10-23T10:15:00+05:45",
  recorded_by: { id: 4, name: "Ramesh KC" },
};

const visits =
  (results: unknown[] = [], count = results.length): Answer =>
  (path, init) =>
    method(init) === "GET" && path.startsWith("/api/students/7/visits/")
      ? jsonResponse({ count, page: path.endsWith("page=2") ? 2 : 1, page_size: 50, results })
      : undefined;

function on(verb: string, path: string, body: unknown, status = 200): Answer {
  return (calledPath, init) =>
    method(init) === verb && calledPath === path ? jsonResponse(body, status) : undefined;
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string): unknown {
  const call = fetchFn.mock.calls.find(([, init]) => method(init) === verb);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function renderPage(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={7} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

/** Render the page and open the Profile tab (Applications opens first). */
async function renderOnProfileTab(context: StaffContext = COUNSELLOR): Promise<void> {
  renderPage(context);
  await userEvent.click(await screen.findByRole("tab", { name: "Profile" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudentProfilePage", () => {
  it("shows the Student's name, contact line, Note and journey", async () => {
    backend(profile());
    await renderOnProfileTab();

    expect(await screen.findByRole("heading", { level: 1, name: "Sita Gurung" })).toBeVisible();
    expect(screen.getByRole("link", { name: /All Students/ })).toHaveAttribute("href", "/students");
    expect(screen.getAllByText("9841000001")).toHaveLength(2);
    const note = screen.getByRole("region", { name: "Note" });
    expect(within(note).getByText("Wants Melbourne only.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Counselling" })).toBeInTheDocument();
    expect(screen.getByText("Choose a course and apply")).toBeInTheDocument();
  });

  it("lets a long name and the contact line wrap instead of widening the page", async () => {
    backend(profile());
    renderPage();

    const name = await screen.findByRole("heading", { level: 1, name: "Sita Gurung" });
    expect(name).toHaveClass("wrap-anywhere");
    expect(name.parentElement).toHaveClass("min-w-0");
    expect(name.parentElement?.parentElement).toHaveClass("min-w-0");
    const counsellor = screen.getByText("Bikash Thapa", { selector: "span span" });
    const meta = counsellor.closest("span.inline-flex")?.parentElement;
    expect(meta).toHaveClass("flex-wrap");
    expect(counsellor.closest("span.inline-flex")).toHaveClass("min-w-0");
    expect(counsellor).toHaveClass("wrap-anywhere");
  });

  it("has the Applications, Documents, Tasks, Profile and Activity tabs, Applications open first", async () => {
    backend(profile());
    renderPage();

    const tabs = await screen.findByRole("tablist", { name: "Sections" });
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((tab) => tab.textContent),
    ).toEqual(["Applications 0", "Documents 1/8", "Tasks 0", "Profile", "Activity"]);
    expect(within(tabs).getByRole("tab", { name: /Applications/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the profile details", async () => {
    backend(profile());
    await renderOnProfileTab();

    await screen.findByRole("heading", { level: 1 });
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      "Note",
      "Personal",
      "Contact",
      "Family",
      "Passport",
      "Addresses",
      "Education",
      "Academic history",
      "Work experience",
      "Test scores",
      "Plans",
    ]);
    expect(screen.getByText(/12 Apr 2003/)).toBeInTheDocument();
    expect(screen.getByText("PA1234567")).toBeInTheDocument();
    expect(screen.getByText("Feb 2027")).toBeInTheDocument();
    expect(screen.getByText("Master of Business Analytics")).toBeInTheDocument();
    expect(screen.getByText("Referral")).toBeInTheDocument();
    expect(screen.getByText("TU")).toBeInTheDocument();
    expect(screen.getByText(/GPA 3\.2/)).toBeInTheDocument();
    expect(screen.getByText("IELTS 6.5")).toBeInTheDocument();
  });

  it("tells a Teacher the page isn't for them, without asking the API", () => {
    const fetchFn = backend(profile());
    renderPage(as("teacher"));

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says when the Student doesn't exist", async () => {
    backend(profile({ detail: "Not found." }, 404));
    renderPage();

    expect(await screen.findByText("We couldn't find this Student.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All Students" })).toHaveAttribute("href", "/students");
  });

  it("says when the profile couldn't load", async () => {
    backend(profile({}, 500));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load this Student. Please refresh the page.",
    );
  });

  describe("when the Staff member can't change the Student", () => {
    const viewOnly = {
      ...PROFILE,
      can_change: false,
      can_edit_details: false,
      can_set_stage: false,
      can_transfer: false,
    };

    it("explains why and offers no changes", async () => {
      backend(profile(viewOnly));
      renderPage(as("counsellor"));

      expect(
        await screen.findByText(
          "View only. Bikash Thapa is this Student's counsellor. Only they or an Admin can make changes.",
        ),
      ).toBeInTheDocument();
      const note = screen.getByRole("region", { name: "Note" });
      expect(within(note).queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /More/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add a qualification/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add a test score/ })).not.toBeInTheDocument();
    });

    it("tells Front Desk they change only unassigned Leads", async () => {
      backend(profile(viewOnly));
      renderPage(as("front_desk"));

      expect(
        await screen.findByText("View only. Front Desk can change only Leads with no counsellor."),
      ).toBeInTheDocument();
    });
  });

  describe("the Note", () => {
    it("is edited in place and saved, and says the old text is kept", async () => {
      const fetchFn = backend(
        profile(),
        on("PUT", "/api/students/7/note/", { ...PROFILE, note: "Wants Sydney now." }),
      );
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      const box = within(note).getByRole("textbox", { name: /^Note/ });
      expect(box).toHaveValue("Wants Melbourne only.");
      expect(box).toHaveFocus();
      expect(within(note).getByText("The old text stays in Activity.")).toBeInTheDocument();
      await userEvent.clear(box);
      await userEvent.type(box, "Wants Sydney now.");
      await userEvent.click(within(note).getByRole("button", { name: "Save note" }));

      expect(await screen.findByText("Note saved")).toBeInTheDocument();
      expect(sentBody(fetchFn, "PUT")).toEqual({ note: "Wants Sydney now." });
      expect(within(note).getByText("Wants Sydney now.")).toBeInTheDocument();
      expect(within(note).queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("offers to add a note when there is none", async () => {
      backend(profile({ ...PROFILE, note: "" }));
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      expect(within(note).getByText("Nothing written yet.")).toBeInTheDocument();
      expect(within(note).getByRole("button", { name: "Add a note" })).toBeInTheDocument();
    });

    it("can be cancelled without saving", async () => {
      const fetchFn = backend(profile());
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      await userEvent.type(within(note).getByRole("textbox"), " Extra");
      await userEvent.click(within(note).getByRole("button", { name: "Cancel" }));

      expect(within(note).getByText("Wants Melbourne only.")).toBeInTheDocument();
      expect(fetchFn.mock.calls.some(([, init]) => method(init) === "PUT")).toBe(false);
    });

    it("saves on Ctrl + Enter, with Enter making a new line", async () => {
      const fetchFn = backend(
        profile(),
        on("PUT", "/api/students/7/note/", { ...PROFILE, note: "Wants Sydney.\nIELTS 7." }),
      );
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      const box = within(note).getByRole("textbox", { name: /^Note/ });
      await userEvent.clear(box);
      await userEvent.type(box, "Wants Sydney.{Enter}IELTS 7.{Control>}{Enter}{/Control}");

      expect(await screen.findByText("Note saved")).toBeInTheDocument();
      expect(sentBody(fetchFn, "PUT")).toEqual({ note: "Wants Sydney.\nIELTS 7." });
    });

    it("cancels on Escape without saving", async () => {
      const fetchFn = backend(profile());
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      await userEvent.type(within(note).getByRole("textbox"), " Extra{Escape}");

      expect(within(note).queryByRole("textbox")).not.toBeInTheDocument();
      expect(within(note).getByText("Wants Melbourne only.")).toBeInTheDocument();
      expect(fetchFn.mock.calls.some(([, init]) => method(init) === "PUT")).toBe(false);
    });

    it("shows the keys beside Save, and the box is described by them", async () => {
      backend(profile());
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));

      const hint = "Ctrl + Enter to save, Escape to cancel";
      expect(within(note).getByText(hint)).toBeInTheDocument();
      expect(within(note).getByRole("textbox")).toHaveAccessibleDescription(hint);
    });

    it("shows why a Note was refused", async () => {
      backend(profile(), on("PUT", "/api/students/7/note/", { note: ["Too long."] }, 400));
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      await userEvent.click(within(note).getByRole("button", { name: "Save note" }));

      expect(await within(note).findByText("Too long.")).toBeInTheDocument();
    });

    it("says when the change is no longer allowed", async () => {
      backend(profile(), on("PUT", "/api/students/7/note/", { detail: "Not your Student." }, 403));
      renderPage();
      const note = await screen.findByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      await userEvent.click(within(note).getByRole("button", { name: "Save note" }));

      expect(await within(note).findByRole("alert")).toHaveTextContent(
        "You can't change this Student any more. Refresh the page to see why.",
      );
    });
  });

  describe("Edit details", () => {
    it("opens the Edit details page from More", async () => {
      backend(profile());
      renderPage();

      await userEvent.click(await screen.findByRole("button", { name: /More/ }));

      expect(screen.getByRole("menuitem", { name: "Edit details" })).toHaveAttribute(
        "href",
        "/students/7/edit",
      );
    });

    it("offers it at the top of the Profile tab", async () => {
      backend(profile());
      await renderOnProfileTab();

      expect(await screen.findByRole("link", { name: "Edit details" })).toHaveAttribute(
        "href",
        "/students/7/edit",
      );
    });

    it("is offered only to someone who may edit the details", async () => {
      backend(profile({ ...PROFILE, can_edit_details: false }));
      await renderOnProfileTab();

      await screen.findByRole("region", { name: "Academic history" });
      expect(screen.queryByRole("link", { name: "Edit details" })).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: /More/ }));
      expect(screen.queryByRole("menuitem", { name: "Edit details" })).toBeNull();
    });
  });

  describe("the lists on the Profile tab", () => {
    it("shows qualifications and test scores with nothing to change them", async () => {
      backend(profile());
      await renderOnProfileTab();

      expect(await screen.findByText("TU")).toBeInTheDocument();
      expect(screen.getByText("IELTS 6.5")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^(Change|Remove) / })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Add a / })).toBeNull();
    });

    it("says when there are none", async () => {
      backend(profile({ ...PROFILE, academic_records: [], test_scores: [] }));
      await renderOnProfileTab();

      expect(await screen.findByText("No English tests added yet.")).toBeInTheDocument();
    });

    it("shows a Sub-agent's name and dashes for details not given", async () => {
      backend(
        profile({
          ...PROFILE,
          source: "sub_agent",
          sub_agent_name: "Himal Edu Link",
          date_of_birth: null,
          preferred_intake: "",
          other_countries: [],
        }),
      );
      await renderOnProfileTab();

      expect(await screen.findByText("Sub-agent, Himal Edu Link")).toBeInTheDocument();
      const dateOfBirth = screen.getByText("Date of birth").nextElementSibling;
      expect(dateOfBirth).toHaveTextContent("—");
    });
  });

  describe("when the office shows dates in BS", () => {
    it("writes the profile's dates in BS, but keeps the Intake in AD", async () => {
      backend(profile({ ...PROFILE, date_of_birth: "2005-06-14" }));
      await renderOnProfileTab({ ...COUNSELLOR, dateDisplay: "BS" });

      const dateOfBirth = (await screen.findByText("Date of birth")).nextElementSibling;
      expect(dateOfBirth).toHaveTextContent("32 Jestha 2062");
      expect(screen.getByText("First visit").nextElementSibling).toHaveTextContent(
        "15 Ashwin 2083",
      );
      expect(screen.getByText("Taken 29 Bhadra 2083")).toBeInTheDocument();
      // Intakes always stay in AD, as universities publish them.
      expect(screen.getByText("Preferred Intake").nextElementSibling).toHaveTextContent("Feb 2027");
    });
  });

  describe("the Activity tab", () => {
    it("shows each change with who made it, when, and the earlier text", async () => {
      backend(profile(), visits(), history());
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

      const timeline = await screen.findByRole("list", { name: "Activity" });
      expect(within(timeline).getByText("Note edited")).toBeInTheDocument();
      expect(within(timeline).getByText(/^Bikash Thapa, 22 Oct 2026/)).toBeInTheDocument();
      expect(within(timeline).getByText("Before: Wanted Sydney.")).toBeInTheDocument();
    });

    it("puts Visits among the changes, newest first", async () => {
      const first = {
        ...VISIT,
        id: 3,
        kind: "new",
        purpose: "First visit",
        at: "2026-10-20T09:00:00+05:45",
      };
      backend(profile(), visits([VISIT, first]), history());
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

      const timeline = await screen.findByRole("list", { name: "Activity" });
      const titles = within(timeline)
        .getAllByRole("listitem")
        .filter((item) => item.dataset.kind === "event")
        .map((item) => item.firstElementChild?.textContent);
      expect(titles).toEqual([
        "Visited the office: Bringing documents: Passport copy",
        "Note edited",
        "First visit: First visit",
      ]);
      expect(within(timeline).getByText(/^Ramesh KC, 23 Oct 2026/)).toBeInTheDocument();
      expect(
        screen.getByText("Stage changes, visits and other changes, recorded automatically"),
      ).toBeInTheDocument();
    });

    it("says the Activity couldn't load when the Visits fail", async () => {
      backend(profile(), history(), (path) =>
        path.startsWith("/api/students/7/visits/") ? jsonResponse({}, 500) : undefined,
      );
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the Activity.");
    });

    it("marks a change a Platform Admin made", async () => {
      backend(
        profile(),
        visits(),
        history([{ ...ENTRY, by: { name: "Ramesh", is_platform_admin: true } }]),
      );
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

      expect(await screen.findByText(/^Ramesh \(Platform Admin\), /)).toBeInTheDocument();
    });

    it("loads older changes on request", async () => {
      const fetchFn = backend(profile(), visits(), history([ENTRY], 51));
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));
      await userEvent.click(await screen.findByRole("button", { name: "Show older changes" }));

      await waitFor(() => {
        expect(screen.getAllByText("Note edited")).toHaveLength(2);
      });
      expect(fetchFn).toHaveBeenCalledWith("/api/students/7/history/?page=2", expect.anything());
    });

    it("says when older changes couldn't load", async () => {
      backend(profile(), visits(), (path, init) => {
        if (path.endsWith("page=2")) return jsonResponse({}, 500);
        return history([ENTRY], 51)(path, init);
      });
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));
      await userEvent.click(await screen.findByRole("button", { name: "Show older changes" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the Activity.");
    });

    it("says when the Activity couldn't load", async () => {
      backend(profile(), (path) =>
        path.startsWith("/api/students/7/history/") ? jsonResponse({}, 500) : undefined,
      );
      renderPage();

      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the Activity.");
    });

    describe("as a timeline of Stages (issue 82)", () => {
      const NOW = new Date("2026-11-15T10:00:00+05:45");
      const stageChange = (id: number, at: string, before: string, after: string, detail = "") => ({
        id,
        kind: "stage_changed",
        at,
        by: { name: "Bikash Thapa", is_platform_admin: false },
        before,
        after,
        detail,
      });
      const TO_COUNSELLING = stageChange(11, "2026-10-04T10:00:00+05:45", "lead", "counselling");
      const TO_LOST = stageChange(
        12,
        "2026-10-16T10:00:00+05:45",
        "counselling",
        "lost",
        "Went quiet.",
      );
      const BACK = stageChange(13, "2026-11-06T10:00:00+05:45", "lost", "counselling");
      const WAS_LOST = { ...PROFILE, stage_changes: [TO_COUNSELLING, TO_LOST, BACK] };

      beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("shows each Stage change as a dot, the time spent between them and the total", async () => {
        // History also lists the Stage changes; the timeline takes them from the profile, once.
        backend(profile(WAS_LOST), visits(), history([ENTRY, BACK, TO_LOST, TO_COUNSELLING]));
        renderPage();

        await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

        const timeline = await screen.findByRole("list", { name: "Activity" });
        const rows = within(timeline)
          .getAllByRole("listitem")
          .map((row) => row.textContent);
        expect(rows).toEqual([
          "In Counselling for 9 days so far",
          expect.stringMatching(/^Lost → to\s+Counselling\s*Came back\s*Bikash Thapa, 6 Nov 2026/),
          "3 weeks in Lost",
          expect.stringMatching(/^Note edited/),
          expect.stringMatching(/^Counselling → to\s+Lost\s*Marked LostWent quiet\.Bikash Thapa/),
          "12 days in Counselling",
          expect.stringMatching(/^Lead → to\s+Counselling\s*Bikash Thapa, 4 Oct 2026/),
          "3 days in Lead",
          expect.stringMatching(/^Became a Lead\s*1 Oct 2026/),
        ]);
        expect(screen.getByText(/since they became a Lead$/)).toHaveTextContent(
          "6 weeks since they became a Lead",
        );
      });

      it("colours Lost and Came back, each with its word", async () => {
        backend(profile(WAS_LOST), visits(), history([]));
        renderPage();

        await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

        const timeline = await screen.findByRole("list", { name: "Activity" });
        const lost = within(timeline).getByText("Marked Lost").closest("li");
        const back = within(timeline).getByText("Came back").closest("li");
        expect(lost).toHaveAttribute("data-tone", "lost");
        expect(back).toHaveAttribute("data-tone", "back");
      });

      it("shows a Student who never changed Stage as a Lead until now", async () => {
        backend(profile(), visits(), history([]));
        renderPage();

        await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

        const timeline = await screen.findByRole("list", { name: "Activity" });
        expect(within(timeline).getByText("In Lead for 6 weeks so far")).toBeInTheDocument();
        expect(within(timeline).getByText("Became a Lead")).toBeInTheDocument();
      });

      it("offers the ⓘ beside the Stage only for a Student who was ever Lost", async () => {
        backend(profile(WAS_LOST), visits(), history());
        renderPage();

        const info = await screen.findByRole("button", { name: "When they were Lost" });
        expect(info).toHaveAccessibleDescription(
          "Lost on 16 Oct 2026: Went quiet. Came back on 6 Nov 2026.",
        );
        expect(screen.getByText("Lost before")).toBeInTheDocument();
      });

      it("has no ⓘ for a Student who was never Lost", async () => {
        backend(profile({ ...PROFILE, stage_changes: [TO_COUNSELLING] }), visits(), history());
        renderPage();

        await screen.findByRole("list", { name: "Stage: Counselling" });
        expect(screen.queryByRole("button", { name: "When they were Lost" })).toBeNull();
      });
    });

    it("shows a Note change straight after it is saved", async () => {
      const fetchFn = backend(
        profile(),
        on("PUT", "/api/students/7/note/", { ...PROFILE, note: "New." }),
        visits(),
        history(),
      );
      renderPage();
      await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));
      await screen.findByRole("list", { name: "Activity" });
      const note = screen.getByRole("region", { name: "Note" });

      await userEvent.click(within(note).getByRole("button", { name: "Edit" }));
      await userEvent.click(within(note).getByRole("button", { name: "Save note" }));

      await waitFor(() => {
        const historyCalls = fetchFn.mock.calls.filter(([path]) => path.includes("/history/"));
        expect(historyCalls).toHaveLength(2);
      });
    });
  });
});

describe("StudentProfilePage: Classes tab", () => {
  const WITH_CLASSES: StaffContext = { ...COUNSELLOR, modules: ["students", "batches"] };
  const CLASSES = "/api/students/7/batches/";
  const MORNING = {
    id: 1,
    name: "IELTS Morning",
    time_slot: "7:00-8:30 AM",
    attended_percent: 75,
    recent_days: [{ day: "2026-11-01", mark: "present" }],
  };

  it("shows the Student's classes and their attendance while classes are on", async () => {
    backend(profile(), on("GET", CLASSES, [MORNING]));
    renderPage(WITH_CLASSES);

    await userEvent.click(await screen.findByRole("tab", { name: /Classes/ }));

    expect(await screen.findByRole("link", { name: "IELTS Morning" })).toHaveAttribute(
      "href",
      "/batches/1",
    );
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Last class day: 1 present")).toBeInTheDocument();
  });

  it("has no Classes tab for a Student in no class", async () => {
    const fetchFn = backend(profile(), on("GET", CLASSES, []));
    renderPage(WITH_CLASSES);

    expect(await screen.findByRole("tab", { name: "Profile" })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchFn.mock.calls.some(([path]) => path === CLASSES)).toBe(true);
    });
    expect(screen.queryByRole("tab", { name: /Classes/ })).toBeNull();
  });

  it("asks nothing about classes while they're switched off", async () => {
    const fetchFn = backend(profile(), on("GET", CLASSES, [MORNING]));
    renderPage();

    expect(await screen.findByRole("tab", { name: "Profile" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Classes/ })).toBeNull();
    expect(fetchFn.mock.calls.some(([path]) => path === CLASSES)).toBe(false);
  });
});

describe("StudentProfilePage: who did each action, in Activity (issue 83)", () => {
  const FIRST = "2026-11-18T08:45:00+00:00";
  const LATER = "2026-11-20T04:15:00+00:00";
  const entry = (id: number, kind: string, before: string, after: string, detail = "") => ({
    ...ENTRY,
    id,
    kind,
    at: `2026-11-1${String(id % 10)}T10:00:00+05:45`,
    before,
    after,
    detail,
  });

  async function openActivity(results: unknown[]): Promise<void> {
    backend(profile(), visits(), history(results));
    renderPage();
    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));
  }

  it("names the University and both Statuses of an Application or Visa", async () => {
    await openActivity([
      entry(2, "visa_status_changed", "applied", "granted", "Deakin University"),
      entry(1, "application_status_changed", "applied", "rejected", "Monash University"),
    ]);

    expect(
      await screen.findByText("Deakin University visa: Applied → Granted"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Monash University application: Applied → Rejected"),
    ).toBeInTheDocument();
  });

  it("says which Document was checked, with the reason when rejected", async () => {
    await openActivity([
      entry(2, "document_rejected", "", "Bank statement", "Only 3 months shown."),
      entry(1, "document_verified", "", "Passport"),
    ]);

    expect(await screen.findByText("Bank statement rejected")).toBeInTheDocument();
    expect(screen.getByText("Only 3 months shown.")).toBeInTheDocument();
    expect(screen.getByText("Passport checked and correct")).toBeInTheDocument();
  });

  it("names the Task that was done", async () => {
    await openActivity([entry(1, "task_done", "", "Collect bank statement")]);

    expect(await screen.findByText("Task done: Collect bank statement")).toBeInTheDocument();
  });

  it("says when a Visa date was booked, moved or removed, in the office's calendar", async () => {
    await openActivity([
      entry(3, "visa_date_changed", LATER, "", "interview"),
      entry(2, "visa_date_changed", FIRST, LATER, "medical"),
      entry(1, "visa_date_changed", "", FIRST, "biometrics"),
    ]);

    const first = formatDateTime(FIRST, "AD");
    const later = formatDateTime(LATER, "AD");
    expect(await screen.findByText(`Biometrics booked for ${first}`)).toBeInTheDocument();
    expect(screen.getByText(`Medical moved from ${first} to ${later}`)).toBeInTheDocument();
    expect(screen.getByText(`Interview date removed (was ${later})`)).toBeInTheDocument();
  });

  it("shows who did it, marking a Platform Admin", async () => {
    await openActivity([
      {
        ...entry(1, "task_done", "", "Collect bank statement"),
        by: { name: "Ramesh", is_platform_admin: true },
      },
    ]);

    expect(await screen.findByText(/^Ramesh \(Platform Admin\), /)).toBeInTheDocument();
  });

  it("shows injection-shaped text as plain text", async () => {
    await openActivity([entry(1, "task_done", "", "<img src=x onerror=alert(1)>")]);

    expect(await screen.findByText("Task done: <img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });
});
