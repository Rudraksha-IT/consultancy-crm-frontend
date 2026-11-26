import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { consultancySummary } from "@/test/consultancy";
import { fakeMatchMedia } from "@/test/matchMedia";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";

import { VisasPage } from "./VisasPage";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "applications", "visas"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

function as(role: StaffContext["staff"]["role"]): StaffContext {
  return { ...ADMIN, staff: { ...ADMIN.staff, role } };
}

function row(overrides: Record<string, unknown>) {
  return {
    id: uid(21),
    student: { id: uid(2), name: "Sita Karki", phone: "9841234567", email: "sita@gmail.test" },
    university: { id: uid(3), name: "University of Toronto", country: "canada" },
    course: { id: uid(4), name: "Master of IT", level: "master" },
    intake: "2027-09",
    status: "applied",
    next_appointment: { kind: "biometrics", at: "2026-11-20T14:00" },
    started_on: "2026-10-12",
    documents: { done: 5, total: 13, rejected: 1, waiting: 2 },
    assigned_counsellor: { id: uid(5), name: "Bikash Thapa" },
    ...overrides,
  };
}

const SITA = row({});
const GITA = row({
  id: uid(22),
  student: { id: uid(3), name: "Gita Rai", phone: "9801112222", email: "" },
  university: { id: uid(6), name: "Deakin University", country: "australia" },
  intake: "2027-02",
  status: "refused",
  next_appointment: null,
  documents: { done: 9, total: 9, rejected: 0, waiting: 0 },
  assigned_counsellor: null,
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

const isList = (path: string) => path.startsWith("/api/visas/") && !path.includes("filter-choices");

const listing =
  (body: unknown = pageOf([SITA, GITA])): Answer =>
  (path) =>
    isList(path) ? jsonResponse(body) : undefined;

const choices: Answer = (path) =>
  path === "/api/visas/filter-choices/"
    ? jsonResponse({ intakes: ["2027-02", "2027-09"], countries: ["canada", "australia"] })
    : undefined;

const counsellors: Answer = (path) =>
  path === "/api/staff/counsellors/"
    ? jsonResponse([{ id: uid(5), name: "Bikash Thapa", role: "counsellor" }])
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
        <VisasPage />
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

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("VisasPage", () => {
  it("keeps Intake, Visa status and documents on one line (list tidy-ups 26)", async () => {
    backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    expect(screen.getByRole("table")).not.toHaveAttribute("data-wraps");
  });

  it("gives the text columns fixed shares so nothing spills or scrolls sideways (list tidy-ups 17)", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    const row = await rowFor("Sita Karki");
    const marked = [...row.querySelectorAll("[data-shrinks]")].map((cell) =>
      cell.getAttribute("data-shrinks"),
    );
    expect(marked).toEqual(["large", "quarter", "medium"]);
  });

  it("lists each Visa with its Student, where to, Intake, Status, documents and counsellor", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    const sita = await rowFor("Sita Karki");
    expect(screen.getByRole("heading", { level: 1, name: "Visas" })).toBeInTheDocument();
    expect(
      screen.getByText("Every visa, waiting or decided. Appointments coming up are at the top."),
    ).toBeInTheDocument();
    expect(within(sita).getByText("9841234567")).toBeInTheDocument();
    expect(within(sita).getByText("Canada")).toBeInTheDocument();
    expect(within(sita).getByText("University of Toronto, Master of IT")).toBeInTheDocument();
    expect(within(sita).getByText("Sep 2027")).toBeInTheDocument();
    expect(within(sita).getByText("Applied")).toBeInTheDocument();
    // No Next appointment column (list tidy-ups 15).
    expect(within(sita).queryByText("Biometrics")).toBeNull();
    expect(within(sita).queryByText("20 Nov 2026")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Next appointment" })).toBeNull();
    expect(
      within(sita).getByRole("button", {
        name: "Open the checklist for Sita Karki: 5 of 13 documents, 1 rejected, 2 waiting to check",
      }),
    ).toHaveTextContent("5/13 documents");
    expect(within(sita).getByText("Bikash Thapa")).toBeInTheDocument();
    expect(screen.getByText("2 visas")).toBeInTheDocument();
  });

  it("shows Not assigned without a counsellor", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    const gita = await rowFor("Gita Rai");
    expect(within(gita).getByText("Not assigned")).toBeInTheDocument();
    expect(within(gita).getByText("Refused")).toBeInTheDocument();
  });

  it("opens the Student's page from the row", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    expect(await screen.findByRole("link", { name: "Sita Karki" })).toHaveAttribute(
      "href",
      `/students/${uid(2)}`,
    );
  });

  it("opens the Student's checklist from the documents button", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();

    await user.click(
      within(await rowFor("Gita Rai")).getByRole("button", { name: /Open the checklist/ }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Documents for Gita Rai" });
    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["an Admin", "admin"],
    ["Front Desk", "front_desk"],
  ] as const)("shows %s everyone at first", async (_, role) => {
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage(as(role));

    await rowFor("Sita Karki");
    expect(lastListCall(fetchFn)).toBe("/api/visas/");
  });

  it("shows a Counsellor their own Students at first", async () => {
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage(as("counsellor"));

    await rowFor("Sita Karki");
    expect(lastListCall(fetchFn)).toBe("/api/visas/?counsellor=me");
    expect(screen.getByRole("combobox", { name: "Counsellor" })).toHaveDisplayValue("My Students");
  });

  it("offers no My Students to Front Desk, who can't be assigned Students", async () => {
    backend(listing(), choices, counsellors);
    renderPage(as("front_desk"));

    const counsellor = await screen.findByRole("combobox", { name: "Counsellor" });
    await screen.findByRole("option", { name: "Bikash Thapa" });
    expect(within(counsellor).queryByRole("option", { name: "My Students" })).toBeNull();
  });

  it("narrows the list by Visa status, country, Intake and counsellor", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    await screen.findByRole("option", { name: "Bikash Thapa" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Visa status" }), "Applied");
    await user.selectOptions(screen.getByRole("combobox", { name: "Counsellor" }), "Bikash Thapa");
    // The panel under "More filters" stays open while its filters are chosen (UI revamp 06).
    await user.click(screen.getByRole("button", { name: "More filters" }));
    await screen.findByRole("option", { name: "Sep 2027" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Country" }), "Canada");
    await user.selectOptions(screen.getByRole("combobox", { name: "Intake" }), "Sep 2027");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe(
        `/api/visas/?status=applied&country=canada&intake=2027-09&counsellor=${uid(5)}`,
      );
    });
  });

  it.each([
    ["Appointment in the next 7 days", "?appointment_from=2026-11-05&appointment_to=2026-11-11"],
    ["Appointment in the next 30 days", "?appointment_from=2026-11-05&appointment_to=2026-12-04"],
    ["No appointment yet", "?has_appointment=false"],
  ])("narrows by %s", async (choice, query) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 5, 9, 0));
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.selectOptions(screen.getByRole("combobox", { name: "Appointment" }), choice);

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe(`/api/visas/${query}`);
    });
  });

  it("sorts as chosen", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    await user.click(screen.getByRole("button", { name: "More filters" }));

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort" }),
      "Latest appointment first",
    );

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?sort=-appointment");
    });
  });

  it("pages through a long list", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(pageOf([SITA], 30)), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?page=2");
    });
  });

  it("says when nothing matches the filters", async () => {
    backend(listing(pageOf([])), choices, counsellors);
    renderPage(as("counsellor"));

    expect(await screen.findByText("No visas match. Try clearing a filter.")).toBeInTheDocument();
  });

  it("says when the office has no visas yet", async () => {
    backend(listing(pageOf([])), choices, counsellors);
    renderPage();

    expect(
      await screen.findByText(
        "No visas yet. Mark one as applied from a Student's page once it is sent to the embassy.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the list can't be loaded", async () => {
    backend(choices, counsellors);
    renderPage();

    expect(
      await screen.findByText("We couldn't load the visas. Refresh the page to try again."),
    ).toBeInTheDocument();
  });

  it("refuses an answer that doesn't look right instead of showing it", async () => {
    backend(listing(pageOf([row({ status: "<script>" })])), choices, counsellors);
    renderPage();

    expect(
      await screen.findByText("We couldn't load the visas. Refresh the page to try again."),
    ).toBeInTheDocument();
  });

  it("still filters with Any when the choices can't be loaded", async () => {
    const user = userEvent.setup();
    backend(listing(), counsellors);
    renderPage();

    await rowFor("Sita Karki");
    await user.click(screen.getByRole("button", { name: "More filters" }));
    const intake = screen.getByRole("combobox", { name: "Intake" });
    expect(
      within(intake)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Any intake"]);
  });

  it("shows text as typed, never as markup", async () => {
    const student = { id: uid(2), name: "<b>Sita</b>", phone: "9841234567", email: "" };
    backend(listing(pageOf([row({ student })])), choices, counsellors);
    renderPage();

    expect(await screen.findByRole("link", { name: "<b>Sita</b>" })).toBeInTheDocument();
  });

  it("lets a wide table be scrolled from the keyboard inside its own box", async () => {
    backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    const region = screen.getByRole("region", { name: "Visas" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("tells a Teacher the page isn't for them, without asking for any visa", async () => {
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage(as("teacher"));

    expect(await screen.findByRole("link", { name: "Go to Home" })).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([path]) => isList(path))).toBe(false);
  });
});

describe("VisasPage search (UI revamp ticket 24)", () => {
  const search = () => screen.getByRole("searchbox", { name: "Search visas" });

  it("has the search box first in the filter bar", async () => {
    backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    const bar = screen.getByRole("group", { name: "Filter the list" });
    const controls = [...bar.querySelectorAll("input, select")];
    expect(controls[0]).toBe(search());
    expect(search()).toHaveAttribute("placeholder", "Search by Student or university");
  });

  it("searches by Student or University once typing settles, keeping the cursor in the box", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.type(search(), "Deakin");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?q=Deakin");
    });
    await rowFor("Sita Karki");
    expect(search()).toHaveFocus();
    expect(search()).toHaveValue("Deakin");
    // One request for the word, not one for each key.
    expect(fetchFn.mock.calls.filter(([path]) => path.includes("q=")).length).toBe(1);
  });

  it("goes back to page 1 when something is typed", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(pageOf([SITA], 30)), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?page=2");
    });

    await user.type(search(), "sita");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?q=sita");
    });
  });

  it("works together with the other filters", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    await user.selectOptions(screen.getByRole("combobox", { name: "Visa status" }), "Refused");
    await user.type(search(), "gita");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?q=gita&status=refused");
    });
  });

  it("restores the list when the box is emptied", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    await user.type(search(), "Deakin");
    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?q=Deakin");
    });

    await user.clear(search());

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/");
    });
  });

  it("counts as a set filter: Clear filters empties it", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    await user.type(search(), "Deakin");
    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?q=Deakin");
    });

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(search()).toHaveValue("");
    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/");
    });
  });

  it("says nothing matches when the search finds no visa", async () => {
    const user = userEvent.setup();
    backend(
      (path) => (path.includes("q=") ? jsonResponse(pageOf([])) : undefined),
      listing(),
      choices,
      counsellors,
    );
    renderPage();
    await rowFor("Sita Karki");

    await user.type(search(), "nobody");

    expect(await screen.findByText("No visas match. Try clearing a filter.")).toBeInTheDocument();
    expect(search()).toHaveFocus();
  });

  it('follows the count line ("1 visa")', async () => {
    const user = userEvent.setup();
    backend(
      (path) => (path.includes("q=") ? jsonResponse(pageOf([GITA])) : undefined),
      listing(),
      choices,
      counsellors,
    );
    renderPage();
    expect(await screen.findByText("2 visas")).toBeInTheDocument();

    await user.type(search(), "gita");

    expect(await screen.findByText("1 visa")).toBeInTheDocument();
  });

  it("names the search in the export", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");
    await user.type(search(), "Deakin");
    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/visas/?q=Deakin");
    });

    await user.click(screen.getByRole("button", { name: "Export" }));

    const dialog = await screen.findByRole("dialog", { name: "Export visas" });
    expect(within(dialog).getByText("Search: Deakin")).toBeInTheDocument();
  });

  describe("on a phone", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "matchMedia",
        fakeMatchMedia(
          () => false,
          (query) => query === PHONE_QUERY,
        ).matchMedia,
      );
    });

    it("sits on the first line with the filter button beside it, an icon alone", async () => {
      backend(listing(), choices, counsellors);
      renderPage();
      await screen.findAllByText("Sita Karki");

      expect(search()).toBeInTheDocument();
      const button = screen.getByRole("button", { name: "Filters" });
      expect(button).toHaveClass("size-control");
      expect(button.parentElement).toContainElement(search());
    });

    it("shows the words typed as a chip that empties the search", async () => {
      const user = userEvent.setup();
      const fetchFn = backend(listing(), choices, counsellors);
      renderPage();
      await screen.findAllByText("Sita Karki");

      await user.type(search(), "Deakin");

      const chip = screen.getByRole("button", { name: "Deakin, remove the Search filter" });
      expect(screen.getByRole("button", { name: "Filters, 1 set" })).toBeInTheDocument();
      await waitFor(() => {
        expect(lastListCall(fetchFn)).toBe("/api/visas/?q=Deakin");
      });
      await user.click(chip);

      expect(search()).toHaveValue("");
      await waitFor(() => {
        expect(lastListCall(fetchFn)).toBe("/api/visas/");
      });
    });
  });
});

describe("VisasPage More filters (list tidy-ups 03)", () => {
  it("shows Visa status, Counsellor and Appointment on one line, and the rest under More filters", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();
    await rowFor("Sita Karki");

    for (const name of ["Visa status", "Counsellor", "Appointment"]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    for (const name of ["Country", "Intake", "Sort"]) {
      expect(screen.queryByRole("combobox", { name })).not.toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "More filters" }));

    const panel = screen.getByRole("dialog", { name: "More filters" });
    for (const name of ["Country", "Intake", "Sort"]) {
      expect(within(panel).getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "More filters" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});

describe("VisasPage export (issue 51)", () => {
  it("shows no tick boxes: Download gives the whole filtered list (list tidy-ups 25)", async () => {
    backend(listing(), choices, counsellors);
    renderPage();

    await screen.findAllByText("Sita Karki");
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });

  it("shows the Export dialog with the Visas columns, for Admins only", async () => {
    const user = userEvent.setup();
    backend(listing(), choices, counsellors);
    renderPage();
    await screen.findByRole("link", { name: "Sita Karki" });

    await user.click(screen.getByRole("button", { name: "Export" }));

    const dialog = await screen.findByRole("dialog", { name: "Export visas" });
    expect(
      within(dialog).getByText(/Visa status, Next appointment, Documents/),
    ).toBeInTheDocument();
  });

  it("offers no Export to a Counsellor", async () => {
    backend(listing(), choices, counsellors);
    renderPage(as("counsellor"));

    await screen.findByRole("link", { name: "Sita Karki" });
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });
});

describe("VisasPage Assigned Counsellor filter (issue 70)", () => {
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
