import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { STUDENTS_VIEW_KEY } from "@/constants/students";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";
import { fakeMatchMedia } from "@/test/matchMedia";
import { PROFILE } from "@/test/studentProfile";

import { StudentsPage } from "./StudentsPage";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Asha Admin", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

function as(role: StaffContext["staff"]["role"], id = uid(1)): StaffContext {
  return { ...ADMIN, staff: { ...ADMIN.staff, role, id } };
}

type Row = Record<string, unknown> & { id: string; stage: string };

function student(overrides: Record<string, unknown>): Row {
  return {
    id: uid(1),
    name: "Anish Neupane",
    phone: "9819988776",
    email: "",
    country: "canada",
    source: "walk_in",
    stage: "lead",
    priority: "normal",
    assigned_counsellor: null,
    next_step: "Have the first counselling session",
    documents: { done: 0, total: 10 },
    ...overrides,
  };
}

const ANISH = student({});
const SITA = student({
  id: uid(2),
  name: "Sita Karki",
  country: "australia",
  stage: "applying",
  priority: "high",
  assigned_counsellor: { id: uid(5), name: "Bikash Thapa" },
  next_step: "Waiting for an offer, Deakin University",
  documents: { done: 2, total: 10 },
});
const GONE = student({ id: uid(3), name: "Gita Lost", stage: "lost", next_step: "Lost: Moved" });

function pageOf(results: unknown[], count = results.length, page = 1) {
  return { count, page, page_size: 25, results };
}

type OfficeState = { students: Row[]; stageAnswer: Response | undefined };

const StageBodySchema = z.object({ stage: z.string() });

/** The Stage change the page sent: the fake office moves the Student and answers their profile. */
function moved(state: OfficeState, url: URL, body: unknown): Response {
  if (state.stageAnswer !== undefined) return state.stageAnswer;
  const id = url.pathname.split("/").at(-3);
  const { stage } = StageBodySchema.parse(JSON.parse(typeof body === "string" ? body : "{}"));
  state.students = state.students.map((one) => (one.id === id ? { ...one, stage } : one));
  return jsonResponse({ ...PROFILE, id, stage });
}

function listed(state: OfficeState, url: URL): Response {
  const stage = url.searchParams.get("stage");
  return jsonResponse(pageOf(state.students.filter((one) => (stage ?? one.stage) === one.stage)));
}

/** A fake office: the Students list answers from `students`, by the Stage asked for. */
function office(students: Row[]) {
  const state: OfficeState = { students, stageAnswer: undefined };
  const fetchFn = vi.fn((path: string, init?: RequestInit) => {
    const url = new URL(path, "http://office.test");
    if (url.pathname.endsWith("/stage/")) return Promise.resolve(moved(state, url, init?.body));
    if (url.pathname === "/api/students/") return Promise.resolve(listed(state, url));
    return Promise.resolve(jsonResponse([]));
  });
  vi.stubGlobal("fetch", fetchFn);
  return { fetchFn, state };
}

function calls(fetchFn: ReturnType<typeof office>["fetchFn"], method = "GET"): string[] {
  return fetchFn.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") === method)
    .map(([path]) => path);
}

function boardCalls(fetchFn: ReturnType<typeof office>["fetchFn"]): string[] {
  return calls(fetchFn).filter((path) => path.includes("progress=true"));
}

function renderPage(context: StaffContext = ADMIN, initialStage = "") {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentsPage initialSearch="" initialStage={initialStage} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function column(name: RegExp): Promise<HTMLElement> {
  return screen.findByRole("region", { name });
}

async function card(name: string): Promise<HTMLElement> {
  const link = await screen.findByRole("link", { name });
  const found = link.closest("article");
  if (found === null) throw new Error(`No card for ${name}`);
  return found;
}

function onPhone(): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => query === PHONE_QUERY,
    ).matchMedia,
  );
}

describe("Students board (UI revamp 08)", () => {
  it("shows the five Stages as columns with their counts, and no Lost column", async () => {
    const { fetchFn } = office([ANISH, SITA, GONE]);
    renderPage();

    expect(await column(/^Lead, 1$/)).toBeInTheDocument();
    expect(await column(/^Applying, 1$/)).toBeInTheDocument();
    for (const stage of ["Counselling", "Offer", "Visa"]) {
      const empty = await column(new RegExp(`^${stage}, 0$`));
      expect(within(empty).getByText("Nobody here")).toBeInTheDocument();
    }
    expect(screen.queryByRole("region", { name: /Lost/ })).toBeNull();
    expect(screen.queryByText("Gita Lost")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    const asked = boardCalls(fetchFn).map((path) => new URL(path, "http://x").searchParams);
    expect(asked.map((query) => query.get("stage")).sort()).toEqual(
      ["applying", "counselling", "lead", "offer", "visa"].sort(),
    );
  });

  it("puts a card's name, next step, country, documents and counsellor on it", async () => {
    office([ANISH, SITA]);
    renderPage();

    const sita = await card("Sita Karki");
    expect(within(sita).getByText("Waiting for an offer, Deakin University")).toBeInTheDocument();
    expect(within(sita).getByText("Australia")).toBeInTheDocument();
    expect(within(sita).getByText("2/10 documents")).toBeInTheDocument();
    expect(within(sita).getByLabelText("Counsellor Bikash Thapa")).toHaveTextContent("BT");
    expect(within(sita).getByText("High priority")).toBeInTheDocument();
    const anish = await card("Anish Neupane");
    expect(within(anish).getByText("No counsellor")).toBeInTheDocument();
    expect(within(anish).getByText("0/10 documents")).toBeInTheDocument();
    expect(within(anish).queryByText("High priority")).toBeNull();
  });

  it("heads each column with its Stage's bead", async () => {
    office([ANISH]);
    renderPage();

    const lead = await column(/^Lead/);
    const visa = await column(/^Visa/);
    expect(lead.querySelector("[data-bead]")).toHaveClass("bg-bead-1");
    expect(visa.querySelector("[data-bead]")).toHaveClass("bg-bead-5");
  });

  it("says how to move a card, for a mouse and for a finger", async () => {
    office([ANISH]);
    renderPage();

    await card("Anish Neupane");
    expect(screen.getByText("Drag a card to another Stage, or use Move.")).toBeInTheDocument();
    expect(screen.getByText("Use Move on a card to change its Stage.")).toBeInTheDocument();
  });

  it("switches to the List and back, and remembers the choice on this device", async () => {
    office([ANISH, SITA]);
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await card("Anish Neupane");
    const views = screen.getByRole("group", { name: "Show Students as" });
    expect(within(views).getByRole("button", { name: "Board" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(within(views).getByRole("button", { name: "List" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /^Lead/ })).toBeNull();
    expect(screen.queryByText("Drag a card to another Stage, or use Move.")).toBeNull();
    expect(within(views).getByRole("button", { name: "List" })).toHaveFocus();
    expect(window.localStorage.getItem(STUDENTS_VIEW_KEY)).toBe("list");

    unmount();
    renderPage();
    expect(await screen.findByRole("table")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Board" }));
    expect(await column(/^Lead, 1$/)).toBeInTheDocument();
    expect(window.localStorage.getItem(STUDENTS_VIEW_KEY)).toBe("board");
  });

  it("starts on the Board when what the device remembers is not a view", async () => {
    window.localStorage.setItem(STUDENTS_VIEW_KEY, "<script>alert(1)</script>");
    office([ANISH]);
    renderPage();

    expect(await column(/^Lead, 1$/)).toBeInTheDocument();
  });

  it("opens the Student on a click anywhere on the card, but not from Move", async () => {
    office([ANISH]);
    const user = userEvent.setup();
    renderPage();
    const anish = await card("Anish Neupane");
    const opened = vi.fn((event: Event) => {
      event.preventDefault();
    });
    within(anish).getByRole("link", { name: "Anish Neupane" }).addEventListener("click", opened);

    await user.click(within(anish).getByText("Have the first counselling session"));
    expect(opened).toHaveBeenCalledTimes(1);

    await user.click(within(anish).getByRole("button", { name: "Move Anish Neupane" }));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("dialog", { name: "Move Anish Neupane" })).toBeInTheDocument();
  });

  it("moves a Student back with Move, in place, and keeps the cursor on their card", async () => {
    const { fetchFn } = office([ANISH, SITA]);
    const user = userEvent.setup();
    renderPage();
    const sita = await card("Sita Karki");

    await user.click(within(sita).getByRole("button", { name: "Move Sita Karki" }));
    const dialog = await screen.findByRole("dialog", { name: "Move Sita Karki" });
    expect(within(dialog).getByText("Now: Applying.")).toBeInTheDocument();
    const stages = within(dialog).getByRole("group", { name: "Stages" });
    expect(within(stages).getByRole("button", { name: "Applying" })).toBeDisabled();
    expect(
      within(stages)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Lead", "Counselling", "Applying", "Offer", "Visa", "Mark as Lost"]);
    await user.click(within(stages).getByRole("button", { name: "Counselling" }));

    const counselling = await column(/^Counselling, 1$/);
    expect(within(counselling).getByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
    expect(await column(/^Applying, 0$/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("Stage set to Counselling")).toBeInTheDocument();
    expect(calls(fetchFn, "POST")).toEqual([`/api/students/${uid(2)}/stage/`]);
    await waitFor(() => {
      expect(within(counselling).getByRole("button", { name: "Move Sita Karki" })).toHaveFocus();
    });
  });

  it("shows the server's reason and leaves the card when a move is refused", async () => {
    const { state } = office([SITA]);
    state.stageAnswer = jsonResponse(
      { stage: ["This Student's Stage now follows their Applications."] },
      400,
    );
    const user = userEvent.setup();
    renderPage();
    const sita = await card("Sita Karki");

    await user.click(within(sita).getByRole("button", { name: "Move Sita Karki" }));
    await user.click(await screen.findByRole("button", { name: "Lead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This Student's Stage now follows their Applications.",
    );
    const lead = await column(/^Applying, 1$/);
    expect(within(lead).getByRole("link", { name: "Sita Karki" })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(lead).getByRole("button", { name: "Move Sita Karki" })).toHaveFocus();
    });
  });

  it("asks why before marking a Student Lost from Move", async () => {
    office([ANISH]);
    const user = userEvent.setup();
    renderPage();
    const anish = await card("Anish Neupane");

    await user.click(within(anish).getByRole("button", { name: "Move Anish Neupane" }));
    await user.click(await screen.findByRole("button", { name: "Mark as Lost" }));

    const lost = await screen.findByRole("dialog", { name: "Mark as Lost" });
    await user.type(within(lost).getByRole("textbox"), "Chose another office");
    await user.click(within(lost).getByRole("button", { name: "Mark Lost" }));

    expect(await column(/^Lead, 0$/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Anish Neupane" })).toBeNull();
  });

  it("moves a card dragged back onto an earlier Stage", async () => {
    const { fetchFn } = office([SITA]);
    renderPage();
    const sita = await card("Sita Karki");
    expect(sita).toHaveAttribute("draggable", "true");
    const counselling = await column(/^Counselling, 0$/);
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

    fireEvent.dragStart(sita, { dataTransfer });
    fireEvent.dragOver(counselling, { dataTransfer });
    expect(counselling).toHaveAttribute("data-over", "true");
    fireEvent.drop(counselling, { dataTransfer });

    expect(await column(/^Counselling, 1$/)).toBeInTheDocument();
    expect(calls(fetchFn, "POST")).toEqual([`/api/students/${uid(2)}/stage/`]);
  });

  it("does nothing when a card is dropped on its own Stage", async () => {
    const { fetchFn } = office([ANISH]);
    renderPage();
    const anish = await card("Anish Neupane");
    const lead = await column(/^Lead, 1$/);
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

    fireEvent.dragStart(anish, { dataTransfer });
    fireEvent.drop(lead, { dataTransfer });

    expect(calls(fetchFn, "POST")).toEqual([]);
  });

  it("gives Move only to who may change the Student", async () => {
    const mine = student({
      id: uid(4),
      name: "Mina Mine",
      assigned_counsellor: { id: uid(7), name: "Kiran Counsellor" },
    });
    office([ANISH, mine]);
    renderPage(as("counsellor", uid(7)));

    const own = await card("Mina Mine");
    const other = await card("Anish Neupane");
    expect(within(own).getByRole("button", { name: "Move Mina Mine" })).toBeInTheDocument();
    expect(own).toHaveAttribute("draggable", "true");
    expect(within(other).queryByRole("button", { name: /Move/ })).toBeNull();
    expect(other).toHaveAttribute("draggable", "false");
  });

  it("gives Front Desk the board without Move", async () => {
    office([ANISH]);
    renderPage(as("front_desk"));

    const anish = await card("Anish Neupane");
    expect(within(anish).queryByRole("button", { name: /Move/ })).toBeNull();
  });

  it("shows only that column when the Stage filter is set, Lost too", async () => {
    const { fetchFn } = office([ANISH, SITA, GONE]);
    const user = userEvent.setup();
    renderPage(ADMIN, "applying");

    expect(await column(/^Applying, 1$/)).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: /, \d+$/ })).toHaveLength(1);
    expect(boardCalls(fetchFn)).toHaveLength(1);

    await user.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "lost");

    const lost = await column(/^Lost, 1$/);
    expect(within(lost).getByText("Lost: Moved")).toBeInTheDocument();
    expect(within(lost).queryByRole("button", { name: /^Move/ })).toBeNull();
    expect(
      within(lost).getByRole("button", { name: "Bring back to Counselling: Gita Lost" }),
    ).toBeInTheDocument();
  });

  it("loads more of a long column with Show more", async () => {
    const first = Array.from({ length: 25 }, (_, index) =>
      student({ id: uid(100 + index), name: `Lead ${String(index)}` }),
    );
    const last = student({ id: uid(200), name: "Last Lead" });
    const fetchFn = vi.fn((path: string) => {
      const url = new URL(path, "http://office.test");
      if (url.pathname !== "/api/students/") return Promise.resolve(jsonResponse([]));
      if (url.searchParams.get("stage") !== "lead")
        return Promise.resolve(jsonResponse(pageOf([])));
      return Promise.resolve(
        jsonResponse(
          url.searchParams.get("page") === "2" ? pageOf([last], 26, 2) : pageOf(first, 26),
        ),
      );
    });
    vi.stubGlobal("fetch", fetchFn);
    const user = userEvent.setup();
    renderPage();

    const lead = await column(/^Lead, 26$/);
    expect(within(lead).getAllByRole("article")).toHaveLength(25);
    await user.click(within(lead).getByRole("button", { name: "Show more: Lead" }));

    expect(await within(lead).findByRole("link", { name: "Last Lead" })).toBeInTheDocument();
    expect(within(lead).getAllByRole("article")).toHaveLength(26);
    expect(within(lead).queryByRole("button", { name: "Show more: Lead" })).toBeNull();
  });

  it("says so when a column could not be loaded", async () => {
    const fetchFn = vi.fn((path: string) =>
      Promise.resolve(
        path.includes("stage=offer") ? jsonResponse({}, 500) : jsonResponse(pageOf([])),
      ),
    );
    vi.stubGlobal("fetch", fetchFn);
    renderPage();

    const offer = await screen.findByRole("region", { name: "Offer" });
    expect(await within(offer).findByText("Couldn't load these Students.")).toBeInTheDocument();
  });

  it("refuses a board answer that is not what the API promises", async () => {
    office([student({ documents: { done: "<b>", total: 10 } })]);
    renderPage();

    const lead = await screen.findByRole("region", { name: "Lead" });
    expect(await within(lead).findByText("Couldn't load these Students.")).toBeInTheDocument();
  });

  it("keeps the page as wide in the List as on the Board, so the switch stays under the pointer (ticket 25)", async () => {
    office([ANISH]);
    const user = userEvent.setup();
    const { container } = renderPage();

    await card("Anish Neupane");
    expect(container.querySelector("[data-wide-page]")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "List" }));
    await screen.findByRole("table");
    expect(container.querySelector("[data-wide-page]")).not.toBeNull();
  });

  it("on a phone, the page is not marked wide", async () => {
    onPhone();
    office([ANISH]);
    const { container } = renderPage();

    await screen.findByRole("table");
    expect(container.querySelector("[data-wide-page]")).toBeNull();
  });

  it("on a phone, shows the List only: no switch and no board", async () => {
    onPhone();
    const { fetchFn } = office([ANISH, SITA]);
    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Show Students as" })).toBeNull();
    expect(screen.queryByRole("region", { name: /^Lead/ })).toBeNull();
    expect(boardCalls(fetchFn)).toEqual([]);
  });
});
