import type { RecordId } from "@/lib/recordId";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { PROFILE } from "@/test/studentProfile";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

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

const DEAKIN = {
  id: uid(11),
  university: { id: uid(3), name: "Deakin University" },
  course: { id: uid(4), name: "Master of IT", level: "master" },
  intake: "2027-03",
  status: "offer",
  offer_kind: "unconditional",
  offered_on: null,
  course_files: [],
  offer_letter: null,
  documents: [],
};
const RMIT = {
  id: uid(12),
  university: { id: uid(6), name: "RMIT University" },
  course: { id: uid(9), name: "Master of Data Science", level: "master" },
  intake: "2027-07",
  status: "applied",
  offer_kind: "",
  offered_on: null,
  course_files: [],
  offer_letter: null,
  documents: [],
};
type VisaDates = { biometrics_at?: string; medical_at?: string; interview_at?: string };
const visa = (id: RecordId, status: string, startedOn = "2026-10-12", dates: VisaDates = {}) => ({
  id,
  application_id: uid(11),
  university: { id: uid(3), name: "Deakin University" },
  course: { id: uid(4), name: "Master of IT", level: "master" },
  status,
  started_on: startedOn,
  biometrics_at: null,
  medical_at: null,
  interview_at: null,
  ...dates,
  documents: [],
});
const AT_OFFER = {
  ...PROFILE,
  stage: "offer",
  applications: [DEAKIN, RMIT],
  visas: [],
  chosen_offer_id: uid(11),
};
const AT_VISA = { ...AT_OFFER, stage: "visa" };
const APPLIED = { ...AT_VISA, visas: [visa(uid(21), "applied")] };

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

const profile = (body: unknown = AT_VISA): Answer => on("GET", `/api/students/${uid(7)}/`, body);

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

async function visaList(): Promise<HTMLElement> {
  return screen.findByRole("list", { name: "Visa" });
}

async function visaSectionHeading(): Promise<HTMLElement> {
  return screen.findByRole("heading", { name: "Visa" });
}

async function applicationRow(university: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: "Applications" });
  const row = within(list)
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(university) !== null);
  if (row === undefined) throw new Error(`No row for ${university}`);
  return row;
}

const STATUS_LIST = "Status of Deakin University visa";
const UPLOAD_LETTER = "Upload visa letter for the Deakin University visa";

/** Choose Granted or Refused in the visa's status list; the asking popup that opens. */
async function choose(result: "Granted" | "Refused"): Promise<HTMLElement> {
  await userEvent.selectOptions(
    within(await visaList()).getByRole("combobox", { name: STATUS_LIST }),
    result.toLowerCase(),
  );
  return screen.findByRole("dialog", { name: `Mark this visa as ${result}?` });
}

/** Choose it and say yes. */
async function decide(result: "Granted" | "Refused"): Promise<void> {
  const asking = await choose(result);
  await userEvent.click(within(asking).getByRole("button", { name: `Mark as ${result}` }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Visa section", () => {
  it("says how a visa comes for the chosen offer when there is none yet", async () => {
    backend(profile(AT_OFFER));
    renderPage();

    expect(
      await screen.findByText(
        "Prepare the visa papers for Deakin University. When the visa is sent to the embassy, mark it as applied.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Visa" })).toBeInTheDocument();
  });

  it("lists every attempt with its University, the day it was applied for and its Status", async () => {
    backend(
      profile({
        ...AT_VISA,
        visas: [visa(uid(22), "applied"), visa(uid(21), "refused", "2026-06-02")],
      }),
    );
    renderPage();

    const rows = within(await visaList()).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [newest, oldest] = rows.map((row) => within(row));
    expect(newest?.getByText("Deakin University")).toBeInTheDocument();
    expect(newest?.getByText("Applied 12 Oct 2026")).toBeInTheDocument();
    expect(newest?.getByRole("combobox", { name: "Status of Deakin University visa" })).toHaveValue(
      "applied",
    );
    expect(oldest?.getByText("Applied 2 Jun 2026")).toBeInTheDocument();
  });

  it("offers only Applied, Granted and Refused", async () => {
    backend(profile(APPLIED));
    renderPage();

    const select = within(await visaList()).getByRole("combobox", {
      name: "Status of Deakin University visa",
    });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Applied", "Granted", "Refused"]);
  });

  it("shows Statuses as words, with no picker or Visa applied, to someone who can't change them", async () => {
    backend(
      profile({ ...APPLIED, visas: [visa(uid(21), "granted")], can_change_applications: false }),
    );
    renderPage();

    const list = await visaList();
    expect(within(list).getByText("Granted")).toBeInTheDocument();
    expect(within(list).queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });
});

describe("Visa applied", () => {
  const APPLY = "Visa applied for Deakin University";

  it("is offered in the Visa section for the Chosen Offer only", async () => {
    backend(profile(AT_OFFER));
    renderPage();

    expect(await screen.findByRole("button", { name: APPLY })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Visa applied for RMIT/ })).not.toBeInTheDocument();
    const deakin = await applicationRow("Deakin University");
    expect(within(deakin).queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });

  it("is not offered while no offer is chosen", async () => {
    backend(profile({ ...AT_OFFER, chosen_offer_id: null }));
    renderPage();

    await visaSectionHeading();
    expect(screen.queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });

  it("is not offered while a visa waits for an answer", async () => {
    backend(profile(APPLIED));
    renderPage();

    await visaList();
    expect(screen.queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });

  it("is not offered once the chosen offer's visa is granted", async () => {
    backend(profile({ ...AT_VISA, visas: [visa(uid(21), "granted")] }));
    renderPage();

    await visaList();
    expect(screen.queryByRole("button", { name: /Visa applied/ })).not.toBeInTheDocument();
  });

  it("is offered again after a refused attempt once the offer is chosen again", async () => {
    backend(profile({ ...AT_OFFER, visas: [visa(uid(21), "refused")] }));
    renderPage();

    expect(await screen.findByRole("button", { name: APPLY })).toBeInTheDocument();
  });

  it("adds the Visa as Applied, and the journey moves to Visa", async () => {
    const fetchFn = backend(
      profile(AT_OFFER),
      on("POST", `/api/students/${uid(7)}/visas/`, APPLIED, 201),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: APPLY }));

    expect(
      await screen.findByText("Visa applied for Deakin University. Stage is now Visa."),
    ).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", `/api/students/${uid(7)}/visas/`)).toEqual({
      application: uid(11),
    });
    expect(screen.getByRole("list", { name: "Stage: Visa" })).toBeInTheDocument();
    expect(
      within(await visaList()).getByRole("combobox", { name: "Status of Deakin University visa" }),
    ).toHaveValue("applied");
  });

  it("shows the API's reason when it is refused", async () => {
    const message = "A visa can only be applied for on the chosen offer.";
    backend(
      profile(AT_OFFER),
      on("POST", `/api/students/${uid(7)}/visas/`, { application: [message] }, 400),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: APPLY }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });
});

describe("changing a Visa's Status", () => {
  const VISA_URL = `/api/students/${uid(7)}/visas/${uid(21)}/`;

  it("asks first, saying it is final, with the cursor on Cancel", async () => {
    const fetchFn = backend(profile(APPLIED));
    renderPage();

    const asking = await choose("Granted");

    expect(
      within(asking).getByText(
        "The Deakin University visa will be Granted. This can't be changed later.",
      ),
    ).toBeVisible();
    expect(within(asking).getByText("A new try is a new visa application.")).toBeVisible();
    expect(within(asking).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "PATCH")).toBe(false);
  });

  it("says where a refusal takes a Student at Visa", async () => {
    backend(profile(APPLIED));
    renderPage();

    const asking = await choose("Refused");

    expect(
      within(asking).getByText(
        "A new try is a new visa application. Refused takes the Student back to Offer, or to Counselling if no offers are left.",
      ),
    ).toBeVisible();
  });

  it.each(["Cancel", "Close"])("%s keeps it Applied and sends nothing", async (button) => {
    const fetchFn = backend(profile(APPLIED));
    renderPage();

    const asking = await choose("Refused");
    await userEvent.click(within(asking).getByRole("button", { name: button }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const select = within(await visaList()).getByRole("combobox", { name: STATUS_LIST });
    expect(select).toHaveValue("applied");
    expect(select).toHaveFocus();
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "PATCH")).toBe(false);
  });

  it("Escape keeps it Applied too", async () => {
    const fetchFn = backend(profile(APPLIED));
    renderPage();

    await choose("Granted");
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(await visaList()).getByRole("combobox", { name: STATUS_LIST })).toHaveValue(
      "applied",
    );
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "PATCH")).toBe(false);
  });

  it("saves it once confirmed, and the journey follows when the Stage moves", async () => {
    const refused = { ...APPLIED, stage: "offer", visas: [visa(uid(21), "refused")] };
    const fetchFn = backend(profile(APPLIED), on("PATCH", VISA_URL, refused));
    renderPage();

    await decide("Refused");

    expect(
      await screen.findByText("Deakin University visa: Refused. Stage is now Offer."),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Offer" })).toBeInTheDocument();
    expect(sentBody(fetchFn, "PATCH", VISA_URL)).toEqual({ status: "refused" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("then shows the Status as a word, with no list, and keeps the cursor on that visa", async () => {
    const saved = {
      ...APPLIED,
      visas: [visa(uid(21), "granted")],
      progress: { percent: 100, next_step: "Visa granted.", is_done: true },
    };
    backend(profile(APPLIED), on("PATCH", VISA_URL, saved));
    renderPage();

    await decide("Granted");

    expect(await screen.findByText("Deakin University visa: Granted")).toBeInTheDocument();
    const row = within(await visaList()).getByRole("listitem");
    expect(within(row).getByText("Granted")).toBeVisible();
    expect(within(row).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(row).getByRole("button", { name: UPLOAD_LETTER })).toHaveFocus();
  });

  it("shows a visa that is already decided as a word, with no list", async () => {
    backend(
      profile({
        ...AT_VISA,
        visas: [visa(uid(22), "applied"), visa(uid(21), "refused", "2026-06-02")],
      }),
    );
    renderPage();

    const [waiting, decided] = within(await visaList()).getAllByRole("listitem");
    if (waiting === undefined || decided === undefined) throw new Error("expected two visas");
    expect(within(waiting).getByRole("combobox", { name: STATUS_LIST })).toHaveValue("applied");
    expect(within(decided).getByText("Refused")).toBeVisible();
    expect(within(decided).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("says a Lost Student's Stage wasn't moved", async () => {
    const lost = { ...APPLIED, stage: "lost", lost_reason: "Moved away." };
    const saved = { ...lost, visas: [visa(uid(21), "refused")] };
    backend(profile(lost), on("PATCH", VISA_URL, saved));
    renderPage();

    await decide("Refused");

    expect(
      await screen.findByText(
        "Deakin University visa: Refused. The Student is Lost, so their Stage was not changed.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the change is no longer allowed, and keeps the stored Status", async () => {
    backend(profile(APPLIED), on("PATCH", VISA_URL, { detail: "Not your Student." }, 403));
    renderPage();

    await decide("Granted");

    const asking = screen.getByRole("dialog", { name: "Mark this visa as Granted?" });
    expect(await within(asking).findByRole("alert")).toHaveTextContent(
      "You can't change this Student any more.",
    );
    await userEvent.click(within(asking).getByRole("button", { name: "Cancel" }));
    expect(within(await visaList()).getByRole("combobox", { name: STATUS_LIST })).toHaveValue(
      "applied",
    );
  });

  it("says the visa is decided when someone else decided it first", async () => {
    backend(
      profile(APPLIED),
      on(
        "PATCH",
        VISA_URL,
        { detail: "This visa is decided. A new try is a new visa application." },
        409,
      ),
    );
    renderPage();

    await decide("Refused");

    const asking = screen.getByRole("dialog", { name: "Mark this visa as Refused?" });
    expect(await within(asking).findByRole("alert")).toHaveTextContent(
      "This visa is decided. A new try is a new visa application.",
    );
  });

  it("shows the API's reason when the status is refused", async () => {
    backend(
      profile(APPLIED),
      on("PATCH", VISA_URL, { status: ["The visa already has this status."] }, 400),
    );
    renderPage();

    await decide("Granted");

    expect(await screen.findByRole("alert")).toHaveTextContent("The visa already has this status.");
  });

  it("refuses an answer that isn't a profile", async () => {
    backend(profile({ ...APPLIED, visas: [{ ...visa(uid(21), "applied"), status: "<script>" }] }));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Visa" })).not.toBeInTheDocument();
  });
});

describe("the visa dates", () => {
  const DATES_URL = `/api/students/${uid(7)}/visas/${uid(21)}/dates/`;
  const BOOKED = {
    ...AT_VISA,
    visas: [
      visa(uid(21), "applied", "2026-10-12", {
        biometrics_at: "2030-11-04T10:30",
        interview_at: "2030-11-20T14:00",
      }),
    ],
  };

  async function openDates(name: string): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name }));
    return screen.findByRole("dialog", { name: "Visa dates for Sita Gurung" });
  }

  it("shows each booked date on the card, with a button to change them", async () => {
    backend(profile(BOOKED));
    renderPage();

    const row = within(await visaList()).getByRole("listitem");
    expect(within(row).getByText("Biometrics: 4 Nov 2030 at 10:30 AM")).toBeInTheDocument();
    expect(within(row).getByText("Interview: 20 Nov 2030 at 2:00 PM")).toBeInTheDocument();
    expect(within(row).queryByText(/^Medical/)).not.toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Change dates for the Deakin University visa" }),
    ).toBeInTheDocument();
  });

  it("puts the time beside an AD date, and on its own line under a BS date (ticket 25)", async () => {
    backend(profile(APPLIED));
    const shown = renderPage();
    const add = "Add dates for the Deakin University visa";
    const rowOf = (dialog: HTMLElement) =>
      within(dialog).getByLabelText("Medical time").closest("[data-appointment]");

    // An AD date is one box: the time fits on its line.
    expect(rowOf(await openDates(add))).toHaveClass("phone:grid-cols-2");

    shown.unmount();
    renderPage({ ...COUNSELLOR, dateDisplay: "BS" });
    const row = rowOf(await openDates(add));
    // A BS date is three boxes (day, month, year), so they take the whole line.
    expect(row).not.toHaveClass("phone:grid-cols-2");
    expect(row).toHaveClass("grid", "gap-4");
  });

  it("books dates: only what changed is sent, then a toast and the card shows them", async () => {
    const saved = {
      ...AT_VISA,
      visas: [visa(uid(21), "applied", "2026-10-12", { medical_at: "2030-11-02T09:00" })],
    };
    const fetchFn = backend(profile(APPLIED), on("PATCH", DATES_URL, saved));
    renderPage();

    const dialog = await openDates("Add dates for the Deakin University visa");
    const first = within(dialog).getByLabelText("Biometrics date");
    expect(first).toHaveFocus();
    await userEvent.type(within(dialog).getByLabelText("Medical date"), "2030-11-02");
    await userEvent.type(within(dialog).getByLabelText("Medical time"), "09:00");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(await screen.findByText("Visa dates saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PATCH", DATES_URL)).toEqual({ medical_at: "2030-11-02T09:00" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Medical: 2 Nov 2030 at 9:00 AM")).toBeInTheDocument();
  });

  it("starts from the booked dates and clears one left empty", async () => {
    const fetchFn = backend(profile(BOOKED), on("PATCH", DATES_URL, APPLIED));
    renderPage();

    const dialog = await openDates("Change dates for the Deakin University visa");
    expect(within(dialog).getByLabelText("Biometrics date")).toHaveValue("2030-11-04");
    expect(within(dialog).getByLabelText("Biometrics time")).toHaveValue("10:30");
    expect(within(dialog).getByLabelText("Interview time")).toHaveValue("14:00");
    expect(
      within(dialog).getByText(
        "Each date shows on the Visas list and on Bikash Thapa's Home in the week before. Leave a date empty to remove it.",
      ),
    ).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText("Interview date"));
    await userEvent.clear(within(dialog).getByLabelText("Interview time"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(await screen.findByText("Visa dates saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PATCH", DATES_URL)).toEqual({ interview_at: null });
  });

  it("sends nothing when nothing changed", async () => {
    const fetchFn = backend(profile(BOOKED));
    renderPage();

    const dialog = await openDates("Change dates for the Deakin University visa");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  });

  it.each([
    ["a day with no time", "2030-11-20", "", "Interview time", "Pick a time for the interview."],
    ["a time with no day", "", "14:00", "Interview date", "Pick a day for the interview."],
    ["a day before today", "2020-01-01", "10:00", "Interview date", "Pick today or a later day."],
  ])("refuses %s before sending", async (_, dayValue, timeValue, field, message) => {
    const fetchFn = backend(profile(APPLIED));
    renderPage();

    const dialog = await openDates("Add dates for the Deakin University visa");
    if (dayValue !== "") {
      await userEvent.type(within(dialog).getByLabelText("Interview date"), dayValue);
    }
    if (timeValue !== "") {
      await userEvent.type(within(dialog).getByLabelText("Interview time"), timeValue);
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(field)).toHaveAccessibleDescription(message);
    expect(fetchFn.mock.calls.some(([path]) => path === DATES_URL)).toBe(false);
  });

  it("shows the API's reason under the date it is about", async () => {
    const message = "Pick a day within the next two years.";
    backend(profile(APPLIED), on("PATCH", DATES_URL, { biometrics_at: [message] }, 400));
    renderPage();

    const dialog = await openDates("Add dates for the Deakin University visa");
    await userEvent.type(within(dialog).getByLabelText("Biometrics date"), "2040-01-01");
    await userEvent.type(within(dialog).getByLabelText("Biometrics time"), "09:00");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Biometrics date")).toHaveAccessibleDescription(message);
  });

  it("shows the API's reason when the visa can't take dates any more", async () => {
    const message = "Only a visa waiting for an answer has dates to change.";
    backend(profile(BOOKED), on("PATCH", DATES_URL, { detail: message }, 400));
    renderPage();

    const dialog = await openDates("Change dates for the Deakin University visa");
    await userEvent.clear(within(dialog).getByLabelText("Biometrics date"));
    await userEvent.clear(within(dialog).getByLabelText("Biometrics time"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(await within(dialog).findByText(message)).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    backend(profile(APPLIED));
    renderPage();

    await openDates("Add dates for the Deakin University visa");
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("offers no button on a decided visa, but still shows its dates", async () => {
    backend(
      profile({
        ...AT_VISA,
        visas: [visa(uid(21), "granted", "2026-10-12", { interview_at: "2030-11-20T14:00" })],
      }),
    );
    renderPage();

    const row = within(await visaList()).getByRole("listitem");
    expect(within(row).getByText("Interview: 20 Nov 2030 at 2:00 PM")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /dates/ })).not.toBeInTheDocument();
  });

  it("offers no button to someone who can't change the Student", async () => {
    backend(profile({ ...BOOKED, can_change_applications: false }));
    renderPage();

    const row = within(await visaList()).getByRole("listitem");
    expect(within(row).getByText("Interview: 20 Nov 2030 at 2:00 PM")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /dates/ })).not.toBeInTheDocument();
  });
});

describe("Documents linked to a Visa", () => {
  it("lists them under the Visa", async () => {
    const grant = {
      id: uid(42),
      document_type: { id: uid(10), name: "Visa grant" },
      files: [{ id: uid(62), file_name: "grant.pdf" }],
      verification: "pending",
    };
    backend(profile({ ...AT_VISA, visas: [{ ...visa(uid(21), "granted"), documents: [grant] }] }));
    renderPage();

    const linked = await screen.findByRole("list", {
      name: "Documents for the Deakin University visa",
    });
    expect(within(linked).getByText("Visa grant")).toBeVisible();
    expect(within(linked).getByText("Waiting for a check")).toBeVisible();
  });
});

describe("Upload visa letter", () => {
  const LETTER_URL = `/api/students/${uid(7)}/visas/${uid(21)}/letter/`;
  const UPLOAD = "Upload visa letter for the Deakin University visa";
  const pdf = () => new File(["%PDF-1.7"], "visa-grant.pdf", { type: "application/pdf" });
  const letterDocument = {
    id: uid(43),
    document_type: { id: uid(12), name: "Visa letter" },
    files: [{ id: uid(63), file_name: "visa-grant.pdf" }],
    verification: "pending",
  };

  function sentForm(fetchFn: ReturnType<typeof backend>): FormData {
    const call = fetchFn.mock.calls.find(
      ([p, init]) => method(init) === "POST" && p === LETTER_URL,
    );
    const form = call?.[1]?.body;
    if (!(form instanceof FormData)) throw new Error("expected a form");
    return form;
  }

  /** Say yes to the popup that asks before the letter decides the visa. */
  async function confirmResult(result: "Granted" | "Refused"): Promise<void> {
    const asking = await screen.findByRole("dialog", { name: `Mark this visa as ${result}?` });
    await userEvent.click(within(asking).getByRole("button", { name: `Mark as ${result}` }));
  }

  async function openLetter(): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: UPLOAD }));
    return screen.findByRole("dialog", { name: "Upload the visa letter" });
  }

  it("is offered on every visa to their counsellor", async () => {
    backend(profile({ ...AT_VISA, visas: [visa(uid(21), "applied"), visa(uid(22), "granted")] }));
    renderPage();

    const rows = within(await visaList()).getAllByRole("listitem");
    for (const row of rows) {
      expect(within(row).getByRole("button", { name: UPLOAD })).toBeInTheDocument();
    }
  });

  it("is not offered to someone who can't change the Student", async () => {
    backend(profile({ ...APPLIED, can_change_applications: false }));
    renderPage();

    await visaList();
    expect(screen.queryByRole("button", { name: UPLOAD })).not.toBeInTheDocument();
  });

  it("uploads with Granted: the status and the letter come back together", async () => {
    const saved = {
      ...APPLIED,
      visas: [{ ...visa(uid(21), "granted"), documents: [letterDocument] }],
      progress: { percent: 100, next_step: "Visa granted.", is_done: true },
    };
    const fetchFn = backend(profile(APPLIED), on("POST", LETTER_URL, saved, 201));
    renderPage();

    const dialog = await openLetter();
    expect(within(dialog).getByRole("radio", { name: "Granted" })).not.toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Refused" })).not.toBeChecked();
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("radio", { name: "Granted" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(fetchFn.mock.calls.some(([p]) => p === LETTER_URL)).toBe(false);
    await confirmResult("Granted");

    expect(await screen.findByText("Deakin University visa: Granted")).toBeInTheDocument();
    const form = sentForm(fetchFn);
    expect(form.get("result")).toBe("granted");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const linked = await screen.findByRole("list", {
      name: "Documents for the Deakin University visa",
    });
    expect(within(linked).getByText("Visa letter")).toBeVisible();
  });

  it("uploads with Refused, says what happens, and the journey follows", async () => {
    const refused = { ...APPLIED, stage: "offer", visas: [visa(uid(21), "refused")] };
    backend(profile(APPLIED), on("POST", LETTER_URL, refused, 201));
    renderPage();

    const dialog = await openLetter();
    expect(
      within(dialog).getByText(
        "The visa's status changes to match. Refused takes the Student back to Offer, or to Counselling if no offers are left.",
      ),
    ).toBeInTheDocument();
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("radio", { name: "Refused" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await confirmResult("Refused");

    expect(
      await screen.findByText("Deakin University visa: Refused. Stage is now Offer."),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Offer" })).toBeInTheDocument();
  });

  it("asks for the file and the result before sending anything", async () => {
    const fetchFn = backend(profile(APPLIED));
    renderPage();

    const dialog = await openLetter();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText("Choose a file to upload.")).toBeVisible();
    expect(within(dialog).getByText("Choose Granted or Refused.")).toBeVisible();
    expect(fetchFn.mock.calls.some(([p]) => p === LETTER_URL)).toBe(false);
  });

  it("adds a letter later to a decided visa without asking or changing its status", async () => {
    const decided = { ...AT_VISA, visas: [visa(uid(21), "granted")] };
    const saved = {
      ...AT_VISA,
      visas: [{ ...visa(uid(21), "granted"), documents: [letterDocument] }],
    };
    const fetchFn = backend(profile(decided), on("POST", LETTER_URL, saved, 201));
    renderPage();

    const dialog = await openLetter();
    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    expect(
      within(dialog).getByText("The visa stays Granted. Only the letter is added."),
    ).toBeInTheDocument();
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Visa letter saved")).toBeInTheDocument();
    expect([...sentForm(fetchFn).keys()]).toEqual(["file"]);
  });

  it("asks before a letter decides the visa; Cancel keeps the letter and sends nothing", async () => {
    const fetchFn = backend(profile(APPLIED));
    renderPage();

    const dialog = await openLetter();
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("radio", { name: "Refused" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const asking = await screen.findByRole("dialog", { name: "Mark this visa as Refused?" });
    expect(within(asking).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(asking).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog", { name: /Mark this visa/ })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Upload the visa letter" })).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: "Refused" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Save" })).toHaveFocus();
    expect(fetchFn.mock.calls.some(([p]) => p === LETTER_URL)).toBe(false);
    expect(within(await visaList()).getByRole("combobox", { name: STATUS_LIST })).toHaveValue(
      "applied",
    );
  });

  it("shows the API's reason under the field it refused", async () => {
    const message = "Upload a PDF, JPG or PNG file.";
    backend(profile(APPLIED), on("POST", LETTER_URL, { file: [message] }, 400));
    renderPage();

    const dialog = await openLetter();
    await userEvent.upload(within(dialog).getByLabelText(/The letter/), pdf());
    await userEvent.click(within(dialog).getByRole("radio", { name: "Granted" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await confirmResult("Granted");

    expect(await within(dialog).findByText(message)).toBeVisible();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("closes with Escape and puts focus in the dialog", async () => {
    backend(profile(APPLIED));
    renderPage();

    const dialog = await openLetter();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("Upload visa letter in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("names the result in words in the dialog", async () => {
    backend(profile(APPLIED));
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Upload visa letter for the Deakin University visa",
      }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Upload the visa letter" });
    expect(within(dialog).getByRole("radio", { name: "Granted" })).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: "Refused" })).toBeInTheDocument();
  });

  it("asks before a visa is decided, and then names its Status in words", async () => {
    const saved = { ...APPLIED, visas: [visa(uid(21), "granted")] };
    backend(profile(APPLIED), on("PATCH", `/api/students/${uid(7)}/visas/${uid(21)}/`, saved));
    renderPage();

    const asking = await choose("Granted");
    expect(within(asking).getByRole("button", { name: "Mark as Granted" })).toBeVisible();
    await userEvent.click(within(asking).getByRole("button", { name: "Mark as Granted" }));

    const row = within(await visaList()).getByRole("listitem");
    expect(await within(row).findByText("Granted")).toBeVisible();
  });
});
