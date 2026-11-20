import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";

import { UniversitiesSettings } from "./UniversitiesSettings";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["catalogue"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const MIT = {
  id: 11,
  university_id: 1,
  name: "Master of Information Technology",
  level: "master",
  intakes: ["2027-03", "2027-07"],
  archived: false,
  documents: [{ id: 21, name: "Work Reference" }],
  applications: 0,
  files: [],
  file_count: 0,
};
const OLD_COURSE = {
  ...MIT,
  id: 12,
  name: "Old diploma",
  level: "diploma",
  archived: true,
  documents: [],
};
const DEAKIN = {
  id: 1,
  name: "Deakin University",
  country: "australia",
  archived: false,
  courses: [MIT],
};
const KAPLAN = {
  id: 2,
  name: "Kaplan Business School",
  country: "australia",
  archived: true,
  courses: [],
};
const TYPES = [
  { id: 21, name: "Work Reference", needed_by_everyone: false, usual_group: "applying" },
  { id: 22, name: "Passport", needed_by_everyone: true, usual_group: "applying" },
  { id: 23, name: "Statement of Purpose", needed_by_everyone: false, usual_group: "statements" },
];

const LIST = "GET /api/catalogue/universities/";
const LIST_ARCHIVED = "GET /api/catalogue/universities/?include_archived=true";
const COURSE_URL = "PATCH /api/catalogue/courses/11/";

function pageOf(results: unknown[], count = results.length) {
  return { count, page: 1, page_size: 25, results };
}

type Route = Record<string, Response | (() => Response)>;

function backend(routes: Route) {
  const fetchFn = vi.fn((path: string, init?: RequestInit) =>
    Promise.resolve(answerTo(routes, `${init?.method ?? "GET"} ${path}`)),
  );
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function answerTo(routes: Route, key: string): Response {
  const answer = routes[key];
  const response = typeof answer === "function" ? answer() : answer;
  return response?.clone() ?? jsonResponse({}, 500);
}

function listing(extra: Route = {}) {
  return backend({ [LIST]: jsonResponse(pageOf([DEAKIN])), ...extra });
}

function sentBody(fetchFn: ReturnType<typeof backend>, key: string): unknown {
  const call = fetchFn.mock.calls.find(
    ([path, init]) => `${init?.method ?? "GET"} ${path}` === key,
  );
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function calls(fetchFn: ReturnType<typeof backend>, key: string): number {
  return fetchFn.mock.calls.filter(([path, init]) => `${init?.method ?? "GET"} ${path}` === key)
    .length;
}

function renderPage(context: StaffContext = ADMIN) {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <UniversitiesSettings />
      </ToastProvider>
    </StaffContextContext>,
  );
}

/** A University's card, found by its name. */
async function cardFor(name: string): Promise<HTMLElement> {
  return screen.findByRole("region", { name: new RegExp(`^${name}`) });
}

function courseRow(card: HTMLElement, name: string): HTMLElement {
  const header = within(card).getByRole("heading", { level: 3, name: new RegExp(`^${name}`) });
  const row = header.closest("li");
  if (row === null) throw new Error(`No row for ${name}`);
  return row;
}

beforeEach(() => {
  // 16 Nov 2026: months before November 2026 have gone by.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 16));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("UniversitiesSettings", () => {
  it("shows each university as a card with every course as a stacked row, never folded", async () => {
    listing();
    renderPage();

    const deakin = await cardFor("Deakin University");
    expect(
      within(deakin).getByText("Australia · Documents follow Australia's list in Configuration"),
    ).toBeInTheDocument();
    expect(within(deakin).queryByRole("table")).toBeNull();
    const mit = courseRow(deakin, "Master of Information Technology");
    expect(
      within(mit)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["Intakes", "Required documents", "Course Files"]);
    expect(within(mit).getByText("Master")).toBeInTheDocument();
    expect(within(mit).getByText("Mar 2027")).toBeInTheDocument();
    expect(within(mit).getByText("Jul 2027")).toBeInTheDocument();
    expect(within(mit).getByText("Work Reference")).toBeInTheDocument();
    expect(screen.getByText("1 university")).toBeInTheDocument();
  });

  it("says when a course asks only for the country's list", async () => {
    listing({
      [LIST]: jsonResponse(pageOf([{ ...DEAKIN, courses: [{ ...MIT, documents: [] }] }])),
    });
    renderPage();

    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    expect(within(mit).getByText("Only the country's list")).toBeInTheDocument();
  });

  it("has only Edit on a card, opening the university's edit page", async () => {
    listing();
    renderPage();

    const deakin = await cardFor("Deakin University");

    expect(
      within(deakin).getByRole("link", { name: "Edit Deakin University and its courses" }),
    ).toHaveAttribute("href", "/configuration/universities/1/edit");
    expect(within(deakin).queryByRole("button", { name: /Archive/ })).toBeNull();
  });

  it("says when there are no universities yet", async () => {
    backend({ [LIST]: jsonResponse(pageOf([])) });
    renderPage();

    expect(
      await screen.findByText(
        "No universities yet. Add the first one counsellors can choose from.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the Catalogue can't be loaded", async () => {
    backend({ [LIST]: jsonResponse({ detail: "boom" }, 500) });
    renderPage();

    expect(
      await screen.findByText("We couldn't load the Catalogue. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("refuses an answer that isn't the expected shape", async () => {
    backend({ [LIST]: jsonResponse(pageOf([{ ...DEAKIN, country: "<script>" }])) });
    renderPage();

    expect(
      await screen.findByText("We couldn't load the Catalogue. Please refresh the page."),
    ).toBeInTheDocument();
  });

  it("shows archived universities and courses, marked Archived, with no intake changes", async () => {
    listing({
      [LIST_ARCHIVED]: jsonResponse(pageOf([{ ...DEAKIN, courses: [MIT, OLD_COURSE] }, KAPLAN])),
    });
    renderPage();
    await cardFor("Deakin University");

    await userEvent.click(screen.getByRole("switch", { name: "Show archived" }));

    const kaplan = await cardFor("Kaplan Business School");
    expect(within(kaplan).getByText("Archived")).toBeInTheDocument();
    expect(within(kaplan).queryByRole("button", { name: /Add a course/ })).toBeNull();
    const old = courseRow(await cardFor("Deakin University"), "Old diploma");
    expect(within(old).getByText("Archived")).toBeInTheDocument();
    expect(within(old).queryByRole("button", { name: /Remove intake/ })).toBeNull();
    expect(within(old).queryByRole("button", { name: /Add intake/ })).toBeNull();
  });

  it("searches universities and courses once typing settles", async () => {
    const fetchFn = listing({
      "GET /api/catalogue/universities/?q=nurs": jsonResponse(pageOf([DEAKIN])),
    });
    renderPage();
    await cardFor("Deakin University");

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search universities or courses" }),
      "nurs",
    );

    await waitFor(() => {
      expect(calls(fetchFn, "GET /api/catalogue/universities/?q=nurs")).toBe(1);
    });
  });

  it("adds a university and loads the list again", async () => {
    const fetchFn = listing({
      "POST /api/catalogue/universities/": jsonResponse({ ...KAPLAN, id: 3, archived: false }, 201),
    });
    renderPage();
    await cardFor("Deakin University");

    await userEvent.click(screen.getByRole("button", { name: "Add university" }));
    const dialog = screen.getByRole("dialog", { name: "Add university" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "Kaplan Business School");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add university" }));

    expect(await screen.findByText("University saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST /api/catalogue/universities/")).toEqual({
      name: "Kaplan Business School",
      country: "australia",
    });
    expect(calls(fetchFn, LIST)).toBe(2);
  });

  it("shows typed names as text, never as markup", async () => {
    backend({
      [LIST]: jsonResponse(pageOf([{ ...DEAKIN, name: "<img src=x onerror=alert(1)>" }])),
    });
    renderPage();

    expect(await cardFor("<img src=x onerror=alert\\(1\\)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("pages through a long Catalogue", async () => {
    const fetchFn = backend({
      [LIST]: jsonResponse(pageOf([DEAKIN], 30)),
      "GET /api/catalogue/universities/?page=2": jsonResponse({
        ...pageOf([KAPLAN], 30),
        page: 2,
      }),
    });
    renderPage();
    await cardFor("Deakin University");

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(await cardFor("Kaplan Business School")).toBeInTheDocument();
    expect(calls(fetchFn, "GET /api/catalogue/universities/?page=2")).toBe(1);
  });
});

describe("intakes on the Catalogue", () => {
  it("adds an intake on the month grid, kept in date order", async () => {
    const fetchFn = listing({
      [COURSE_URL]: jsonResponse({ ...MIT, intakes: ["2027-02", "2027-03", "2027-07"] }),
    });
    renderPage();
    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    await userEvent.click(
      within(mit).getByRole("button", { name: "Add intake to Master of Information Technology" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Intakes for Master of Information Technology",
    });
    const months = within(dialog).getByRole("group", { name: "Intakes in 2027" });
    expect(within(months).getByRole("button", { name: "Mar 2027" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(within(months).getByRole("button", { name: "Feb 2027" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save intakes" }));

    expect(
      await screen.findByText("Intakes saved for Master of Information Technology"),
    ).toBeInTheDocument();
    expect(sentBody(fetchFn, COURSE_URL)).toEqual({ intakes: ["2027-02", "2027-03", "2027-07"] });
  });

  it("can't pick a month gone by, and opens on the first upcoming year", async () => {
    listing();
    renderPage();
    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    await userEvent.click(within(mit).getByRole("button", { name: /Add intake/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("group", { name: "Intakes in 2027" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Previous year" }));

    const months = within(dialog).getByRole("group", { name: "Intakes in 2026" });
    expect(within(months).getByRole("button", { name: "Oct 2026" })).toBeDisabled();
    expect(within(months).getByRole("button", { name: "Nov 2026" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Previous year" })).toBeDisabled();
  });

  it("won't save a course's intakes with none left", async () => {
    const fetchFn = listing();
    renderPage();
    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    await userEvent.click(within(mit).getByRole("button", { name: /Add intake/ }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove intake Mar 2027" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove intake Jul 2027" }));
    expect(within(dialog).getByText("No intakes yet. Pick months above.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save intakes" }));

    expect(
      within(dialog).getByText("Keep at least one intake, or archive the course."),
    ).toBeInTheDocument();
    expect(calls(fetchFn, COURSE_URL)).toBe(0);
  });

  it("removes an intake with its × after asking", async () => {
    const fetchFn = listing({ [COURSE_URL]: jsonResponse({ ...MIT, intakes: ["2027-07"] }) });
    renderPage();
    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    await userEvent.click(
      within(mit).getByRole("button", {
        name: "Remove intake Mar 2027 from Master of Information Technology",
      }),
    );
    const confirm = screen.getByRole("dialog", {
      name: "Remove Mar 2027 from Master of Information Technology?",
    });
    expect(
      within(confirm).getByText(
        "Counsellors can no longer pick it for new applications. Applications already made keep it.",
      ),
    ).toBeInTheDocument();
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText("Mar 2027 removed from Master of Information Technology"),
    ).toBeInTheDocument();
    expect(sentBody(fetchFn, COURSE_URL)).toEqual({ intakes: ["2027-07"] });
  });

  it("keeps the last intake of an active course and says why", async () => {
    const fetchFn = listing({
      [LIST]: jsonResponse(pageOf([{ ...DEAKIN, courses: [{ ...MIT, intakes: ["2027-03"] }] }])),
    });
    renderPage();
    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    await userEvent.click(within(mit).getByRole("button", { name: /Remove intake Mar 2027/ }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByText("Keep at least one intake, or archive the course."),
    ).toBeInTheDocument();
    expect(calls(fetchFn, COURSE_URL)).toBe(0);
  });

  it("cancelling the question removes nothing", async () => {
    const fetchFn = listing();
    renderPage();
    const mit = courseRow(await cardFor("Deakin University"), "Master of Information Technology");

    await userEvent.click(within(mit).getByRole("button", { name: /Remove intake Mar 2027/ }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls(fetchFn, COURSE_URL)).toBe(0);
  });
});

describe("adding a course", () => {
  const ADD = "POST /api/catalogue/universities/1/courses/";

  async function openAddCourse(): Promise<HTMLElement> {
    renderPage();
    const deakin = await cardFor("Deakin University");
    await userEvent.click(
      within(deakin).getByRole("button", { name: "Add a course to Deakin University" }),
    );
    return screen.getByRole("dialog", { name: "Add course" });
  }

  it("uses the edit page's picker: name, level, month grid and document tick boxes", async () => {
    const fetchFn = listing({
      "GET /api/documents/types/": jsonResponse({ results: TYPES }),
      [ADD]: jsonResponse({ ...MIT, id: 13, name: "Bachelor of IT" }, 201),
    });
    const dialog = await openAddCourse();

    await userEvent.type(within(dialog).getByLabelText("Course name"), "Bachelor of IT");
    await userEvent.click(within(dialog).getByRole("button", { name: "Next year" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Jul 2027" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Feb 2027" }));
    // Only documents not every Student needs can be ticked.
    expect(within(dialog).queryByRole("checkbox", { name: "Passport" })).toBeNull();
    await userEvent.click(await within(dialog).findByRole("checkbox", { name: "Work Reference" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Add course" }));

    expect(await screen.findByText("Bachelor of IT added")).toBeInTheDocument();
    expect(sentBody(fetchFn, ADD)).toEqual({
      name: "Bachelor of IT",
      level: "bachelor",
      intakes: ["2027-02", "2027-07"],
      documents: [21],
    });
  });

  it("asks for a name and an intake before sending", async () => {
    const fetchFn = listing({ "GET /api/documents/types/": jsonResponse({ results: TYPES }) });
    const dialog = await openAddCourse();

    await userEvent.click(within(dialog).getByRole("button", { name: "Add course" }));

    expect(within(dialog).getByText("Enter the course's name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Add at least one intake.")).toBeInTheDocument();
    expect(calls(fetchFn, ADD)).toBe(0);
  });

  it("shows the server's refusal beside its field", async () => {
    listing({
      "GET /api/documents/types/": jsonResponse({ results: TYPES }),
      [ADD]: jsonResponse({ name: ["This university already has a course with this name."] }, 400),
    });
    const dialog = await openAddCourse();

    await userEvent.type(within(dialog).getByLabelText("Course name"), "Master of IT");
    await userEvent.click(within(dialog).getByRole("button", { name: "Dec 2026" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Add course" }));

    expect(
      await within(dialog).findByText("This university already has a course with this name."),
    ).toBeInTheDocument();
  });
});

describe("UniversitiesSettings import", () => {
  const IMPORT = "POST /api/catalogue/import/";
  const TEXT = "university,country,course,level,intakes\nDeakin,Australia,MIT,Master,Feb 2027\n";

  function csv(text = TEXT, name = "catalogue.csv"): File {
    return new File([text], name, { type: "text/csv" });
  }

  async function openImport(): Promise<HTMLElement> {
    renderPage();
    await cardFor("Deakin University");
    await userEvent.click(screen.getByRole("button", { name: "Import from a file" }));
    return screen.getByRole("dialog", { name: "Import Catalogue from CSV" });
  }

  async function importFile(dialog: HTMLElement, file: File | null = csv()): Promise<void> {
    if (file !== null) await userEvent.upload(within(dialog).getByLabelText("CSV file"), file);
    await userEvent.click(within(dialog).getByRole("button", { name: "Import" }));
  }

  it("explains the columns and moves focus to the file field", async () => {
    listing();

    const dialog = await openImport();

    expect(within(dialog).getByText("One row per course. Columns:")).toBeInTheDocument();
    expect(within(dialog).getByText(/university,country,course,level,intakes/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("CSV file")).toHaveFocus();
    expect(
      within(dialog).getByText(
        "Existing universities and courses are matched by name, so importing again doesn't create duplicates.",
      ),
    ).toBeInTheDocument();
  });

  it("sends the file's text and shows what was imported and every failed row", async () => {
    const fetchFn = listing({
      [IMPORT]: jsonResponse({
        imported: 38,
        already_there: 4,
        failed: 1,
        problems: [
          { row: 7, problem: "Level “Bachelors” isn't one of Bachelor, Master." },
          { row: 7, problem: "<b>Intake</b> “Fall 2027” must look like “Sep 2027”." },
        ],
      }),
    });
    const dialog = await openImport();

    await importFile(dialog);

    const result = await screen.findByRole("dialog", { name: "Import finished" });
    expect(sentBody(fetchFn, IMPORT)).toEqual({ csv: TEXT });
    expect(within(result).getByText("Imported").nextSibling).toHaveTextContent("38");
    expect(within(result).getByText("Already there").nextSibling).toHaveTextContent("4");
    expect(within(result).getByText("Failed").nextSibling).toHaveTextContent("1");
    const table = within(result).getByRole("table", { name: "Rows that failed" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(
      within(table).getByText("<b>Intake</b> “Fall 2027” must look like “Sep 2027”."),
    ).toBeInTheDocument();
    expect(
      within(result).getByText("Fix these rows and import the file again."),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(calls(fetchFn, LIST)).toBe(2);
    });

    await userEvent.click(within(result).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so when no row failed", async () => {
    listing({
      [IMPORT]: jsonResponse({ imported: 2, already_there: 0, failed: 0, problems: [] }),
    });
    const dialog = await openImport();

    await importFile(dialog);

    const result = await screen.findByRole("dialog", { name: "Import finished" });
    expect(within(result).getByText("No rows failed.")).toBeInTheDocument();
    expect(within(result).queryByRole("table")).not.toBeInTheDocument();
  });

  it.each([
    [null, "Choose a CSV file."],
    [csv(TEXT, "catalogue.xlsx"), "Choose a .csv file. Save a spreadsheet as CSV first."],
    [csv("\n"), "The file is empty."],
    [csv("x".repeat(400_001)), "The file is too big. Import at most 400 KB at a time."],
  ])("refuses a bad file before sending it (%#)", async (file, message) => {
    const fetchFn = listing();
    const dialog = await openImport();

    await importFile(dialog, file);

    expect(within(dialog).getByLabelText("CSV file")).toHaveAccessibleDescription(message);
    expect(calls(fetchFn, IMPORT)).toBe(0);
  });

  it("shows why the server refused the file under the field", async () => {
    listing({ [IMPORT]: jsonResponse({ csv: ["We couldn't read this file as CSV."] }, 400) });
    const dialog = await openImport();

    await importFile(dialog);

    expect(await within(dialog).findByLabelText("CSV file")).toHaveAccessibleDescription(
      "We couldn't read this file as CSV.",
    );
  });

  it.each([
    [500, "We couldn't import the file. Please try again."],
    [403, "Only an Admin can change the Catalogue."],
  ])("says when the import failed (%i)", async (status, message) => {
    listing({ [IMPORT]: jsonResponse({ detail: "x" }, status) });
    const dialog = await openImport();

    await importFile(dialog);

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
  });

  it("closes with Escape without importing", async () => {
    const fetchFn = listing();
    await openImport();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls(fetchFn, IMPORT)).toBe(0);
  });
});
