import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";

import { ApplicationsPage } from "./ApplicationsPage";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "applications"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function as(role: StaffContext["staff"]["role"]): StaffContext {
  return { ...ADMIN, staff: { ...ADMIN.staff, role } };
}

function row(overrides: Record<string, unknown>) {
  return {
    id: 11,
    student: { id: 2, name: "Sita Karki", phone: "9841234567", email: "sita@gmail.test" },
    university: { id: 3, name: "Deakin University", country: "australia" },
    course: { id: 4, name: "Master of IT", level: "master" },
    intake: "2027-07",
    status: "offer",
    offer_kind: "conditional",
    assigned_counsellor: { id: 5, name: "Bikash Thapa" },
    applied_on: "2026-10-02",
    added_on: "2026-09-30",
    ...overrides,
  };
}

const SITA = row({});
const GITA = row({
  id: 12,
  student: { id: 3, name: "Gita Rai", phone: "9801112222", email: "" },
  university: { id: 6, name: "University of Toronto", country: "canada" },
  intake: "2028-02",
  status: "applied",
  offer_kind: "",
  assigned_counsellor: null,
  applied_on: null,
});

function pageOf(results: unknown[], count = results.length, page = 1) {
  return { count, page, page_size: 25, results };
}

type Answer = (path: string) => Response | undefined;

function backend(...answers: Answer[]) {
  const fetchFn = vi.fn((path: string) => {
    for (const answer of answers) {
      const response = answer(path);
      if (response !== undefined) return Promise.resolve(response);
    }
    return Promise.resolve(jsonResponse({}, 500));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

const isList = (path: string) =>
  path.startsWith("/api/applications/") && !path.includes("filter-choices");

const listing =
  (body: unknown = pageOf([SITA, GITA])): Answer =>
  (path) =>
    isList(path) ? jsonResponse(body) : undefined;

const choices: Answer = (path) =>
  path === "/api/applications/filter-choices/"
    ? jsonResponse({
        intakes: ["2027-07", "2028-02"],
        years: ["2027", "2028"],
        countries: ["canada", "australia"],
      })
    : undefined;

const counsellors: Answer = (path) =>
  path === "/api/staff/counsellors/"
    ? jsonResponse([{ id: 5, name: "Bikash Thapa", role: "counsellor" }])
    : undefined;

function lastListCall(fetchFn: ReturnType<typeof backend>): string | undefined {
  return fetchFn.mock.calls
    .map(([path]) => path)
    .filter(isList)
    .at(-1);
}

function renderPage(context: StaffContext = ADMIN) {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <ApplicationsPage />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function rowFor(name: string): Promise<HTMLElement> {
  const link = await screen.findByRole("link", { name });
  const found = link.closest("tr");
  if (found === null) throw new Error(`No row for ${name}`);
  return found;
}

describe("ApplicationsPage", () => {
  it("lists each Application with its Student, University, Intake, Status, counsellor and days", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    const sita = await rowFor("Sita Karki");
    expect(screen.getByRole("heading", { level: 1, name: "Applications" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Every application in the office. Open one to work on it from the Student's page.",
      ),
    ).toBeInTheDocument();
    expect(within(sita).getByText("sita@gmail.test")).toBeInTheDocument();
    expect(within(sita).getByText("Deakin University")).toBeInTheDocument();
    expect(within(sita).getByText("Master of IT, Australia")).toBeInTheDocument();
    expect(within(sita).getByText("Jul 2027")).toBeInTheDocument();
    expect(within(sita).getAllByRole("cell")[4]).toHaveTextContent("Offer, conditional");
    expect(within(sita).getByText("Bikash Thapa")).toBeInTheDocument();
    expect(within(sita).getByText("2 Oct 2026")).toBeInTheDocument();
    expect(within(sita).getByText("30 Sep 2026")).toBeInTheDocument();
    expect(screen.getByText("2 applications")).toBeInTheDocument();
    expect(
      screen.getByText("Applied is the day the application was added, recorded automatically."),
    ).toBeInTheDocument();
  });

  it("shows a phone when there's no email, Not assigned, and a dash with no applied day", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    const gita = await rowFor("Gita Rai");
    expect(within(gita).getByText("9801112222")).toBeInTheDocument();
    expect(within(gita).getByText("Not assigned")).toBeInTheDocument();
    expect(within(gita).getAllByRole("cell")[4]).toHaveTextContent("Applied");
    expect(within(gita).getByText("—")).toBeInTheDocument();
    expect(within(gita).getByText("Not recorded")).toBeInTheDocument();
  });

  it("opens the Student's page, which starts on their Applications", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    expect(await screen.findByRole("link", { name: "Sita Karki" })).toHaveAttribute(
      "href",
      "/students/2",
    );
  });

  it.each([
    ["an Admin", "admin"],
    ["Front Desk", "front_desk"],
  ] as const)("shows %s everyone at first", async (_, role) => {
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage(as(role));

    await rowFor("Sita Karki");
    expect(lastListCall(fetchFn)).toBe("/api/applications/");
    expect(screen.getByRole("combobox", { name: "Counsellor" })).toHaveValue("");
  });

  it("shows a Counsellor their own Students at first", async () => {
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage(as("counsellor"));

    await rowFor("Sita Karki");
    expect(lastListCall(fetchFn)).toBe("/api/applications/?counsellor=me");
    expect(screen.getByRole("combobox", { name: "Counsellor" })).toHaveDisplayValue("My Students");
  });

  it("offers no My Students to Front Desk, who can't be assigned Students", async () => {
    backend(listing(), choices, counsellors);
    renderPage(as("front_desk"));

    const counsellor = await screen.findByRole("combobox", { name: "Counsellor" });
    await screen.findByRole("option", { name: "Bikash Thapa" });
    expect(within(counsellor).queryByRole("option", { name: "My Students" })).toBeNull();
  });

  it("narrows the list by Status, Intake, year, country and counsellor", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    await screen.findByRole("option", { name: "Feb 2028" });
    await screen.findByRole("option", { name: "Bikash Thapa" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "Offer");
    await user.selectOptions(screen.getByRole("combobox", { name: "Intake" }), "Feb 2028");
    await user.selectOptions(screen.getByRole("combobox", { name: "Intake year" }), "2028");
    await user.selectOptions(screen.getByRole("combobox", { name: "Country" }), "Canada");
    await user.selectOptions(screen.getByRole("combobox", { name: "Counsellor" }), "Bikash Thapa");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe(
        "/api/applications/?status=offer&intake=2028-02&year=2028&country=canada&counsellor=5",
      );
    });
  });

  it("offers the office's countries by name, in order", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    await screen.findByRole("option", { name: "Canada" });
    const country = screen.getByRole("combobox", { name: "Country" });
    expect(
      within(country)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Any country", "Australia", "Canada"]);
  });

  it("searches by Student or University once typing settles", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.type(screen.getByRole("searchbox", { name: "Search applications" }), "Deakin");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/applications/?q=Deakin");
    });
  });

  it("sorts as chosen", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort" }),
      "Soonest intake first",
    );

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/applications/?sort=intake");
    });
  });

  it("pages through a long list", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(pageOf([SITA], 30)), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/applications/?page=2");
    });
  });

  it("says when nothing matches the filters", async () => {
    backend(listing(pageOf([])), choices, counsellors);
    renderPage(as("counsellor"));

    expect(
      await screen.findByText("No applications match. Try clearing a filter."),
    ).toBeInTheDocument();
  });

  it("says when the office has no applications yet", async () => {
    backend(listing(pageOf([])), choices, counsellors);
    renderPage();

    expect(
      await screen.findByText(
        "No applications yet. Add one from a Student's page, on their Applications tab.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the list can't be loaded", async () => {
    backend(choices, counsellors);
    renderPage();

    expect(
      await screen.findByText("We couldn't load the applications. Refresh the page to try again."),
    ).toBeInTheDocument();
  });

  it("refuses an answer that doesn't look right instead of showing it", async () => {
    backend(listing(pageOf([row({ status: "<script>" })])), choices, counsellors);
    renderPage();

    expect(
      await screen.findByText("We couldn't load the applications. Refresh the page to try again."),
    ).toBeInTheDocument();
  });

  it("still filters with Any when the choices can't be loaded", async () => {
    backend(listing(), counsellors);
    renderPage();

    await rowFor("Sita Karki");
    const intake = screen.getByRole("combobox", { name: "Intake" });
    expect(
      within(intake)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Any intake"]);
  });

  it("shows text as typed, never as markup", async () => {
    const student = { id: 2, name: "<b>Sita</b>", phone: "9841234567", email: "" };
    backend(listing(pageOf([row({ student })])), choices, counsellors);
    renderPage();

    expect(await screen.findByRole("link", { name: "<b>Sita</b>" })).toBeInTheDocument();
  });

  it("lets a wide table be scrolled from the keyboard inside its own box", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    await rowFor("Sita Karki");
    expect(screen.getByRole("region", { name: "Applications" })).toHaveAttribute("tabindex", "0");
  });

  it("is not for Teachers", async () => {
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage(as("teacher"));

    expect(await screen.findByRole("link", { name: "Go to Home" })).toBeInTheDocument();
    expect(lastListCall(fetchFn)).toBeUndefined();
  });
});

async function selectAllBox(): Promise<HTMLElement> {
  const [box] = await screen.findAllByRole("checkbox", { name: "Select every row on this page" });
  if (box === undefined) throw new Error("No select-all box");
  return box;
}

describe("ApplicationsPage selection and export (issue 51)", () => {
  function exportsToo(
    fetchFn: ReturnType<typeof backend>,
    answer: () => Response = () => new Response("\uFEFFStudent\r\n", { status: 200 }),
  ) {
    const base = fetchFn.getMockImplementation();
    fetchFn.mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/exports/" && init?.method === "POST") return Promise.resolve(answer());
      return base === undefined ? Promise.resolve(jsonResponse({}, 500)) : base(path);
    });
    return fetchFn;
  }

  it("ticks a row in its own 44 px box without leaving the list, and counts it", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();

    const box = await screen.findByRole("checkbox", {
      name: "Select Sita Karki, Deakin University",
    });
    expect(box.closest("label")).toHaveClass("size-control");
    await user.click(box);

    expect(box).toBeChecked();
    const bar = screen.getByRole("region", { name: "Selected rows" });
    expect(within(bar).getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
  });

  it("selects every row on the page, and clears them", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();

    await user.click(await selectAllBox());

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("region", { name: "Selected rows" })).not.toBeInTheDocument();
  });

  it("copies the ticked Students' emails, skipping who has none", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();
    await user.click(await selectAllBox());

    await user.click(screen.getByRole("button", { name: "Copy emails" }));

    expect(await navigator.clipboard.readText()).toBe("sita@gmail.test");
    expect(await screen.findByText("1 email copied. 1 Student has none")).toBeInTheDocument();
  });

  it("copies phones one per line", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();
    await user.click(await selectAllBox());

    await user.click(screen.getByRole("button", { name: "Copy phones" }));

    expect(await navigator.clipboard.readText()).toBe("9841234567\n9801112222");
    expect(await screen.findByText("2 phone numbers copied")).toBeInTheDocument();
  });

  it("shows the text to copy by hand when the browser won't copy", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    await user.click(
      await screen.findByRole("checkbox", { name: "Select Sita Karki, Deakin University" }),
    );

    await user.click(screen.getByRole("button", { name: "Copy emails" }));

    const dialog = await screen.findByRole("dialog", { name: "Copy emails" });
    expect(within(dialog).getByRole("textbox", { name: "The emails to copy" })).toHaveValue(
      "sita@gmail.test",
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["counsellor", "front_desk"] as const)("offers no Export to %s", async (role) => {
    backend(listing(), choices, counsellors);
    renderPage(as(role));

    await screen.findByRole("link", { name: "Sita Karki" });
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("checkbox", { name: "Select every row on this page" }),
    ).not.toHaveLength(0);
  });

  it("exports the whole filtered list as the screen shows it", async () => {
    const user = userEvent.setup();
    const fetchFn = exportsToo(backend(listing(pageOf([SITA, GITA], 40)), choices, counsellors));
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    renderPage();
    await screen.findByRole("link", { name: "Sita Karki" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "offer");

    await user.click(screen.getByRole("button", { name: "Export" }));
    const dialog = await screen.findByRole("dialog", { name: "Export applications" });
    expect(within(dialog).getByText("You're downloading 40 rows")).toBeInTheDocument();
    expect(within(dialog).getByText("Status: Offer")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Documents, Notes and passport numbers are never included/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Download CSV" }));

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/exports/",
      expect.objectContaining({
        body: JSON.stringify({ list: "applications", filters: { status: ["offer"] } }),
      }),
    );
    expect(
      await screen.findByText("Exported 40 rows. It's listed in Configuration, Exports."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("refuses more than 10,000 rows before asking", async () => {
    const user = userEvent.setup();
    backend(listing(pageOf([SITA], 10_001)), choices, counsellors);
    renderPage();
    await screen.findByRole("link", { name: "Sita Karki" });

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(
      await screen.findByText("That's more than 10,000 rows. Narrow the filters first."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the server's short reason when the export is refused", async () => {
    const user = userEvent.setup();
    exportsToo(backend(listing(), choices, counsellors), () =>
      jsonResponse({ detail: "Only an Admin can export lists." }, 403),
    );
    renderPage();
    await screen.findByRole("link", { name: "Sita Karki" });

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("button", { name: "Download CSV" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Only an Admin can export lists.");
  });
});

describe("ApplicationsPage Assigned Counsellor filter (issue 70)", () => {
  it.each([
    ["admin", ["Any counsellor", "My Students", "Bikash Thapa"]],
    ["counsellor", ["Any counsellor", "My Students", "Bikash Thapa"]],
    ["front_desk", ["Any counsellor", "Bikash Thapa"]],
  ] as const)("lists every Counsellor to %s", async (role, expected) => {
    backend(listing(), choices, counsellors);
    renderPage(as(role));

    const filter = await screen.findByRole("combobox", { name: "Counsellor" });
    await within(filter).findByRole("option", { name: "Bikash Thapa" });
    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(expected);
  });
});
