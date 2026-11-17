import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";
import { PROFILE } from "@/test/studentProfile";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { StudentProfilePage } from "./StudentProfilePage";

vi.mock("@/lib/documents/tab", () => ({ openBlankTab: () => null }));

const COUNSELLOR: StaffContext = {
  staff: { id: 5, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const LETTER = { id: 31, files: [{ id: 51, file_name: "deakin-offer.pdf" }] };
const DEAKIN = {
  id: 11,
  university: { id: 3, name: "Deakin University" },
  course: { id: 4, name: "Master of IT", level: "master" },
  intake: "2027-03",
  status: "offer",
  offer_kind: "unconditional",
  offered_on: "2026-10-10",
  offer_letter: LETTER,
  documents: [],
};
const RMIT = {
  id: 12,
  university: { id: 6, name: "RMIT University" },
  course: { id: 9, name: "Master of Data Science", level: "master" },
  intake: "2027-07",
  status: "offer",
  offer_kind: "",
  offered_on: null,
  offer_letter: null,
  documents: [],
};
const MONASH = {
  id: 13,
  university: { id: 8, name: "Monash University" },
  course: { id: 10, name: "Master of Nursing", level: "master" },
  intake: "2027-02",
  status: "applied",
  offer_kind: "",
  offered_on: null,
  offer_letter: null,
  documents: [],
};
const AT_OFFER = {
  ...PROFILE,
  stage: "offer",
  applications: [DEAKIN, RMIT, MONASH],
  visas: [],
  chosen_offer_id: null,
};
const CHOSEN = { ...AT_OFFER, chosen_offer_id: 11 };
const APPLYING = { ...PROFILE, stage: "applying", applications: [MONASH], chosen_offer_id: null };
const waitingVisa = {
  id: 21,
  application_id: 11,
  university: { id: 3, name: "Deakin University" },
  course: { id: 4, name: "Master of IT", level: "master" },
  status: "applied",
  started_on: "2026-10-20",
  biometrics_at: null,
  medical_at: null,
  interview_at: null,
  documents: [],
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
    method(init) === verb && calledPath === path ? jsonResponse(body, status) : undefined;
}

const profile = (body: unknown = AT_OFFER): Answer => on("GET", "/api/students/7/", body);
const LETTERS_URL = "/api/students/7/offer-letters/";
const CHOSEN_URL = "/api/students/7/chosen-offer/";

function sentInit(fetchFn: ReturnType<typeof backend>, verb: string, path: string) {
  return fetchFn.mock.calls.find(([p, init]) => method(init) === verb && p === path)?.[1];
}

function sentJson(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const body = sentInit(fetchFn, verb, path)?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function renderPage() {
  return render(
    <StaffContextContext value={COUNSELLOR}>
      <ToastProvider>
        <StudentProfilePage studentId={7} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function offerList(): Promise<HTMLElement> {
  return screen.findByRole("list", { name: "Offer letters" });
}

async function offerRow(university: string): Promise<HTMLElement> {
  const row = within(await offerList())
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(university) !== null);
  if (row === undefined) throw new Error(`No offer from ${university}`);
  return row;
}

async function openAddDialog(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole("button", { name: "Add offer letter" }));
  return screen.findByRole("dialog", { name: "Add an offer letter for Sita Gurung" });
}

const pdf = () => new File(["%PDF-1.7"], "deakin-offer.pdf", { type: "application/pdf" });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Offer letters section", () => {
  it("lists every offer with its course, Intake, kind, day and letter", async () => {
    backend(profile());
    renderPage();

    const rows = within(await offerList()).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const deakin = within(await offerRow("Deakin University"));
    expect(
      deakin.getByText("Master of IT, Mar 2027. Unconditional offer, 10 Oct 2026."),
    ).toBeVisible();
    expect(deakin.getByRole("button", { name: "Open deakin-offer.pdf" })).toBeInTheDocument();
    const rmit = within(await offerRow("RMIT University"));
    expect(rmit.getByText("Master of Data Science, Jul 2027. Offer.")).toBeVisible();
  });

  it("says what to do when there are no offers yet", async () => {
    backend(profile(APPLYING));
    renderPage();

    expect(
      await screen.findByText("No offers yet. When a university sends one, add the letter here."),
    ).toBeInTheDocument();
  });

  it("asks to choose one when there are offers and none is chosen", async () => {
    backend(profile());
    renderPage();

    const deakin = within(await offerRow("Deakin University"));
    expect(deakin.getByRole("button", { name: "Go ahead with Deakin University" })).toBeEnabled();
    expect(
      screen.getByText(
        "Choose the one offer the Student will go ahead with. The others stay as they are.",
      ),
    ).toBeInTheDocument();
  });

  it("marks the Chosen Offer with a word, not only a colour", async () => {
    backend(profile(CHOSEN));
    renderPage();

    const deakin = within(await offerRow("Deakin University"));
    expect(deakin.getByText("Chosen")).toBeInTheDocument();
    expect(deakin.queryByRole("button", { name: /Go ahead/ })).not.toBeInTheDocument();
    const rmit = within(await offerRow("RMIT University"));
    expect(rmit.getByRole("button", { name: "Go ahead with RMIT University" })).toBeEnabled();
    expect(
      screen.getByText("The visa and statements documents now follow the chosen offer's country."),
    ).toBeInTheDocument();
  });

  it("can't change the choice while the chosen offer's visa waits for an answer", async () => {
    backend(profile({ ...CHOSEN, stage: "visa", visas: [waitingVisa] }));
    renderPage();

    const rmit = within(await offerRow("RMIT University"));
    expect(rmit.getByRole("button", { name: "Go ahead with RMIT University" })).toBeDisabled();
    expect(
      screen.getByText(
        "The visa for the chosen offer is waiting for an answer, so the choice can't change now.",
      ),
    ).toBeInTheDocument();
  });

  it("offers no buttons to someone who can't change the Student", async () => {
    backend(profile({ ...AT_OFFER, can_change_applications: false }));
    renderPage();

    await offerList();
    expect(screen.queryByRole("button", { name: /Go ahead/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add offer letter" })).not.toBeInTheDocument();
  });

  it("offers Add offer letter only while an application waits for an offer", async () => {
    backend(profile({ ...AT_OFFER, applications: [DEAKIN, RMIT] }));
    renderPage();

    await offerList();
    expect(screen.queryByRole("button", { name: "Add offer letter" })).not.toBeInTheDocument();
  });
});

describe("Go ahead with this", () => {
  it("makes it the Chosen Offer", async () => {
    const fetchFn = backend(profile(), on("PUT", CHOSEN_URL, CHOSEN));
    renderPage();

    await userEvent.click(
      within(await offerRow("Deakin University")).getByRole("button", {
        name: "Go ahead with Deakin University",
      }),
    );

    expect(await screen.findByText("Going ahead with Deakin University")).toBeInTheDocument();
    expect(sentJson(fetchFn, "PUT", CHOSEN_URL)).toEqual({
      application: 11,
    });
    expect(within(await offerRow("Deakin University")).getByText("Chosen")).toBeInTheDocument();
  });

  it("shows the API's reason when it is refused", async () => {
    const message =
      "The visa for the chosen offer is waiting for an answer, so the choice can't change now.";
    backend(profile(CHOSEN), on("PUT", CHOSEN_URL, { application: [message] }, 400));
    renderPage();

    await userEvent.click(
      within(await offerRow("RMIT University")).getByRole("button", {
        name: "Go ahead with RMIT University",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});

describe("Add offer letter", () => {
  it("offers only the applications waiting for an offer, and sends the letter", async () => {
    const saved = {
      ...AT_OFFER,
      applications: [DEAKIN, RMIT, { ...MONASH, status: "offer", offer_kind: "conditional" }],
    };
    const fetchFn = backend(profile(), on("POST", LETTERS_URL, saved, 201));
    renderPage();

    const dialog = await openAddDialog();
    const picker = within(dialog).getByRole("combobox", { name: "Which application" });
    expect(
      within(picker)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Monash University, Master of Nursing"]);
    await userEvent.click(within(dialog).getByRole("radio", { name: "Conditional" }));
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Add offer letter" }));

    expect(
      await screen.findByText("Conditional offer from Monash University added"),
    ).toBeInTheDocument();
    const form = sentInit(fetchFn, "POST", LETTERS_URL)?.body;
    expect(form).toBeInstanceOf(FormData);
    if (!(form instanceof FormData)) return;
    expect(form.get("application")).toBe("13");
    expect(form.get("kind")).toBe("conditional");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says when the first offer moves the Student to Offer", async () => {
    const saved = {
      ...APPLYING,
      stage: "offer",
      applications: [{ ...MONASH, status: "offer", offer_kind: "unconditional" }],
    };
    backend(profile(APPLYING), on("POST", LETTERS_URL, saved, 201));
    renderPage();

    const dialog = await openAddDialog();
    expect(
      within(dialog).getByText("The application becomes Offer, and the Student moves to Offer."),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("radio", { name: "Unconditional" }));
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Add offer letter" }));

    expect(
      await screen.findByText(
        "Unconditional offer from Monash University added. Stage is now Offer.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Offer" })).toBeInTheDocument();
  });

  it("starts at Conditional, and asks for the file before sending anything", async () => {
    const fetchFn = backend(profile());
    renderPage();

    const dialog = await openAddDialog();
    expect(within(dialog).getByRole("radio", { name: "Conditional" })).toBeChecked();
    await userEvent.click(within(dialog).getByRole("button", { name: "Add offer letter" }));

    expect(await within(dialog).findByText("Choose a file to upload.")).toBeVisible();
    expect(sentInit(fetchFn, "POST", LETTERS_URL)).toBeUndefined();
  });

  it("shows the API's reason under the field it refused", async () => {
    const message = "Upload a PDF, JPG or PNG file.";
    backend(profile(), on("POST", LETTERS_URL, { file: [message] }, 400));
    renderPage();

    const dialog = await openAddDialog();
    await userEvent.click(within(dialog).getByRole("radio", { name: "Conditional" }));
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Add offer letter" }));

    expect(await within(dialog).findByText(message)).toBeVisible();
  });

  it("closes with Escape and puts focus in the dialog", async () => {
    backend(profile());
    renderPage();

    const dialog = await openAddDialog();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Visa applied on the Chosen Offer", () => {
  const APPLY = "Visa applied for Deakin University";

  it("says to choose an offer first, with no Visa applied button, when none is chosen", async () => {
    backend(profile());
    renderPage();

    expect(
      await screen.findByText(
        "No visa yet. Choose an offer first, then prepare the papers and apply.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });

  it("is offered in the Visa section for the Chosen Offer", async () => {
    const fetchFn = backend(
      profile(CHOSEN),
      on("POST", "/api/students/7/visas/", { ...CHOSEN, stage: "visa", visas: [waitingVisa] }, 201),
    );
    renderPage();

    expect(
      await screen.findByText(
        "Prepare the visa papers for Deakin University. When the visa is sent to the embassy, mark it as applied.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: APPLY }));

    expect(
      await screen.findByText("Visa applied for Deakin University. Stage is now Visa."),
    ).toBeInTheDocument();
    expect(sentJson(fetchFn, "POST", "/api/students/7/visas/")).toEqual({
      application: 11,
    });
    expect(screen.queryByRole("button", { name: APPLY })).not.toBeInTheDocument();
  });

  it("is not offered on an application row any more", async () => {
    backend(profile(CHOSEN));
    renderPage();

    const list = await screen.findByRole("list", { name: "Applications" });
    expect(within(list).queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });
});

describe("offer changes in Activity", () => {
  it("describes added letters and every choice of offer", async () => {
    const entry = {
      at: "2026-11-03T10:15:00+05:45",
      by: { name: "Bikash Thapa", is_platform_admin: false },
      detail: "",
    };
    backend(
      profile(),
      on("GET", "/api/students/7/visits/?page=1", {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", "/api/students/7/history/", {
        count: 4,
        page: 1,
        page_size: 50,
        results: [
          {
            ...entry,
            id: 4,
            kind: "chosen_offer_changed",
            before: "Deakin University",
            after: "",
            detail: "Automatic: Deakin University visa is Refused.",
          },
          {
            ...entry,
            id: 3,
            kind: "chosen_offer_changed",
            before: "RMIT University",
            after: "Deakin University",
          },
          { ...entry, id: 2, kind: "chosen_offer_changed", before: "", after: "RMIT University" },
          {
            ...entry,
            id: 1,
            kind: "offer_letter_added",
            before: "",
            after: "Deakin University, Conditional",
          },
        ],
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(await screen.findByText("Chosen offer cleared: Deakin University")).toBeInTheDocument();
    expect(screen.getByText("Automatic: Deakin University visa is Refused.")).toBeInTheDocument();
    expect(
      screen.getByText("Chosen offer changed: RMIT University → Deakin University"),
    ).toBeInTheDocument();
    expect(screen.getByText("Chosen offer: RMIT University")).toBeInTheDocument();
    expect(
      screen.getByText("Offer letter added: Deakin University, Conditional"),
    ).toBeInTheDocument();
  });
});

describe("the Bin in Activity (issue 79)", () => {
  it("records putting in, taking out, restoring and deleting, with the reason", async () => {
    const entry = {
      at: "2026-11-03T10:15:00+05:45",
      by: { name: "Bikash Thapa", is_platform_admin: false },
      before: "",
    };
    backend(
      profile(),
      on("GET", "/api/students/7/visits/?page=1", {
        count: 0,
        page: 1,
        page_size: 50,
        results: [],
      }),
      on("GET", "/api/students/7/history/", {
        count: 5,
        page: 1,
        page_size: 50,
        results: [
          { ...entry, id: 5, kind: "document_deleted", after: "CV", detail: "" },
          {
            ...entry,
            id: 4,
            kind: "document_deleted_from_bin",
            after: "Passport",
            detail: "Uploaded twice",
          },
          {
            ...entry,
            id: 3,
            kind: "document_restored",
            after: "page-2.pdf of Passport",
            detail: "Blurry scan",
          },
          { ...entry, id: 2, kind: "document_taken_out", after: "Passport", detail: "" },
          { ...entry, id: 1, kind: "document_binned", after: "Passport", detail: "Uploaded twice" },
        ],
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Activity" }));

    expect(await screen.findByText("Deleted: CV")).toBeInTheDocument();
    expect(screen.getByText("Deleted for good from the Bin: Passport")).toBeInTheDocument();
    expect(screen.getByText("Restored from the Bin: page-2.pdf of Passport")).toBeInTheDocument();
    expect(screen.getByText("Taken out of the Bin: Passport")).toBeInTheDocument();
    expect(screen.getByText("Put in the Bin: Passport")).toBeInTheDocument();
    expect(screen.getAllByText("Uploaded twice")).toHaveLength(2);
    expect(screen.getByText("Blurry scan")).toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("Offer letters in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the offers with the Chosen Offer marked in words", async () => {
    backend(profile(CHOSEN));
    renderPage();

    const deakin = within(await offerRow("Deakin University"));
    expect(deakin.getByText("Chosen")).toBeInTheDocument();
    expect(deakin.getByRole("button", { name: "Open deakin-offer.pdf" })).toBeInTheDocument();
  });
});
