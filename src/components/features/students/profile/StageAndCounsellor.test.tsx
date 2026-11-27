import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { PROFILE } from "@/test/studentProfile";

import { StudentProfilePage } from "./StudentProfilePage";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const FRONT_DESK: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(8), name: "Ramesh KC", email: "ramesh@acme.test", role: "front_desk" },
};

const CHOICES = [
  { id: uid(2), name: "Anjali Gurung", role: "counsellor" },
  { id: uid(5), name: "Bikash Thapa", role: "counsellor" },
  { id: uid(1), name: "Sunita Shrestha", role: "admin" },
];

const LOST = { ...PROFILE, stage: "lost", lost_reason: "Chose a consultancy in Butwal." };
const UNASSIGNED = {
  ...PROFILE,
  stage: "lead",
  assigned_counsellor: null,
  can_change: true,
  can_set_stage: false,
  can_assign: true,
  can_transfer: false,
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

function on(verb: string, path: string, body: unknown, status = 200): Answer {
  return (calledPath, init) =>
    method(init) === verb && calledPath.startsWith(path) ? jsonResponse(body, status) : undefined;
}

const profile =
  (body: unknown = PROFILE): Answer =>
  (path, init) =>
    method(init) === "GET" && path === `/api/students/${uid(7)}/` ? jsonResponse(body) : undefined;
const choices = on("GET", "/api/staff/counsellors/", CHOICES);

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const call = fetchFn.mock.calls.find(([p, init]) => method(init) === verb && p === path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function renderPage(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={uid(7)} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function openMore(): Promise<void> {
  await userEvent.click(await screen.findByRole("button", { name: /More/ }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("moving the Stage by hand", () => {
  it("moves the Student when another hand-set Stage is clicked", async () => {
    const fetchFn = backend(
      profile(),
      on("POST", `/api/students/${uid(7)}/stage/`, { ...PROFILE, stage: "lead" }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Move to Lead" }));

    expect(await screen.findByText("Stage set to Lead")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Lead" })).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/stage/`)).toEqual({ stage: "lead" });
  });

  it("says why a move was refused", async () => {
    backend(
      profile(),
      on(
        "POST",
        `/api/students/${uid(7)}/stage/`,
        { stage: ["The Student is already at this Stage."] },
        400,
      ),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Move to Lead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The Student is already at this Stage.",
    );
  });

  it("says when the move is no longer allowed", async () => {
    backend(
      profile(),
      on("POST", `/api/students/${uid(7)}/stage/`, { detail: "Not your Student." }, 403),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Move to Lead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can't change this Student any more.",
    );
  });

  it("offers no Stage buttons to someone who can't move the Stage", async () => {
    backend(profile({ ...PROFILE, can_set_stage: false }));
    renderPage();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: /Move to/ })).not.toBeInTheDocument();
  });
});

describe("the next step", () => {
  it("shows the server's next step for every Stage, as Home does (Applying too)", async () => {
    backend(
      profile({
        ...PROFILE,
        stage: "applying",
        progress: {
          percent: 45,
          next_step: "Waiting for an offer, Deakin University",
          is_done: false,
        },
      }),
    );
    renderPage();

    expect(await screen.findByText("Waiting for an offer, Deakin University")).toBeVisible();
    expect(screen.getByText(/Next step:/)).toBeVisible();
  });

  it("says Done and ticks every step once the Visa is granted", async () => {
    backend(
      profile({
        ...PROFILE,
        stage: "visa",
        progress: {
          percent: 100,
          next_step: "Visa granted. Help with flights and pre-departure.",
          is_done: true,
        },
      }),
    );
    renderPage();

    const journey = await screen.findByRole("list", { name: "Stage: Visa" });
    expect(screen.getByText(/Done:/)).toBeVisible();
    const states = within(journey)
      .getAllByRole("listitem")
      .map((step) => step.dataset.state);
    expect(states).toEqual(["done", "done", "done", "done", "done"]);
  });
});

describe("Mark as Lost", () => {
  it("asks why, saves it and shows the Lost banner", async () => {
    const fetchFn = backend(profile(), on("POST", `/api/students/${uid(7)}/stage/`, LOST));
    renderPage();

    await openMore();
    await userEvent.click(screen.getByRole("menuitem", { name: "Mark as Lost" }));
    const dialog = screen.getByRole("dialog", { name: "Mark as Lost" });
    const reason = within(dialog).getByRole("textbox", { name: "Why did we lose this Student?" });
    expect(reason).toHaveFocus();
    expect(within(dialog).getByText(/A visa refusal is not Lost/)).toBeInTheDocument();
    await userEvent.type(reason, "Chose a consultancy in Butwal.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark Lost" }));

    expect(await screen.findByText("Marked as Lost")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Chose a consultancy in Butwal.")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/stage/`)).toEqual({
      stage: "lost",
      lost_reason: "Chose a consultancy in Butwal.",
    });
  });

  it("saves on Ctrl + Enter, with the keys shown beside the button", async () => {
    const fetchFn = backend(profile(), on("POST", `/api/students/${uid(7)}/stage/`, LOST));
    renderPage();

    await openMore();
    await userEvent.click(screen.getByRole("menuitem", { name: "Mark as Lost" }));
    const dialog = screen.getByRole("dialog", { name: "Mark as Lost" });
    const reason = within(dialog).getByRole("textbox", { name: "Why did we lose this Student?" });
    expect(within(dialog).getByText("Ctrl + Enter to save")).toBeInTheDocument();
    expect(reason).toHaveAccessibleDescription(/Ctrl \+ Enter to save$/);
    await userEvent.type(reason, "Chose a consultancy{Enter}in Butwal.{Control>}{Enter}{/Control}");

    expect(await screen.findByText("Marked as Lost")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/stage/`)).toEqual({
      stage: "lost",
      lost_reason: "Chose a consultancy\nin Butwal.",
    });
  });

  it("shows why the reason was refused and keeps the dialog open", async () => {
    backend(
      profile(),
      on(
        "POST",
        `/api/students/${uid(7)}/stage/`,
        { lost_reason: ["Say why we lost this Student."] },
        400,
      ),
    );
    renderPage();

    await openMore();
    await userEvent.click(screen.getByRole("menuitem", { name: "Mark as Lost" }));
    const dialog = screen.getByRole("dialog", { name: "Mark as Lost" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark Lost" }));

    expect(await within(dialog).findByText("Say why we lost this Student.")).toBeInTheDocument();
  });

  it("closes with Escape without saving", async () => {
    const fetchFn = backend(profile());
    renderPage();

    await openMore();
    await userEvent.click(screen.getByRole("menuitem", { name: "Mark as Lost" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "POST")).toBe(false);
  });

  it("is offered last, after Transfer", async () => {
    backend(profile());
    renderPage();

    await openMore();

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Edit details",
      "Transfer to another counsellor",
      "Mark as Lost",
    ]);
  });
});

describe("a Lost Student", () => {
  it("shows why they were lost and brings them back to Counselling", async () => {
    const fetchFn = backend(
      profile(LOST),
      on("POST", `/api/students/${uid(7)}/stage/`, { ...PROFILE, stage: "counselling" }),
    );
    renderPage();

    expect(await screen.findByText("Chose a consultancy in Butwal.")).toBeInTheDocument();
    expect(screen.getByText("Lost.")).toBeInTheDocument();
    await openMore();
    expect(screen.queryByRole("menuitem", { name: "Mark as Lost" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Bring back to Counselling" }));

    expect(await screen.findByText("Back in Counselling")).toBeInTheDocument();
    expect(screen.queryByText("Lost.")).not.toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/stage/`)).toEqual({
      stage: "counselling",
    });
  });

  it("offers no way back to someone who can't move the Stage", async () => {
    backend(profile({ ...LOST, can_change: false, can_set_stage: false, can_transfer: false }));
    renderPage(FRONT_DESK);

    expect(await screen.findByText("Chose a consultancy in Butwal.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bring back to Counselling" }),
    ).not.toBeInTheDocument();
  });
});

describe("assigning a counsellor", () => {
  it("assigns the counsellor picked and shows them", async () => {
    const fetchFn = backend(
      profile(UNASSIGNED),
      choices,
      on("POST", `/api/students/${uid(7)}/assign/`, {
        ...UNASSIGNED,
        assigned_counsellor: { id: uid(2), name: "Anjali Gurung" },
        can_change: false,
        can_assign: false,
      }),
    );
    renderPage(FRONT_DESK);

    await userEvent.click(await screen.findByRole("button", { name: "Assign a counsellor" }));
    const dialog = screen.getByRole("dialog", { name: "Assign a counsellor to Sita Gurung" });
    const select = within(dialog).getByRole("combobox", { name: "Counsellor" });
    await within(dialog).findByRole("option", { name: "Anjali Gurung" });
    await userEvent.selectOptions(select, uid(2));
    await userEvent.click(within(dialog).getByRole("button", { name: "Assign" }));

    expect(await screen.findByText("Counsellor assigned")).toBeInTheDocument();
    expect(screen.getByText("Anjali Gurung")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign a counsellor" })).not.toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/assign/`)).toEqual({
      counsellor: uid(2),
    });
  });

  it("asks for a choice before sending anything", async () => {
    const fetchFn = backend(profile(UNASSIGNED), on("GET", "/api/staff/counsellors/", []));
    renderPage(FRONT_DESK);

    await userEvent.click(await screen.findByRole("button", { name: "Assign a counsellor" }));
    const dialog = screen.getByRole("dialog", { name: "Assign a counsellor to Sita Gurung" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Assign" }));

    expect(within(dialog).getByText("Choose a counsellor from the list.")).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "POST")).toBe(false);
  });

  it("says when someone else assigned them first", async () => {
    backend(
      profile(UNASSIGNED),
      choices,
      on(
        "POST",
        `/api/students/${uid(7)}/assign/`,
        { detail: "Someone else just changed it." },
        409,
      ),
    );
    renderPage(FRONT_DESK);

    await userEvent.click(await screen.findByRole("button", { name: "Assign a counsellor" }));
    const dialog = screen.getByRole("dialog", { name: "Assign a counsellor to Sita Gurung" });
    await within(dialog).findByRole("option", { name: "Anjali Gurung" });
    await userEvent.selectOptions(within(dialog).getByRole("combobox"), uid(2));
    await userEvent.click(within(dialog).getByRole("button", { name: "Assign" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Someone else just changed this Student. Refresh the page to see the change.",
    );
  });
});

describe("Transfer", () => {
  it("transfers to another counsellor, who alone can change them afterwards", async () => {
    const fetchFn = backend(
      profile(),
      choices,
      on("POST", `/api/students/${uid(7)}/transfer/`, {
        ...PROFILE,
        assigned_counsellor: { id: uid(2), name: "Anjali Gurung" },
        can_change: false,
        can_set_stage: false,
        can_transfer: false,
      }),
    );
    renderPage();

    await openMore();
    await userEvent.click(screen.getByRole("menuitem", { name: "Transfer to another counsellor" }));
    const dialog = screen.getByRole("dialog", { name: "Transfer Sita Gurung" });
    expect(dialog).toHaveTextContent(
      "Currently with Bikash Thapa. After the Transfer only the new counsellor (and Admins) can change this Student.",
    );
    const select = within(dialog).getByRole("combobox", { name: "Transfer to" });
    await within(dialog).findByRole("option", { name: "Anjali Gurung" });
    expect(within(select).queryByRole("option", { name: "Bikash Thapa" })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, uid(1));
    await userEvent.click(within(dialog).getByRole("button", { name: "Transfer" }));

    expect(await screen.findByText("Transferred to Anjali Gurung")).toBeInTheDocument();
    expect(
      screen.getByText(/^View only\. Anjali Gurung is this Student's counsellor/),
    ).toBeVisible();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/transfer/`)).toEqual({
      counsellor: uid(1),
    });
  });

  it("is not offered to someone who can't Transfer", async () => {
    backend(profile({ ...PROFILE, can_transfer: false }));
    renderPage();

    await openMore();

    expect(
      screen.queryByRole("menuitem", { name: "Transfer to another counsellor" }),
    ).not.toBeInTheDocument();
  });
});

describe("the Activity tab", () => {
  let entries = 100;
  const entry = (kind: string, before: string, after: string, detail = "") => ({
    id: uid((entries += 1)),
    kind,
    at: "2026-10-22T13:48:00+05:45",
    by: { name: "Bikash Thapa", is_platform_admin: false },
    before,
    after,
    detail,
  });

  it("shows Stage changes with the reason, assignments and Transfers", async () => {
    const lost = {
      ...entry("stage_changed", "counselling", "lost", "Moved to Butwal."),
      id: uid(3),
    };
    backend(
      profile({ ...PROFILE, stage: "lost", stage_changes: [lost] }),
      on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", `/api/students/${uid(7)}/history/`, {
        count: 3,
        page: 1,
        page_size: 50,
        results: [
          lost,
          { ...entry("transferred", "Nabin Adhikari", "Bikash Thapa"), id: uid(2) },
          { ...entry("counsellor_assigned", "", "Nabin Adhikari"), id: uid(1) },
        ],
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    const timeline = await screen.findByRole("list", { name: "Activity" });
    const dot = within(timeline).getByText("Marked Lost").closest("li");
    expect(dot).toHaveTextContent(/Counselling → to\s+Lost/);
    expect(dot).toHaveTextContent("Moved to Butwal.");
    // Listed once, as a dot, though History lists it too.
    expect(within(timeline).getAllByText("Moved to Butwal.")).toHaveLength(1);
    expect(
      within(timeline).getByText("Transferred from Nabin Adhikari to Bikash Thapa"),
    ).toBeInTheDocument();
    expect(within(timeline).getByText("Assigned to Nabin Adhikari")).toBeInTheDocument();
    expect(within(timeline).queryByText(/^Before:/)).not.toBeInTheDocument();
  });

  it("names who asked and who approved a Transfer Request", async () => {
    const approval = "Asked by Anjali Gurung, approved by Bikash Thapa.";
    backend(
      profile(),
      on("GET", `/api/students/${uid(7)}/visits/?page=1`, {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", `/api/students/${uid(7)}/history/`, {
        count: 2,
        page: 1,
        page_size: 50,
        results: [
          { ...entry("transferred", "Bikash Thapa", "Anjali Gurung", approval), id: uid(2) },
          { ...entry("counsellor_assigned", "", "Anjali Gurung", approval), id: uid(1) },
        ],
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    const timeline = await screen.findByRole("list", { name: "Activity" });
    expect(within(timeline).getAllByText(approval)).toHaveLength(2);
  });
});
