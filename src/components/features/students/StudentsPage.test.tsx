import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";

import { StudentsPage } from "./StudentsPage";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function as(role: StaffContext["staff"]["role"]): StaffContext {
  return { ...ADMIN, staff: { ...ADMIN.staff, role } };
}

function student(overrides: Record<string, unknown>) {
  return {
    id: uid(1),
    name: "Anish Neupane",
    phone: "9819988776",
    email: "",
    country: "canada",
    source: "walk_in",
    stage: "lead",
    assigned_counsellor: null,
    ...overrides,
  };
}

const ANISH = student({});
const SITA = student({
  id: uid(2),
  name: "Sita Karki",
  phone: "9841234567",
  country: "australia",
  stage: "applying",
  assigned_counsellor: { id: 5, name: "Bikash Thapa" },
});
const COUNSELLORS = [
  { id: 1, name: "Asha Admin", role: "admin" },
  { id: 5, name: "Bikash Thapa", role: "counsellor" },
];

function pageOf(results: unknown[], count = results.length, page = 1) {
  return { count, page, page_size: 25, results };
}

type Answer = (path: string, init?: RequestInit) => Response | undefined;

/** A fake API: the first answer that knows the call wins. */
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

const listing =
  (body: unknown = pageOf([ANISH, SITA])): Answer =>
  (path, init) =>
    (init?.method ?? "GET") === "GET" && path.startsWith("/api/students/")
      ? jsonResponse(body)
      : undefined;

const counsellors: Answer = (path) =>
  path === "/api/staff/counsellors/" ? jsonResponse(COUNSELLORS) : undefined;

function listCalls(fetchFn: ReturnType<typeof backend>): string[] {
  return fetchFn.mock.calls
    .filter(
      ([path, init]) => (init?.method ?? "GET") === "GET" && path.startsWith("/api/students/"),
    )
    .map(([path]) => path);
}

function lastListCall(fetchFn: ReturnType<typeof backend>): string | undefined {
  return listCalls(fetchFn).at(-1);
}

function renderPage(context: StaffContext = ADMIN, initialSearch = "") {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentsPage initialSearch={initialSearch} />
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

describe("StudentsPage", () => {
  it("lists each Student with phone, Stage, counsellor and where they want to go", async () => {
    backend(listing(), counsellors);
    renderPage();

    const sita = await rowFor("Sita Karki");
    expect(screen.getByRole("heading", { level: 1, name: "Students" })).toBeInTheDocument();
    expect(within(sita).getByText("9841234567")).toBeInTheDocument();
    expect(within(sita).getByText("Applying")).toBeInTheDocument();
    expect(within(sita).getByText("Bikash Thapa")).toBeInTheDocument();
    expect(within(sita).getByText("Australia")).toBeInTheDocument();
    expect(within(await rowFor("Anish Neupane")).getByText("Not assigned")).toBeInTheDocument();
    expect(screen.getByText("2 Students")).toBeInTheDocument();
  });

  it("links each Student to their page", async () => {
    backend(listing(), counsellors);
    renderPage();

    expect(await screen.findByRole("link", { name: "Sita Karki" })).toHaveAttribute(
      "href",
      `/students/${uid(2)}`,
    );
  });

  it("shows an Admin every Student at first", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();

    await rowFor("Sita Karki");
    expect(listCalls(fetchFn)).toEqual(["/api/students/"]);
    expect(screen.getByRole("combobox", { name: "Counsellor" })).toHaveValue("");
  });

  it("shows a Counsellor the Students assigned to them at first", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage(as("counsellor"));

    await rowFor("Sita Karki");
    expect(listCalls(fetchFn)).toEqual(["/api/students/?counsellor=me"]);
    expect(screen.getByRole("combobox", { name: "Counsellor" })).toHaveValue("me");
  });

  it("lets a Counsellor look through everyone", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage(as("counsellor"));

    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Counsellor" }),
      "Any counsellor",
    );

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/");
    });
  });

  it("starts with a search typed in the top bar, through everyone", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage(as("counsellor"), "sita");

    await rowFor("Sita Karki");
    expect(listCalls(fetchFn)).toEqual(["/api/students/?q=sita"]);
    expect(screen.getByRole("searchbox", { name: "Search Students" })).toHaveValue("sita");
  });

  it("is not available to Teachers", () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage(as("teacher"));

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Counsellor" })).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("searches by what is typed", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();

    await userEvent.type(await screen.findByRole("searchbox", { name: "Search Students" }), "9841");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?q=9841");
    });
  });

  it("filters by Stage and by counsellor", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();

    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Stage" }), "Visa");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Counsellor" }),
      await screen.findByRole("option", { name: "Bikash Thapa" }),
    );

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?stage=visa&counsellor=5");
    });
  });

  it("offers the Students with no counsellor yet", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();

    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Counsellor" }),
      "No counsellor yet",
    );

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?counsellor=none");
    });
  });

  it("filters by how they found us under More filters", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();

    expect(screen.queryByRole("combobox", { name: "How they found us" })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: "More filters" }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "How they found us" }),
      "Sub-agent",
    );

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?source=sub_agent");
    });
    expect(screen.queryByRole("button", { name: "More filters" })).toBeNull();
  });

  it("filters by the country they want and their target level under More filters", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "More filters" }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Wants to study in" }),
      "Canada",
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Target level" }), "PhD");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?country=canada&target_level=phd");
    });
  });

  it("says when no Student matches", async () => {
    backend(listing(pageOf([])), counsellors);
    renderPage(ADMIN, "nobody");

    expect(
      await screen.findByText("No Students match. Try clearing the search or a filter."),
    ).toBeInTheDocument();
  });

  it("says when there are no Students yet and offers to add one", async () => {
    backend(listing(pageOf([])), counsellors);
    renderPage();

    expect(await screen.findByText("No Students yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add a visitor" })).toHaveLength(2);
  });

  it("says so when the list can't load", async () => {
    backend(counsellors);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't load the Students");
  });

  it("pages through a long list", async () => {
    const fetchFn = backend(listing(pageOf([ANISH], 30)), counsellors);
    renderPage();

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("30 Students")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?page=2");
    });
  });

  it("goes back to the first page when a filter changes", async () => {
    const fetchFn = backend(listing(pageOf([ANISH], 30)), counsellors);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Next page" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "Lead");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?stage=lead");
    });
  });

  it("hides the pager when everything fits on one page", async () => {
    backend(listing(), counsellors);
    renderPage();

    await rowFor("Sita Karki");
    expect(screen.queryByRole("button", { name: "Next page" })).toBeNull();
  });
});

describe("adding a visitor", () => {
  const STORED = {
    ...student({ id: uid(9), name: "Nisha Tamang", phone: "9818877665", country: "japan" }),
    source: "sub_agent",
    highest_qualification: "bachelor",
    past_degree: "BBS",
    previous_job: "",
    sub_agent_name: "Himal Edu Link",
    note: "Wants Tokyo.",
    assigned_counsellor: { id: 5, name: "Bikash Thapa" },
    created_at: "2026-11-01T10:15:00+05:45",
  };

  const saving =
    (response: Response): Answer =>
    (path, init) =>
      init?.method === "POST" && path === "/api/students/" ? response : undefined;

  function sentBody(fetchFn: ReturnType<typeof backend>): unknown {
    const call = fetchFn.mock.calls.find(([, init]) => init?.method === "POST");
    const body = call?.[1]?.body;
    return typeof body === "string" ? JSON.parse(body) : undefined;
  }

  async function openDialog(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: "Add a visitor" }));
    return screen.getByRole("dialog", { name: "Add a visitor" });
  }

  it("groups the form like the visitor desk", async () => {
    backend(listing(), counsellors);
    renderPage();

    const dialog = await openDialog();

    for (const group of ["About the visitor", "Education and work", "Note", "Hand over"]) {
      expect(within(dialog).getByRole("group", { name: group })).toBeInTheDocument();
    }
  });

  it("asks for the Sub-agent's name only when they came through a Sub-agent", async () => {
    backend(listing(), counsellors);
    renderPage();
    const dialog = await openDialog();

    expect(within(dialog).queryByLabelText("Sub-agent name")).toBeNull();
    await userEvent.selectOptions(within(dialog).getByLabelText("How they found us"), "Sub-agent");

    expect(within(dialog).getByLabelText("Sub-agent name")).toBeRequired();
  });

  it("offers the active counsellors, or deciding later", async () => {
    backend(listing(), counsellors);
    renderPage();
    const dialog = await openDialog();

    const choice = within(dialog).getByLabelText("Counsellor (optional)");
    expect(within(choice).getByRole("option", { name: "Decide later" })).toBeInTheDocument();
    expect(await within(choice).findByRole("option", { name: "Bikash Thapa" })).toBeInTheDocument();
  });

  it("saves the visitor as a Lead, confirms it and shows them first", async () => {
    let saved = false;
    const recordSave: Answer = (_, init) => {
      if (init?.method !== "POST") return undefined;
      saved = true;
      return jsonResponse(STORED, 201);
    };
    const fetchFn = backend(
      recordSave,
      (path, init) => listing(pageOf(saved ? [STORED, ANISH, SITA] : [ANISH, SITA]))(path, init),
      counsellors,
    );
    renderPage();
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByLabelText("Full name"), "Nisha Tamang");
    await userEvent.type(within(dialog).getByLabelText("Mobile number"), "9818877665");
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Country they want to study in"),
      "Japan",
    );
    await userEvent.selectOptions(within(dialog).getByLabelText("How they found us"), "Sub-agent");
    await userEvent.type(within(dialog).getByLabelText("Sub-agent name"), "Himal Edu Link");
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Highest qualification"),
      "Bachelor",
    );
    await userEvent.type(within(dialog).getByLabelText("Past degree (optional)"), "BBS");
    await userEvent.type(within(dialog).getByLabelText("Note (optional)"), "Wants Tokyo.");
    await userEvent.selectOptions(
      within(dialog).getByLabelText("Counsellor (optional)"),
      await within(dialog).findByRole("option", { name: "Bikash Thapa" }),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Save visitor" }));

    expect(await screen.findByText("Visitor saved")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await rowFor("Nisha Tamang")).toBeInTheDocument();
    expect(sentBody(fetchFn)).toEqual({
      name: "Nisha Tamang",
      phone: "9818877665",
      email: "",
      country: "japan",
      source: "sub_agent",
      sub_agent_name: "Himal Edu Link",
      highest_qualification: "bachelor",
      past_degree: "BBS",
      previous_job: "",
      note: "Wants Tokyo.",
      assigned_counsellor: 5,
    });
  });

  it("saves on Ctrl + Enter in the Note, with the keys shown in the footer", async () => {
    const fetchFn = backend(saving(jsonResponse(STORED, 201)), listing(), counsellors);
    renderPage();
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByLabelText("Full name"), "Ram");
    await userEvent.type(within(dialog).getByLabelText("Mobile number"), "9800000000");
    const note = within(dialog).getByLabelText("Note (optional)");
    expect(within(dialog).getByText("Ctrl + Enter to save")).toBeInTheDocument();
    expect(note).toHaveAccessibleDescription(/Ctrl \+ Enter to save$/);
    await userEvent.type(note, "Wants Tokyo.{Control>}{Enter}{/Control}");

    await screen.findByText("Visitor saved");
    expect(sentBody(fetchFn)).toMatchObject({ name: "Ram", note: "Wants Tokyo." });
  });

  it("starts at the usual answers: Australia, Walk-in, +2 and decide later", async () => {
    const fetchFn = backend(saving(jsonResponse(STORED, 201)), listing(), counsellors);
    renderPage();
    const dialog = await openDialog();

    await userEvent.type(within(dialog).getByLabelText("Full name"), "Ram");
    await userEvent.type(within(dialog).getByLabelText("Mobile number"), "9800000000");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save visitor" }));

    await screen.findByText("Visitor saved");
    expect(sentBody(fetchFn)).toMatchObject({
      country: "australia",
      source: "walk_in",
      highest_qualification: "plus_two",
      assigned_counsellor: null,
    });
    expect(sentBody(fetchFn)).not.toHaveProperty("sub_agent_name");
  });

  it("shows what the API refused next to each field and keeps the dialog open", async () => {
    backend(
      saving(jsonResponse({ phone: ["Enter a mobile number of 7 to 15 digits."] }, 400)),
      listing(),
      counsellors,
    );
    renderPage();
    const dialog = await openDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save visitor" }));

    expect(await within(dialog).findByLabelText("Mobile number")).toHaveAccessibleDescription(
      "Enter a mobile number of 7 to 15 digits.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("says so when saving fails for another reason", async () => {
    backend(saving(jsonResponse({}, 500)), listing(), counsellors);
    renderPage();
    const dialog = await openDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save visitor" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "We couldn't save the visitor",
    );
  });

  it("still lets a visitor be saved for later when the counsellors can't load", async () => {
    backend(listing());
    renderPage();
    const dialog = await openDialog();

    const choice = within(dialog).getByLabelText("Counsellor (optional)");
    expect(within(choice).getAllByRole("option")).toHaveLength(1);
  });

  it("closes with Cancel without saving", async () => {
    const fetchFn = backend(listing(), counsellors);
    renderPage();
    const dialog = await openDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sentBody(fetchFn)).toBeUndefined();
  });
});

describe("StudentsPage selection and export (issue 51)", () => {
  const exported: Answer = (path, init) =>
    path === "/api/exports/" && init?.method === "POST"
      ? new Response("﻿Name\r\n", { status: 200 })
      : undefined;

  it("copies the ticked Students' phones, one per line", async () => {
    const user = userEvent.setup();
    backend(listing(), counsellors);
    renderPage();

    await user.click(await screen.findByRole("checkbox", { name: "Select Anish Neupane" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Sita Karki" }));
    await user.click(screen.getByRole("button", { name: "Copy phones" }));

    expect(await navigator.clipboard.readText()).toBe("9819988776\n9841234567");
    expect(await screen.findByText("2 phone numbers copied")).toBeInTheDocument();
  });

  it("says so when none of the ticked Students has an email", async () => {
    const user = userEvent.setup();
    backend(listing(), counsellors);
    renderPage();

    await user.click(await screen.findByRole("checkbox", { name: "Select Anish Neupane" }));
    await user.click(screen.getByRole("button", { name: "Copy emails" }));

    expect(await screen.findByText("None of them has an email.")).toBeInTheDocument();
  });

  it("has a visible Select all on this page for the stacked cards", async () => {
    const user = userEvent.setup();
    backend(listing(), counsellors);
    renderPage();

    await user.click(await screen.findByRole("checkbox", { name: "Select all on this page" }));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Sita Karki" })).toBeChecked();
  });

  it("exports with the filters on screen, named in words", async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:x");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const fetchFn = backend(exported, listing(), counsellors);
    renderPage();
    await screen.findByRole("link", { name: "Sita Karki" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Counsellor" }), "5");

    await user.click(screen.getByRole("button", { name: "Export" }));
    const dialog = await screen.findByRole("dialog", { name: "Export students" });
    expect(within(dialog).getByText("Counsellor: Bikash Thapa")).toBeInTheDocument();
    expect(within(dialog).getByText(/^Name, Mobile, Email, Stage/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Download CSV" }));

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledWith(
        "/api/exports/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ list: "students", filters: { counsellor: "5" } }),
        }),
      );
    });
  });

  it("names no filters as everyone", async () => {
    const user = userEvent.setup();
    backend(listing(), counsellors);
    renderPage();
    await screen.findByRole("link", { name: "Sita Karki" });

    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(await screen.findByText("No filters, everyone")).toBeInTheDocument();
  });

  it.each(["counsellor", "front_desk"] as const)("offers no Export to %s", async (role) => {
    backend(listing(), counsellors);
    renderPage(as(role));

    await screen.findByRole("link", { name: "Sita Karki" });
    expect(screen.queryByRole("button", { name: "Export" })).not.toBeInTheDocument();
  });
});

describe("StudentsPage Assigned Counsellor filter (issue 70)", () => {
  async function counsellorFilterOptions(): Promise<string[]> {
    const filter = await screen.findByRole("combobox", { name: "Counsellor" });
    await within(filter).findByRole("option", { name: "Bikash Thapa" });
    return within(filter)
      .getAllByRole("option")
      .map((option) => option.textContent);
  }

  it("lists every Counsellor to a Counsellor, as on Applications and Visas", async () => {
    backend(listing(), counsellors);
    renderPage(as("counsellor"));

    expect(await counsellorFilterOptions()).toEqual([
      "Any counsellor",
      "Assigned to me",
      "No counsellor yet",
      "Asha Admin",
      "Bikash Thapa",
    ]);
  });

  it("finds another Counsellor's Students for a Counsellor", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(listing(), counsellors);
    renderPage(as("counsellor"));

    await counsellorFilterOptions();
    await user.selectOptions(screen.getByRole("combobox", { name: "Counsellor" }), "Bikash Thapa");

    await waitFor(() => {
      expect(lastListCall(fetchFn)).toBe("/api/students/?counsellor=5");
    });
  });

  it("lists every Counsellor to an Admin", async () => {
    backend(listing(), counsellors);
    renderPage(as("admin"));

    expect(await counsellorFilterOptions()).toEqual([
      "Any counsellor",
      "Assigned to me",
      "No counsellor yet",
      "Asha Admin",
      "Bikash Thapa",
    ]);
  });

  it("lists every Counsellor to Front Desk, without Assigned to me", async () => {
    backend(listing(), counsellors);
    renderPage(as("front_desk"));

    expect(await counsellorFilterOptions()).toEqual([
      "Any counsellor",
      "No counsellor yet",
      "Asha Admin",
      "Bikash Thapa",
    ]);
  });
});
