import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, methodOf, on, type Answer } from "@/test/backend";
import { PROFILE } from "@/test/studentProfile";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { VisitorDesk } from "./VisitorDesk";
import { consultancySummary } from "@/test/consultancy";

const DESK: StaffContext = {
  staff: { id: 4, name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const TODAY = "/api/visits/today/";
const STUDENTS = "/api/students/";
const SEARCH_SITA = "/api/students/?q=sita";
const VISITS_7 = "/api/students/7/visits/";

const NEW_VISIT = {
  id: 11,
  kind: "new",
  purpose: "First visit",
  at: "2026-11-03T10:15:00+05:45",
  recorded_by: { id: 4, name: "Ramesh KC" },
  student: { id: 12, name: "Hari Bhandari", note_first_line: "Wants a diploma in Canada" },
};
const FOLLOW_UP = {
  ...NEW_VISIT,
  id: 10,
  kind: "follow_up",
  purpose: "Bringing documents: <b>passport</b>",
  at: "2026-11-03T09:40:00+05:45",
  student: { id: 7, name: "Sita Gurung", note_first_line: "" },
};

const SITA_ROW = {
  id: 7,
  name: "Sita Gurung",
  phone: "9841000001",
  email: "",
  country: "australia",
  source: "walk_in",
  stage: "counselling",
  assigned_counsellor: { id: 5, name: "Bikash Thapa" },
};

const ADDED = {
  ...SITA_ROW,
  id: 12,
  name: "Hari Bhandari",
  highest_qualification: "plus_two",
  past_degree: "",
  previous_job: "",
  sub_agent_name: "",
  note: "",
  created_at: "2026-11-03T10:15:00+05:45",
};

const LAST_VISIT = { ...FOLLOW_UP, student: undefined, purpose: "Counselling session" };

function pageOf(results: unknown[]) {
  return { count: results.length, page: 1, page_size: 25, results };
}

function today(visits: unknown[]): Answer {
  return on("GET", TODAY, { count: visits.length, results: visits });
}

const PICKED: Answer[] = [
  on("GET", SEARCH_SITA, pageOf([SITA_ROW])),
  on("GET", "/api/students/7/", PROFILE),
  on("GET", "/api/students/7/progress/", {
    stage: "counselling",
    percent: 20,
    next_step: "Choose a course and apply",
    is_done: false,
  }),
  on("GET", `${VISITS_7}?page=1`, { ...pageOf([LAST_VISIT]), page_size: 50 }),
];

const COUNSELLORS = on("GET", "/api/staff/counsellors/", [{ id: 5, name: "Bikash Thapa" }]);

function renderDesk() {
  return render(
    <StaffContextContext value={DESK}>
      <ToastProvider>
        <VisitorDesk />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function sentJson(fetchFn: ReturnType<typeof backend>, path: string): unknown {
  const call = fetchFn.mock.calls.find(([p, init]) => methodOf(init) === "POST" && p === path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

async function findSita(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));
  await userEvent.type(screen.getByRole("searchbox", { name: "Find the visitor" }), "sita");
  await userEvent.click(await screen.findByRole("button", { name: "Choose Sita Gurung" }));
  await screen.findByRole("heading", { name: "Sita Gurung" });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetTheme();
});

describe("Today's visitors", () => {
  it("shows each Visit with its time, name, New or Follow-up, why and the Note's first line", async () => {
    backend(today([NEW_VISIT, FOLLOW_UP]), COUNSELLORS);
    renderDesk();

    const section = await screen.findByRole("region", { name: "Today's visitors" });
    const items = await within(section).findAllByRole("listitem");
    expect(items).toHaveLength(2);
    const [first, second] = items;
    if (first === undefined || second === undefined) throw new Error("two rows expected");
    expect(within(first).getByRole("link", { name: "Hari Bhandari" })).toHaveAttribute(
      "href",
      "/students/12",
    );
    expect(within(first).getByText("New visitor")).toBeInTheDocument();
    expect(within(first).getByText("First visit")).toBeInTheDocument();
    expect(within(first).getByText("Wants a diploma in Canada")).toBeInTheDocument();
    expect(within(second).getByText("Follow-up")).toBeInTheDocument();
    // Typed HTML stays as text.
    expect(within(second).getByText("Bringing documents: <b>passport</b>")).toBeInTheDocument();
    expect(within(section).getByText("2")).toBeInTheDocument();
  });

  it("marks new visitors with a filled dot", async () => {
    backend(today([NEW_VISIT, FOLLOW_UP]), COUNSELLORS);
    const { container } = renderDesk();

    await screen.findByText("Hari Bhandari");

    const dots = container.querySelectorAll("[data-new]");
    expect([...dots].map((dot) => dot.getAttribute("data-new"))).toEqual(["true", "false"]);
  });

  it("says when nobody has come in yet", async () => {
    backend(today([]), COUNSELLORS);
    renderDesk();

    expect(await screen.findByText("No visitors yet today.")).toBeInTheDocument();
  });

  it("says when today's visitors couldn't load", async () => {
    backend(on("GET", TODAY, {}, 500), COUNSELLORS);
    renderDesk();

    expect(
      await screen.findByText("We couldn't load today's visitors. Please try again."),
    ).toBeInTheDocument();
  });
});

describe("A new visitor", () => {
  it("starts on New visitor with the visitor form", async () => {
    backend(today([]), COUNSELLORS);
    renderDesk();
    await screen.findByText("No visitors yet today.");

    expect(screen.getByRole("button", { name: "New visitor" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Full name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save visitor" })).toBeInTheDocument();
  });

  it("saves them, says so with a link to their page, clears the form and reloads today", async () => {
    const fetchFn = backend(today([]), COUNSELLORS, on("POST", STUDENTS, ADDED, 201));
    renderDesk();
    await screen.findByText("No visitors yet today.");

    await userEvent.type(screen.getByRole("textbox", { name: "Full name" }), "Hari Bhandari");
    await userEvent.type(screen.getByRole("textbox", { name: "Mobile number" }), "9841000012");
    await userEvent.click(screen.getByRole("button", { name: "Save visitor" }));

    expect(await screen.findByText("Hari Bhandari is saved as a new visitor.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open their page" })).toHaveAttribute(
      "href",
      "/students/12",
    );
    expect(screen.getByText("Visitor saved")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("");
    expect(sentJson(fetchFn, STUDENTS)).toMatchObject({ name: "Hari Bhandari" });
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", TODAY)).toHaveLength(2);
    });
  });

  it("saves on Ctrl + Enter in the Note, with the keys shown beside Save visitor", async () => {
    const fetchFn = backend(today([]), COUNSELLORS, on("POST", STUDENTS, ADDED, 201));
    renderDesk();
    await screen.findByText("No visitors yet today.");

    await userEvent.type(screen.getByRole("textbox", { name: "Full name" }), "Hari Bhandari");
    await userEvent.type(screen.getByRole("textbox", { name: "Mobile number" }), "9841000012");
    const note = screen.getByRole("textbox", { name: "Note (optional)" });
    expect(screen.getByText("Ctrl + Enter to save")).toBeInTheDocument();
    expect(note).toHaveAccessibleDescription(/Ctrl \+ Enter to save$/);
    await userEvent.type(note, "Wants Sydney.{Control>}{Enter}{/Control}");

    expect(await screen.findByText("Hari Bhandari is saved as a new visitor.")).toBeInTheDocument();
    expect(sentJson(fetchFn, STUDENTS)).toMatchObject({ note: "Wants Sydney." });
  });

  it("shows what the server refused and keeps what was typed", async () => {
    backend(
      today([]),
      COUNSELLORS,
      on("POST", STUDENTS, { phone: ["Enter their mobile number."] }, 400),
    );
    renderDesk();

    await userEvent.type(screen.getByRole("textbox", { name: "Full name" }), "Hari");
    await userEvent.click(screen.getByRole("button", { name: "Save visitor" }));

    expect(await screen.findByText("Enter their mobile number.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("Hari");
  });

  it("says when saving failed for another reason", async () => {
    backend(today([]), COUNSELLORS, on("POST", STUDENTS, {}, 500));
    renderDesk();

    await userEvent.click(screen.getByRole("button", { name: "Save visitor" }));

    expect(
      await screen.findByText("We couldn't save the visitor. Please try again."),
    ).toBeInTheDocument();
  });

  it("clears the form on request", async () => {
    backend(today([]), COUNSELLORS);
    renderDesk();
    const name = screen.getByRole("textbox", { name: "Full name" });

    await userEvent.type(name, "Hari");
    await userEvent.click(screen.getByRole("button", { name: "Clear the form" }));

    expect(screen.getByRole("textbox", { name: "Full name" })).toHaveValue("");
  });
});

describe("A returning visitor", () => {
  it("waits for two letters before searching", async () => {
    const fetchFn = backend(today([]), COUNSELLORS);
    renderDesk();

    await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find the visitor" }), "s");

    expect(screen.getByText("Start typing to see matches.")).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([path]) => path.startsWith("/api/students/?"))).toBe(false);
  });

  it("finds them by name and shows their Stage", async () => {
    backend(today([]), COUNSELLORS, ...PICKED);
    renderDesk();

    await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find the visitor" }), "sita");

    const matches = await screen.findByRole("list", { name: "Matching Students" });
    expect(within(matches).getByText("9841000001")).toBeInTheDocument();
    expect(within(matches).getByText("Counselling")).toBeInTheDocument();
  });

  it("says when nobody matches", async () => {
    backend(today([]), COUNSELLORS, on("GET", "/api/students/?q=zz", pageOf([])));
    renderDesk();

    await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find the visitor" }), "zz");

    expect(
      await screen.findByText("No one matches. Check the spelling, or switch to New visitor."),
    ).toBeInTheDocument();
  });

  it("says when the search failed", async () => {
    backend(today([]), COUNSELLORS);
    renderDesk();

    await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find the visitor" }), "sita");

    expect(
      await screen.findByText("We couldn't search the Students. Please try again."),
    ).toBeInTheDocument();
  });

  it("shows who they are, their progress, their last visit and their Note", async () => {
    backend(today([]), COUNSELLORS, ...PICKED);
    renderDesk();

    await findSita();

    expect(screen.getByText("Bikash Thapa")).toBeInTheDocument();
    expect(screen.getByText("Australia")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "How far along Sita Gurung is" }),
    ).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByText("Next: Choose a course and apply")).toBeInTheDocument();
    expect(
      screen.getByText(/^Last visit 3 Nov 2026, \d\d:\d\d: Counselling session$/),
    ).toBeInTheDocument();
    expect(screen.getByText("Wants Melbourne only.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open their page" })).toHaveAttribute(
      "href",
      "/students/7",
    );
  });

  it("logs the visit with why they came, then goes back to the search", async () => {
    const fetchFn = backend(
      today([]),
      COUNSELLORS,
      ...PICKED,
      on("POST", VISITS_7, LAST_VISIT, 201),
    );
    renderDesk();
    await findSita();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Why are they here today?" }),
      "bringing_documents",
    );
    await userEvent.type(screen.getByRole("textbox", { name: /Details/ }), "Passport copy");
    await userEvent.click(screen.getByRole("button", { name: "Save visit" }));

    expect(await screen.findByText("Visit saved")).toBeInTheDocument();
    expect(sentJson(fetchFn, VISITS_7)).toEqual({
      reason: "bringing_documents",
      details: "Passport copy",
    });
    expect(screen.getByRole("searchbox", { name: "Find the visitor" })).toHaveValue("");
    await waitFor(() => {
      expect(callsTo(fetchFn, "GET", TODAY)).toHaveLength(2);
    });
  });

  it("shows a refused detail under its field", async () => {
    backend(
      today([]),
      COUNSELLORS,
      ...PICKED,
      on("POST", VISITS_7, { details: ["Use letters, numbers and punctuation only."] }, 400),
    );
    renderDesk();
    await findSita();

    await userEvent.click(screen.getByRole("button", { name: "Save visit" }));

    expect(
      await screen.findByText("Use letters, numbers and punctuation only."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sita Gurung" })).toBeInTheDocument();
  });

  it("says when the visit couldn't be saved", async () => {
    backend(today([]), COUNSELLORS, ...PICKED, on("POST", VISITS_7, {}, 500));
    renderDesk();
    await findSita();

    await userEvent.click(screen.getByRole("button", { name: "Save visit" }));

    expect(
      await screen.findByText("We couldn't save the visit. Please try again."),
    ).toBeInTheDocument();
  });

  it("goes back to the search with Choose someone else", async () => {
    backend(today([]), COUNSELLORS, ...PICKED);
    renderDesk();
    await findSita();

    await userEvent.click(screen.getByRole("button", { name: "Choose someone else" }));

    expect(screen.getByRole("searchbox", { name: "Find the visitor" })).toHaveValue("");
  });

  it("says when the Student couldn't load, and lets them choose again", async () => {
    backend(today([]), COUNSELLORS, on("GET", SEARCH_SITA, pageOf([SITA_ROW])), (path) =>
      path.startsWith("/api/students/7/") ? jsonResponse({}, 500) : undefined,
    );
    renderDesk();

    await userEvent.click(screen.getByRole("button", { name: "Returning visitor" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Find the visitor" }), "sita");
    await userEvent.click(await screen.findByRole("button", { name: "Choose Sita Gurung" }));

    expect(
      await screen.findByText("We couldn't load this Student. Please try again."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Choose someone else" }));
    expect(screen.getByRole("searchbox", { name: "Find the visitor" })).toBeInTheDocument();
  });

  it("takes a payment from here", async () => {
    backend(today([]), COUNSELLORS, ...PICKED);
    renderDesk();
    await findSita();

    await userEvent.click(screen.getByRole("button", { name: "Take a payment" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers no payment to someone who can't take one", async () => {
    backend(
      today([]),
      COUNSELLORS,
      ...PICKED.slice(0, 1),
      on("GET", "/api/students/7/", { ...PROFILE, can_record_payment: false, note: "" }),
      ...PICKED.slice(2),
    );
    renderDesk();
    await findSita();

    expect(screen.queryByRole("button", { name: "Take a payment" })).not.toBeInTheDocument();
    expect(screen.getByText("Nothing written yet.")).toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("The visitor desk in the $name Theme", ({ config, mode }) => {
  it("shows the switch, the form and today's visitors", async () => {
    applyThemeCase(config, mode);
    backend(today([NEW_VISIT]), COUNSELLORS);
    renderDesk();

    expect(screen.getByRole("group", { name: "Type of visit" })).toBeInTheDocument();
    expect(await screen.findByText("Hari Bhandari")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(mode);
  });
});
