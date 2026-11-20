import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";
import { fakeMatchMedia } from "@/test/matchMedia";
import { PROFILE } from "@/test/studentProfile";

import { EditDetailsRoute } from "./EditDetailsRoute";
import { uid } from "@/test/ids";

const router = { push: vi.fn(), replace: vi.fn(), back: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const COUNSELLOR: StaffContext = {
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

type Answer = (path: string, init?: RequestInit) => Response | undefined;

const method = (init?: RequestInit): string => init?.method ?? "GET";

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

const profile =
  (body: unknown = PROFILE): Answer =>
  (path, init) =>
    method(init) === "GET" && path === `/api/students/${uid(7)}/` ? jsonResponse(body) : undefined;

const saving =
  (body: unknown = PROFILE, status = 200): Answer =>
  (path, init) =>
    method(init) === "PUT" && path === `/api/students/${uid(7)}/details/`
      ? jsonResponse(body, status)
      : undefined;

const intakes =
  (months: string[]): Answer =>
  (path, init) =>
    method(init) === "GET" && path === "/api/catalogue/intakes/"
      ? jsonResponse({ intakes: months })
      : undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sentSave(fetchFn: ReturnType<typeof backend>): Record<string, unknown> {
  const [, init] = fetchFn.mock.calls.find(([, given]) => method(given) === "PUT") ?? [];
  const body = init?.body;
  const sent: unknown = typeof body === "string" ? JSON.parse(body) : null;
  if (!isRecord(sent)) throw new Error("nothing was saved");
  return sent;
}

function renderPage(context: StaffContext = COUNSELLOR, idText: string = uid(7)) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <EditDetailsRoute idText={idText} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function opened() {
  return screen.findByRole("heading", { level: 1, name: "Edit details: Sita Gurung" });
}

function menu(): HTMLElement {
  return screen.getByRole("navigation", { name: "Sections" });
}

/** Opens a section from the menu (one is shown at a time) and returns it. */
function section(name: string): HTMLElement {
  const item = within(menu()).getByRole("button", { name });
  if (item.getAttribute("aria-current") !== "true") fireEvent.click(item);
  return screen.getByRole("region", { name });
}

function atPhoneWidth(): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => query === PHONE_QUERY,
    ).matchMedia,
  );
}

function row(list: string, name: string): HTMLElement {
  return within(section(list)).getByRole("group", { name });
}

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  router.back.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Edit details", () => {
  it("shows every section with what is stored, and a menu of the sections", async () => {
    backend(profile());
    renderPage();
    await opened();

    expect(
      within(menu())
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
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
    expect(within(section("Personal")).getByLabelText("Full name")).toHaveValue("Sita Gurung");
    expect(within(section("Family")).getByLabelText(/Father's name/)).toHaveValue(
      "Hari Prasad Gurung",
    );
    expect(within(row("Academic history", "Qualification 1")).getByLabelText(/School/)).toHaveValue(
      "TU",
    );
    expect(within(row("Work experience", "Job 1")).getByLabelText("Employer")).toHaveValue(
      "Bir Hospital",
    );
    expect(within(row("Test scores", "Test score 1")).getByLabelText("Overall score")).toHaveValue(
      "6.5",
    );
    expect(screen.getByRole("link", { name: /Sita Gurung/ })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
  });

  it("saves every field and list in one go, then goes back to the Student", async () => {
    const fetchFn = backend(profile(), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.clear(within(section("Personal")).getByLabelText("Full name"));
    await user.type(within(section("Personal")).getByLabelText("Full name"), "Sita Karki");
    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(`/students/${uid(7)}`);
    });
    const sent = sentSave(fetchFn);
    expect(sent).toMatchObject({
      version: 3,
      name: "Sita Karki",
      father_name: "Hari Prasad Gurung",
      permanent_address: { province: "gandaki", ward: 6, street: "Lakeside" },
      mailing_same_as_permanent: true,
      academic_records: [
        {
          id: uid(1),
          level: "bachelor",
          institution: "TU",
          finished_year: 2024,
          result: "GPA 3.2",
        },
      ],
      test_scores: [
        {
          id: uid(3),
          test: "ielts",
          overall: "6.5",
          taken_on: "2026-09-14",
          details: "L 7, R 6.5",
        },
      ],
      work_experience: [
        {
          id: uid(2),
          employer: "Bir Hospital",
          job_title: "Staff nurse",
          started_on: "2024-04",
          ended_on: null,
        },
      ],
    });
    expect(sent).not.toHaveProperty("note");
    expect(await screen.findByText("All changes saved")).toBeInTheDocument();
  });

  it("chooses the preferred intake from the Catalogue's upcoming intakes, or Not decided", async () => {
    const fetchFn = backend(profile(), intakes(["2027-07", "2028-02"]), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();
    const field = within(section("Plans")).getByLabelText(/Preferred Intake/);

    await waitFor(() => {
      expect(
        within(field)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["Not decided", "Feb 2027", "Jul 2027", "Feb 2028"]);
    });
    // The intake already stored stays, even when the Catalogue no longer offers it.
    expect(field).toHaveValue("2027-02");
    await user.selectOptions(field, "2027-07");
    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(sentSave(fetchFn)).toMatchObject({ preferred_intake: "2027-07" });
    });
  });

  it("lets the preferred intake be Not decided", async () => {
    const fetchFn = backend(profile(), intakes([]), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.selectOptions(
      within(section("Plans")).getByLabelText(/Preferred Intake/),
      "Not decided",
    );
    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(sentSave(fetchFn)).toMatchObject({ preferred_intake: "" });
    });
  });

  it("adds, changes and removes list rows, and nothing is removed until Save", async () => {
    const fetchFn = backend(profile(), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.click(
      within(section("Academic history")).getByRole("button", { name: "Add a qualification" }),
    );
    const added = row("Academic history", "Qualification 2");
    await user.type(within(added).getByLabelText(/School/), "Budhanilkantha School");
    await user.clear(within(row("Work experience", "Job 1")).getByLabelText("Job title"));
    await user.type(within(row("Work experience", "Job 1")).getByLabelText("Job title"), "Nurse");
    const score = row("Test scores", "Test score 1");
    await user.click(within(score).getByRole("button", { name: "Remove" }));

    expect(within(score).getByText("Will be removed when you save.")).toBeInTheDocument();
    expect(within(score).getByLabelText("Overall score")).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(within(score).getByRole("button", { name: "Undo" }));
    expect(within(score).getByLabelText("Overall score")).toBeEnabled();
    await user.click(within(score).getByRole("button", { name: "Remove" }));
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "DELETE")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalled();
    });
    const sent = sentSave(fetchFn);
    expect(sent.academic_records).toEqual([
      { id: uid(1), level: "bachelor", institution: "TU", finished_year: 2024, result: "GPA 3.2" },
      {
        level: "plus_two",
        institution: "Budhanilkantha School",
        finished_year: null,
        result: "",
      },
    ]);
    expect(sent.test_scores).toEqual([]);
    expect(sent.work_experience).toEqual([
      {
        id: uid(2),
        employer: "Bir Hospital",
        job_title: "Nurse",
        started_on: "2024-04",
        ended_on: null,
      },
    ]);
  });

  it("a new row taken away again simply disappears", async () => {
    backend(profile());
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.click(within(section("Work experience")).getByRole("button", { name: "Add a job" }));
    await user.click(
      within(row("Work experience", "Job 2")).getByRole("button", { name: "Remove" }),
    );

    expect(within(section("Work experience")).queryByRole("group", { name: "Job 2" })).toBeNull();
  });

  it("shows refused fields and rows beside them and stays on the page", async () => {
    backend(
      profile(),
      saving(
        {
          passport_number: ["Enter 5 to 20 letters and numbers, without spaces."],
          academic_records: { "0": { institution: ["This field may not be blank."] } },
        },
        400,
      ),
    );
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    expect(
      await screen.findByText("Enter 5 to 20 letters and numbers, without spaces."),
    ).toBeInTheDocument();
    expect(within(section("Passport")).getByLabelText(/Passport number/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      within(row("Academic history", "Qualification 1")).getByText("This field may not be blank."),
    ).toBeInTheDocument();
    expect(screen.getByText("Some details need fixing. They're marked below.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("matches a refused row to the right row when an earlier one is being removed", async () => {
    backend(
      profile({
        ...PROFILE,
        academic_records: [
          ...PROFILE.academic_records,
          { id: uid(4), level: "see", institution: "BNKS", finished_year: 2018, result: "" },
        ],
      }),
      saving({ academic_records: { "0": { institution: ["Too long."] } } }, 400),
    );
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.click(
      within(row("Academic history", "Qualification 1")).getByRole("button", { name: "Remove" }),
    );
    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    expect(
      await within(row("Academic history", "Qualification 2")).findByText("Too long."),
    ).toBeInTheDocument();
  });

  it("keeps the mailing address as a flag, and sends a separate one once unticked", async () => {
    const fetchFn = backend(profile(), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();
    const addresses = section("Addresses");
    expect(within(addresses).queryByRole("group", { name: "Mailing address" })).toBeNull();

    await user.click(within(addresses).getByLabelText("The mailing address is the same"));
    const mailing = within(addresses).getByRole("group", { name: "Mailing address" });
    await user.type(within(mailing).getByLabelText(/District/), "Kathmandu");
    await user.type(within(mailing).getByLabelText(/Ward/), "4");
    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalled();
    });
    expect(sentSave(fetchFn)).toMatchObject({
      mailing_same_as_permanent: false,
      mailing_address: { province: "", district: "Kathmandu", ward: 4 },
    });
  });

  it("shows a refused address part under its own field", async () => {
    backend(
      profile(),
      saving(
        { permanent_address: { ward: ["A ward number is a whole number from 1 to 35."] } },
        400,
      ),
    );
    renderPage();
    await opened();

    await userEvent.setup().click(screen.getByRole("button", { name: "Save all changes" }));

    const ward = within(section("Addresses")).getByLabelText(/Ward/);
    expect(
      await within(section("Addresses")).findByText(
        "A ward number is a whole number from 1 to 35.",
      ),
    ).toBeInTheDocument();
    expect(ward).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for the Sub-agent's name only when they came through one", async () => {
    const fetchFn = backend(profile(), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();
    const plans = section("Plans");
    expect(within(plans).queryByLabelText(/Sub-agent/)).toBeNull();

    await user.selectOptions(within(plans).getByLabelText("How they found us"), "sub_agent");
    await user.type(within(plans).getByLabelText(/Sub-agent/), "Himal Edu Link");
    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalled();
    });
    expect(sentSave(fetchFn)).toMatchObject({
      source: "sub_agent",
      sub_agent_name: "Himal Edu Link",
    });
  });

  it("reports someone else's change instead of overwriting it", async () => {
    backend(
      profile(),
      saving({ detail: "Someone else just changed this Student. Refresh the page." }, 409),
    );
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    expect(
      await screen.findByText(
        "Someone else changed this Student while you were editing. Nothing here was saved: open Edit details again to see their changes.",
      ),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("goes straight back on Cancel when nothing was changed", async () => {
    backend(profile());
    renderPage();
    await opened();

    await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));

    expect(router.push).toHaveBeenCalledWith(`/students/${uid(7)}`);
  });

  it("asks before leaving with unsaved changes", async () => {
    backend(profile());
    renderPage();
    await opened();
    const user = userEvent.setup();
    await user.type(within(section("Contact")).getByLabelText(/Email/), "x");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    const dialog = screen.getByRole("dialog", { name: "Leave without saving?" });
    expect(within(dialog).getByText("Your changes on this page will be lost.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Keep editing" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Keep editing" }));
    expect(router.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Leave without saving" }));

    expect(router.push).toHaveBeenCalledWith(`/students/${uid(7)}`);
  });

  it("asks before following a link away with unsaved changes", async () => {
    backend(profile());
    renderPage();
    await opened();
    const user = userEvent.setup();
    await user.click(
      within(section("Test scores")).getByRole("button", { name: "Add a test score" }),
    );

    await user.click(screen.getByRole("link", { name: /Sita Gurung/ }));

    expect(screen.getByRole("dialog", { name: "Leave without saving?" })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Leave without saving" }));
    expect(router.push).toHaveBeenCalledWith(`/students/${uid(7)}`);
  });

  it("asks the browser to warn before closing or reloading with unsaved changes", async () => {
    backend(profile());
    renderPage();
    await opened();
    const clean = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(clean);
    });
    expect(clean.defaultPrevented).toBe(false);

    fireEvent.change(within(section("Contact")).getByLabelText(/Email/), {
      target: { value: "new@example.test" },
    });
    const dirty = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(dirty);
    });

    expect(dirty.defaultPrevented).toBe(true);
  });

  it("refuses someone who may not edit this Student's details", async () => {
    backend(profile({ ...PROFILE, can_edit_details: false }));
    renderPage();

    expect(
      await screen.findByText("Only Bikash Thapa or an Admin can change these details."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save all changes" })).toBeNull();
  });

  it("says who may when the Student has no counsellor", async () => {
    backend(profile({ ...PROFILE, can_edit_details: false, assigned_counsellor: null }));
    renderPage();

    expect(
      await screen.findByText(
        "Only the Student's counsellor or an Admin can change these details.",
      ),
    ).toBeInTheDocument();
  });

  it("is not for Teachers", async () => {
    backend(profile());
    renderPage({ ...COUNSELLOR, staff: { ...COUNSELLOR.staff, role: "teacher" } });

    expect(await screen.findByText(/isn't available/i)).toBeInTheDocument();
  });

  it.each(["abc", "7", "1;drop", uid(7).replaceAll("-", "")])(
    "finds nobody for an address that isn't a Student's UUID (%s), without asking the API",
    (idText) => {
      const fetchFn = backend();
      renderPage(COUNSELLOR, idText);

      expect(screen.getByRole("link", { name: "All Students" })).toBeInTheDocument();
      expect(fetchFn).not.toHaveBeenCalled();
    },
  );
});

describe("Edit details, one section at a time", () => {
  it("shows only the chosen section, starting with Personal", async () => {
    backend(profile());
    renderPage();
    await opened();

    expect(screen.getByRole("region", { name: "Personal" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Family" })).not.toBeInTheDocument();

    fireEvent.click(within(menu()).getByRole("button", { name: "Passport" }));

    expect(screen.getByRole("region", { name: "Passport" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Personal" })).not.toBeInTheDocument();
  });

  it("keeps typing and new rows across sections and saves them all at once", async () => {
    const fetchFn = backend(profile(), saving());
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.clear(within(section("Personal")).getByLabelText("Full name"));
    await user.type(within(section("Personal")).getByLabelText("Full name"), "Sita Karki");
    await user.clear(within(section("Family")).getByLabelText(/Father's name/));
    await user.type(within(section("Family")).getByLabelText(/Father's name/), "Ram Gurung");
    await user.click(within(section("Work experience")).getByRole("button", { name: /Add a job/ }));
    expect(within(section("Personal")).getByLabelText("Full name")).toHaveValue("Sita Karki");
    expect(within(section("Work experience")).getByRole("group", { name: "Job 2" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(`/students/${uid(7)}`);
    });
    const sent = sentSave(fetchFn);
    expect(sent).toMatchObject({ name: "Sita Karki", father_name: "Ram Gurung" });
    expect(sent.work_experience).toHaveLength(2);
  });

  it("opens the section with the problem when saving fails", async () => {
    backend(
      profile(),
      saving({ passport_number: ["Enter 5 to 20 letters and numbers, without spaces."] }, 400),
    );
    renderPage();
    await opened();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save all changes" }));

    const passport = await screen.findByRole("region", { name: "Passport" });
    expect(passport).toBeVisible();
    expect(within(menu()).getByRole("button", { name: "Passport" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await waitFor(() => {
      expect(within(passport).getByLabelText(/Passport number/)).toHaveFocus();
    });
    expect(screen.queryByRole("region", { name: "Personal" })).not.toBeInTheDocument();
  });

  it("starts at the list of sections at phone width, with the Save bar under it", async () => {
    atPhoneWidth();
    backend(profile());
    renderPage();
    await opened();

    expect(screen.queryByRole("region", { name: "Personal" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save all changes" })).toBeVisible();

    fireEvent.click(within(menu()).getByRole("button", { name: "Passport" }));

    expect(screen.getByRole("region", { name: "Passport" })).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Sections" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All sections" }));
    expect(menu()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save all changes" })).toBeVisible();
  });

  it("opens the failing section at phone width, even from the list", async () => {
    atPhoneWidth();
    backend(
      profile(),
      saving({ passport_number: ["Enter 5 to 20 letters and numbers, without spaces."] }, 400),
    );
    renderPage();
    await opened();

    fireEvent.click(screen.getByRole("button", { name: "Save all changes" }));

    expect(await screen.findByRole("region", { name: "Passport" })).toBeVisible();
    expect(screen.getByRole("button", { name: "All sections" })).toBeVisible();
  });
});
