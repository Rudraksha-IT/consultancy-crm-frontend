import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";
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

const ID = uid(1);
const NAME = "Anish Neupane";
const BIKASH = { id: uid(5), name: "Bikash Thapa" };

type Application = Record<string, unknown> & { id: string; status: string };

function application(overrides: Partial<Application>): Application {
  return {
    id: uid(11),
    university: { id: uid(3), name: "Deakin University" },
    course: { id: uid(4), name: "Master of IT", level: "master" },
    intake: "2027-03",
    status: "applied",
    offer_kind: "",
    offered_on: null,
    course_files: [],
    offer_letter: null,
    documents: [],
    ...overrides,
  };
}

const DEAKIN = application({});
const DEAKIN_OFFER = application({ status: "offer", offer_kind: "conditional" });
const RMIT_OFFER = application({
  id: uid(12),
  university: { id: uid(6), name: "RMIT University" },
  course: { id: uid(9), name: "Master of Data Science", level: "master" },
  status: "offer",
  offer_kind: "unconditional",
});

const CATALOGUE = {
  count: 1,
  page: 1,
  page_size: 25,
  results: [
    {
      id: uid(3),
      name: "Deakin University",
      country: "australia",
      archived: false,
      documents: [],
      courses: [
        {
          id: uid(4),
          university_id: uid(3),
          name: "Master of IT",
          level: "master",
          intakes: ["2027-03"],
          archived: false,
          documents: [],
          applications: 0,
          files: [],
          file_count: 0,
        },
      ],
    },
  ],
};

type Student = {
  stage: string;
  assigned_counsellor: { id: string; name: string } | null;
  applications: Application[];
  chosen_offer_id: string | null;
  visas: unknown[];
};

const LEAD: Student = {
  stage: "lead",
  assigned_counsellor: null,
  applications: [],
  chosen_offer_id: null,
  visas: [],
};
const COUNSELLING: Student = { ...LEAD, stage: "counselling", assigned_counsellor: BIKASH };
const APPLYING: Student = { ...COUNSELLING, stage: "applying", applications: [DEAKIN] };
const OFFER: Student = { ...COUNSELLING, stage: "offer", applications: [DEAKIN_OFFER, RMIT_OFFER] };

const JOURNEY = ["lead", "counselling", "applying", "offer", "visa"];
const atLeast = (now: string, stage: string): string =>
  JOURNEY.indexOf(now) < JOURNEY.indexOf(stage) ? stage : now;

const StageBody = z.object({ stage: z.string() });
const ApplicationBody = z.object({ application: z.string() });

type Office = { student: Student; refusal: Response | undefined; profileStatus: number };

function profileOf(office: Office): unknown {
  return {
    ...PROFILE,
    ...office.student,
    id: ID,
    name: NAME,
    can_assign: office.student.assigned_counsellor === null,
  };
}

function rowOf(office: Office): unknown {
  return {
    id: ID,
    name: NAME,
    phone: "9819988776",
    email: "",
    country: "canada",
    source: "walk_in",
    stage: office.student.stage,
    priority: "normal",
    assigned_counsellor: office.student.assigned_counsellor,
    next_step: "Have the first counselling session",
    documents: { done: 0, total: 10 },
  };
}

const parsed = (body: unknown): unknown => JSON.parse(typeof body === "string" ? body : "{}");

/** What the fake office does with each change, as the real one would (the Stage engine). */
const CHANGES: Record<string, (office: Office, body: unknown) => void> = {
  "POST assign": (office) => {
    office.student = { ...office.student, assigned_counsellor: BIKASH };
  },
  "POST stage": (office, body) => {
    office.student = { ...office.student, stage: StageBody.parse(parsed(body)).stage };
  },
  "POST applications": (office) => {
    const { student } = office;
    office.student = {
      ...student,
      applications: [...student.applications, DEAKIN],
      stage: atLeast(student.stage, "applying"),
    };
  },
  "POST offer-letters": (office) => {
    const { student } = office;
    office.student = {
      ...student,
      applications: student.applications.map((one) => (one.id === DEAKIN.id ? DEAKIN_OFFER : one)),
      stage: atLeast(student.stage, "offer"),
    };
  },
  "PUT chosen-offer": (office, body) => {
    const chosen = ApplicationBody.parse(parsed(body)).application;
    office.student = { ...office.student, chosen_offer_id: chosen };
  },
  "POST visas": (office, body) => {
    const { student } = office;
    const visa = {
      id: uid(21),
      application_id: ApplicationBody.parse(parsed(body)).application,
      university: { id: uid(3), name: "Deakin University" },
      course: { id: uid(4), name: "Master of IT", level: "master" },
      status: "applied",
      started_on: "2026-11-26",
      biometrics_at: null,
      medical_at: null,
      interview_at: null,
      documents: [],
    };
    office.student = { ...student, visas: [visa], stage: "visa" };
  },
};

function listOf(office: Office, url: URL): Response {
  const asked = url.searchParams.get("stage") ?? office.student.stage;
  const results = asked === office.student.stage ? [rowOf(office)] : [];
  return jsonResponse({ count: results.length, page: 1, page_size: 25, results });
}

/** What the fake office answers when asked to read something. */
const READS: Record<string, (office: Office, url: URL) => Response> = {
  "/api/students/": listOf,
  "/api/staff/counsellors/": () => jsonResponse([{ ...BIKASH, role: "counsellor" }]),
  "/api/catalogue/universities/": () => jsonResponse(CATALOGUE),
  [`/api/students/${ID}/`]: (office) => jsonResponse(profileOf(office), office.profileStatus),
};

function changed(office: Office, key: string, body: unknown): Response {
  const change = CHANGES[key];
  if (change === undefined) return jsonResponse([]);
  if (office.refusal !== undefined) return office.refusal;
  change(office, body);
  return jsonResponse(profileOf(office));
}

/** "POST stage" of a change to `/api/students/<id>/stage/`. */
function changeKey(url: URL, init: RequestInit | undefined): string {
  return `${init?.method ?? "GET"} ${url.pathname.split("/").at(-2) ?? ""}`;
}

function answer(office: Office, url: URL, init: RequestInit | undefined): Response {
  const key = changeKey(url, init);
  const read = key.startsWith("GET ") ? READS[url.pathname] : undefined;
  return read === undefined ? changed(office, key, init?.body) : read(office, url);
}

/** A fake office with one Student, whose Stage follows their records as the real one's does. */
function officeWith(student: Student) {
  const office: Office = { student, refusal: undefined, profileStatus: 200 };
  const fetchFn = vi.fn((path: string, init?: RequestInit) =>
    Promise.resolve(answer(office, new URL(path, "http://office.test"), init)),
  );
  vi.stubGlobal("fetch", fetchFn);
  return { office, fetchFn };
}

/** Every change sent, in order: "POST assign", "POST stage", ... */
function changes(fetchFn: ReturnType<typeof officeWith>["fetchFn"]): string[] {
  return fetchFn.mock.calls
    .filter(([, init]) => (init?.method ?? "GET") !== "GET")
    .map(([path, init]) => `${init?.method ?? ""} ${path.split("/").at(-2) ?? ""}`);
}

function renderBoard() {
  return render(
    <StaffContextContext value={ADMIN}>
      <ToastProvider>
        <StudentsPage initialSearch="" initialStage="" />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function column(name: RegExp): Promise<HTMLElement> {
  return screen.findByRole("region", { name });
}

async function moveTo(user: ReturnType<typeof userEvent.setup>, stage: string): Promise<void> {
  await user.click(await screen.findByRole("button", { name: `Move ${NAME}` }));
  const dialog = await screen.findByRole("dialog", { name: `Move ${NAME}` });
  await user.click(within(dialog).getByRole("button", { name: stage }));
}

async function dragTo(stage: RegExp): Promise<void> {
  const link = await screen.findByRole("link", { name: NAME });
  const card = link.closest("article");
  if (card === null) throw new Error("No card");
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.drop(await column(stage), { dataTransfer });
}

async function assign(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const dialog = await screen.findByRole("dialog", { name: `Who counsels ${NAME}?` });
  await within(dialog).findByRole("option", { name: "Bikash Thapa" });
  await user.selectOptions(within(dialog).getByLabelText("Counsellor"), BIKASH.id);
  await user.click(within(dialog).getByRole("button", { name: "Assign and move" }));
}

async function addApplication(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const dialog = await screen.findByRole("dialog", { name: "Add Application" });
  await within(dialog).findByRole("option", { name: "Deakin University (Australia)" });
  await user.selectOptions(within(dialog).getByLabelText("University"), uid(3));
  await user.selectOptions(within(dialog).getByLabelText("Course"), uid(4));
  await user.selectOptions(within(dialog).getByLabelText("Intake"), "2027-03");
  await user.click(within(dialog).getByRole("button", { name: "Add Application" }));
}

async function addOfferLetter(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const dialog = await screen.findByRole("dialog", { name: `Add an offer letter for ${NAME}` });
  const pdf = new File(["%PDF-1.7"], "deakin-offer.pdf", { type: "application/pdf" });
  await user.upload(within(dialog).getByLabelText(/The letter/), pdf);
  await user.click(within(dialog).getByRole("button", { name: "Add offer letter" }));
}

async function expectMoveFocused(stage: RegExp): Promise<void> {
  const found = await column(stage);
  await waitFor(() => {
    expect(within(found).getByRole("button", { name: `Move ${NAME}` })).toHaveFocus();
  });
}

describe("Board moves ask for each step (UI revamp 09)", () => {
  it("asks who counsels a Lead before Counselling, then moves them", async () => {
    const { fetchFn } = officeWith(LEAD);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Counselling");
    expect(await column(/^Lead, 1$/)).toBeInTheDocument();
    expect(changes(fetchFn)).toEqual([]);
    await assign(user);

    await expectMoveFocused(/^Counselling, 1$/);
    expect(changes(fetchFn)).toEqual(["POST assign", "POST stage"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("refuses to assign nobody", async () => {
    const { fetchFn } = officeWith(LEAD);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Counselling");
    const dialog = await screen.findByRole("dialog", { name: `Who counsels ${NAME}?` });
    await user.click(within(dialog).getByRole("button", { name: "Assign and move" }));

    expect(await within(dialog).findByText("Choose a counsellor from the list.")).toBeVisible();
    expect(changes(fetchFn)).toEqual([]);
  });

  it("moves a Lead to Counselling with no counsellor on Skip for now", async () => {
    const { fetchFn } = officeWith(LEAD);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Counselling");
    const dialog = await screen.findByRole("dialog", { name: `Who counsels ${NAME}?` });
    await user.click(within(dialog).getByRole("button", { name: "Skip for now" }));

    await expectMoveFocused(/^Counselling, 1$/);
    expect(changes(fetchFn)).toEqual(["POST stage"]);
    expect(await screen.findByText("Stage set to Counselling")).toBeInTheDocument();
  });

  it("opens Add Application for Applying, and moves only once it is saved", async () => {
    const { fetchFn } = officeWith(COUNSELLING);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Applying");
    await screen.findByRole("dialog", { name: "Add Application" });
    expect(await column(/^Counselling, 1$/)).toBeInTheDocument();
    await addApplication(user);

    await expectMoveFocused(/^Applying, 1$/);
    expect(changes(fetchFn)).toEqual(["POST applications"]);
  });

  it("asks for the Application first when Offer is wanted and none waits for an offer", async () => {
    const { fetchFn } = officeWith(COUNSELLING);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Offer");
    await addApplication(user);
    await addOfferLetter(user);

    await expectMoveFocused(/^Offer, 1$/);
    expect(changes(fetchFn)).toEqual(["POST applications", "POST offer-letters"]);
  });

  it("asks only for the Offer Letter when an Application waits for one", async () => {
    const { fetchFn } = officeWith(APPLYING);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Offer");
    await addOfferLetter(user);

    await expectMoveFocused(/^Offer, 1$/);
    expect(changes(fetchFn)).toEqual(["POST offer-letters"]);
  });

  it("chooses the offer to go ahead with and applies for the visa", async () => {
    const { fetchFn } = officeWith(OFFER);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Visa");
    const dialog = await screen.findByRole("dialog", { name: "Apply for Anish's visa" });
    const offers = within(dialog).getByRole("radiogroup", { name: "Go ahead with" });
    const [deakin, rmit] = within(offers).getAllByRole("radio");
    expect(deakin).toBeChecked();
    expect(within(offers).getByText("Deakin University")).toBeInTheDocument();
    expect(within(offers).getByText("Master of IT, Conditional offer")).toBeInTheDocument();
    expect(
      within(offers).getByText("Master of Data Science, Unconditional offer"),
    ).toBeInTheDocument();
    if (rmit === undefined) throw new Error("No second offer");
    await user.click(rmit);
    await user.click(within(dialog).getByRole("button", { name: "Apply for the visa" }));

    await expectMoveFocused(/^Visa, 1$/);
    expect(changes(fetchFn)).toEqual(["PUT chosen-offer", "POST visas"]);
    const sent = fetchFn.mock.calls.filter(([, init]) => (init?.method ?? "GET") !== "GET");
    expect(sent.map(([, init]) => parsed(init?.body))).toEqual([
      { application: uid(12) },
      { application: uid(12) },
    ]);
  });

  it("starts on the Chosen Offer and does not choose it again", async () => {
    const { fetchFn } = officeWith({ ...OFFER, chosen_offer_id: uid(12) });
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Visa");
    const dialog = await screen.findByRole("dialog", { name: "Apply for Anish's visa" });
    expect(within(dialog).getAllByRole("radio")[1]).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Apply for the visa" }));

    await expectMoveFocused(/^Visa, 1$/);
    expect(changes(fetchFn)).toEqual(["POST visas"]);
  });

  it("shows why in the popup when the visa is refused, and stays open", async () => {
    const { office, fetchFn } = officeWith({ ...OFFER, chosen_offer_id: uid(11) });
    office.refusal = jsonResponse(
      { application: ["This Student has the most visas allowed."] },
      400,
    );
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Visa");
    const dialog = await screen.findByRole("dialog", { name: "Apply for Anish's visa" });
    await user.click(within(dialog).getByRole("button", { name: "Apply for the visa" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This Student has the most visas allowed.",
    );
    expect(changes(fetchFn)).toEqual(["POST visas"]);
    expect(await column(/^Offer, 1$/)).toBeInTheDocument();
  });

  it("asks for each step in turn when a card is dragged from Lead to Visa", async () => {
    const { fetchFn } = officeWith(LEAD);
    const user = userEvent.setup();
    renderBoard();

    await dragTo(/^Visa, 0$/);
    await assign(user);
    await addApplication(user);
    await addOfferLetter(user);
    const dialog = await screen.findByRole("dialog", { name: "Apply for Anish's visa" });
    expect(within(dialog).getAllByRole("radio")).toHaveLength(1);
    await user.click(within(dialog).getByRole("button", { name: "Apply for the visa" }));

    await expectMoveFocused(/^Visa, 1$/);
    expect(changes(fetchFn)).toEqual([
      "POST assign",
      "POST applications",
      "POST offer-letters",
      "PUT chosen-offer",
      "POST visas",
    ]);
  });

  it("leaves the card where it was when the first step is cancelled", async () => {
    const { fetchFn } = officeWith(COUNSELLING);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Applying");
    const dialog = await screen.findByRole("dialog", { name: "Add Application" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(changes(fetchFn)).toEqual([]);
    await expectMoveFocused(/^Counselling, 1$/);
  });

  it("keeps the steps already saved when a later one is cancelled", async () => {
    const { fetchFn } = officeWith(COUNSELLING);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Offer");
    await addApplication(user);
    const dialog = await screen.findByRole("dialog", { name: `Add an offer letter for ${NAME}` });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await expectMoveFocused(/^Applying, 1$/);
    expect(changes(fetchFn)).toEqual(["POST applications"]);
  });

  it("sends a move back as it is and shows the server's reason when it is refused", async () => {
    const { office, fetchFn } = officeWith(APPLYING);
    const reason = "This Student's Stage now follows their Applications, offer letters and visas.";
    office.refusal = jsonResponse({ stage: [reason] }, 400);
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Counselling");

    expect(await screen.findByRole("alert")).toHaveTextContent(reason);
    expect(changes(fetchFn)).toEqual(["POST stage"]);
    expect(screen.queryByRole("dialog")).toBeNull();
    await expectMoveFocused(/^Applying, 1$/);
  });

  it("says so and leaves the card when the Student could not be loaded", async () => {
    const { office, fetchFn } = officeWith(COUNSELLING);
    office.profileStatus = 500;
    const user = userEvent.setup();
    renderBoard();

    await moveTo(user, "Applying");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't load this Student. Try again.",
    );
    expect(changes(fetchFn)).toEqual([]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
