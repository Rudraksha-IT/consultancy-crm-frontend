import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { PROFILE } from "@/test/studentProfile";

import { StudentProfilePage } from "./StudentProfilePage";
import { consultancySummary } from "@/test/consultancy";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn<(path: string) => void>() }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));
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

const DEAKIN = {
  id: 11,
  university: { id: 3, name: "Deakin University" },
  course: { id: 4, name: "Master of IT", level: "master" },
  intake: "2027-03",
  status: "applied",
  offer_kind: "",
  offered_on: null,
  offer_letter: null,
  documents: [],
};
const RMIT = {
  id: 12,
  university: { id: 6, name: "RMIT University" },
  course: { id: 9, name: "Master of Data Science", level: "master" },
  intake: "2027-07",
  status: "rejected",
  offer_kind: "",
  offered_on: null,
  offer_letter: null,
  documents: [],
};
const WITH_APPLICATIONS = { ...PROFILE, stage: "applying", applications: [DEAKIN, RMIT] };

const CATALOGUE = {
  count: 3,
  page: 1,
  page_size: 25,
  results: [
    {
      id: 3,
      name: "Deakin University",
      country: "australia",
      archived: false,
      documents: [],
      courses: [
        {
          id: 4,
          university_id: 3,
          name: "Master of IT",
          level: "master",
          intakes: ["2027-03", "2027-07"],
          archived: false,
          documents: [],
          applications: 0,
        },
        {
          id: 5,
          university_id: 3,
          name: "Bachelor of Nursing",
          level: "bachelor",
          intakes: ["2027-02"],
          archived: false,
          documents: [],
          applications: 0,
        },
      ],
    },
    { id: 7, name: "Empty College", country: "uk", archived: false, documents: [], courses: [] },
    {
      id: 6,
      name: "RMIT University",
      country: "australia",
      archived: false,
      documents: [],
      courses: [
        {
          id: 9,
          university_id: 6,
          name: "Master of Data Science",
          level: "master",
          intakes: ["2027-07"],
          archived: false,
          documents: [],
          applications: 0,
        },
      ],
    },
  ],
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

const profile = (body: unknown = WITH_APPLICATIONS): Answer => on("GET", "/api/students/7/", body);
const catalogue = (body: unknown = CATALOGUE, status = 200): Answer =>
  on("GET", "/api/catalogue/universities/", body, status);

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const call = fetchFn.mock.calls.find(([p, init]) => method(init) === verb && p === path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function renderPage(context: StaffContext = COUNSELLOR) {
  return render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <StudentProfilePage studentId={7} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function applicationsList(): Promise<HTMLElement> {
  return screen.findByRole("list", { name: "Applications" });
}

async function openAddDialog(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole("button", { name: "Add application" }));
  const dialog = await screen.findByRole("dialog", { name: "Add Application" });
  await within(dialog).findByRole("option", { name: "Deakin University (Australia)" });
  return dialog;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the Applications tab", () => {
  it("is the first tab, open from the start, with how many there are", async () => {
    backend(profile());
    renderPage();

    const tabs = await screen.findByRole("tablist", { name: "Sections" });
    const names = within(tabs)
      .getAllByRole("tab")
      .map((tab) => tab.textContent);
    expect(names).toEqual(["Applications 2", "Documents 1/8", "Tasks 0", "Profile", "Activity"]);
    expect(within(tabs).getByRole("tab", { name: /Applications/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("lists every Application with its course, Intake and Status", async () => {
    backend(profile());
    renderPage();

    const rows = within(await applicationsList()).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const [deakin, rmit] = rows.map((row) => within(row));
    expect(deakin?.getByText("Deakin University")).toBeInTheDocument();
    expect(deakin?.getByText("Master of IT, starting Mar 2027")).toBeInTheDocument();
    expect(
      deakin?.getByRole("combobox", { name: "Status of Deakin University application" }),
    ).toHaveValue("applied");
    expect(rmit?.getByText("Master of Data Science, starting Jul 2027")).toBeVisible();
  });

  it("offers only Applied and Rejected by hand", async () => {
    backend(profile());
    renderPage();

    const select = within(await applicationsList()).getByRole("combobox", {
      name: "Status of Deakin University application",
    });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Applied", "Rejected"]);
  });

  it("shows an Application with an offer as a chip naming the kind, never a picker", async () => {
    backend(
      profile({
        ...WITH_APPLICATIONS,
        stage: "offer",
        applications: [{ ...DEAKIN, status: "offer", offer_kind: "conditional" }, RMIT],
      }),
    );
    renderPage();

    const list = await applicationsList();
    expect(within(list).getByText("Offer, conditional")).toBeVisible();
    expect(
      within(list).queryByRole("combobox", { name: "Status of Deakin University application" }),
    ).not.toBeInTheDocument();
    expect(
      within(list).getByRole("combobox", { name: "Status of RMIT University application" }),
    ).toBeInTheDocument();
  });

  it("says when there are none yet", async () => {
    backend(profile({ ...PROFILE, applications: [] }));
    renderPage();

    expect(await screen.findByText("No applications yet.")).toBeInTheDocument();
  });

  it("shows Statuses as words, with no picker or Add button, to someone who can't change them", async () => {
    backend(profile({ ...WITH_APPLICATIONS, can_change_applications: false }));
    renderPage();

    const list = await applicationsList();
    expect(within(list).getByText("Applied")).toBeInTheDocument();
    expect(within(list).getByText("Rejected")).toBeInTheDocument();
    expect(within(list).queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add application" })).not.toBeInTheDocument();
  });
});

describe("Documents linked to an Application", () => {
  const OFFER = {
    id: 41,
    document_type: { id: 9, name: "Offer letter" },
    files: [{ id: 61, file_name: "deakin-offer.pdf" }],
    verification: "verified",
  };

  it("lists them under the Application with their state in words", async () => {
    backend(
      profile({ ...WITH_APPLICATIONS, applications: [{ ...DEAKIN, documents: [OFFER] }, RMIT] }),
    );
    renderPage();

    const list = await applicationsList();
    const [deakin, rmit] = within(list)
      .getAllByRole("listitem")
      .filter((row) => row.parentElement === list);
    const linked = within(deakin ?? document.body).getByRole("list", {
      name: "Documents for Deakin University",
    });
    expect(within(linked).getByText("Offer letter")).toBeVisible();
    expect(within(linked).getByText("Checked and correct")).toBeVisible();
    expect(
      within(linked).getByRole("button", { name: "Open deakin-offer.pdf" }),
    ).toBeInTheDocument();
    expect(
      within(rmit ?? document.body).queryByRole("list", { name: /^Documents for/ }),
    ).not.toBeInTheDocument();
  });

  it("shows every file of a linked Document (issue 78)", async () => {
    const twoPages = {
      ...OFFER,
      files: [
        { id: 61, file_name: "offer-page-1.pdf" },
        { id: 63, file_name: "offer-page-2.pdf" },
      ],
    };
    backend(
      profile({ ...WITH_APPLICATIONS, applications: [{ ...DEAKIN, documents: [twoPages] }, RMIT] }),
    );
    renderPage();

    const linked = await screen.findByRole("list", { name: "Documents for Deakin University" });
    expect(within(linked).getByRole("button", { name: "Open offer-page-1.pdf" })).toBeVisible();
    expect(within(linked).getByRole("button", { name: "Open offer-page-2.pdf" })).toBeVisible();
  });

  it("opens a linked file through a short-lived link", async () => {
    const url = "https://files.test/abc/documents/7/offer.pdf?sig=1";
    backend(
      profile({ ...WITH_APPLICATIONS, applications: [{ ...DEAKIN, documents: [OFFER] }, RMIT] }),
      on("GET", "/api/students/7/documents/41/files/61/link/?action=open", {
        url,
        expires_in: 300,
      }),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Open deakin-offer.pdf" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(url);
    });
  });
});

describe("changing an Application's Status", () => {
  it("saves it, and every Application rejected leaves the Student applying", async () => {
    const saved = {
      ...WITH_APPLICATIONS,
      applications: [{ ...DEAKIN, status: "rejected" }, RMIT],
    };
    const fetchFn = backend(profile(), on("PATCH", "/api/students/7/applications/11/", saved));
    renderPage();

    await userEvent.selectOptions(
      within(await applicationsList()).getByRole("combobox", {
        name: "Status of Deakin University application",
      }),
      "rejected",
    );

    expect(await screen.findByText("Deakin University application: Rejected")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Applying" })).toBeInTheDocument();
    expect(sentBody(fetchFn, "PATCH", "/api/students/7/applications/11/")).toEqual({
      status: "rejected",
    });
  });

  it("says only the Status when the Stage stays", async () => {
    const saved = {
      ...WITH_APPLICATIONS,
      applications: [DEAKIN, { ...RMIT, status: "applied" }],
    };
    backend(profile(), on("PATCH", "/api/students/7/applications/12/", saved));
    renderPage();

    await userEvent.selectOptions(
      within(await applicationsList()).getByRole("combobox", {
        name: "Status of RMIT University application",
      }),
      "applied",
    );

    expect(await screen.findByText("RMIT University application: Applied")).toBeInTheDocument();
  });

  it("says a Lost Student's Stage wasn't moved", async () => {
    const lost = { ...WITH_APPLICATIONS, stage: "lost", lost_reason: "Moved away." };
    const saved = { ...lost, applications: [{ ...DEAKIN, status: "rejected" }, RMIT] };
    backend(profile(lost), on("PATCH", "/api/students/7/applications/11/", saved));
    renderPage();

    await userEvent.selectOptions(
      within(await applicationsList()).getByRole("combobox", {
        name: "Status of Deakin University application",
      }),
      "rejected",
    );

    expect(
      await screen.findByText(
        "Deakin University application: Rejected. The Student is Lost, so their Stage was not changed.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the change is no longer allowed, and keeps the stored Status", async () => {
    backend(
      profile(),
      on("PATCH", "/api/students/7/applications/11/", { detail: "Not your Student." }, 403),
    );
    renderPage();
    const select = within(await applicationsList()).getByRole("combobox", {
      name: "Status of Deakin University application",
    });

    await userEvent.selectOptions(select, "rejected");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can't change this Student any more.",
    );
    expect(select).toHaveValue("applied");
  });

  it("shows the API's reason for a refused Status", async () => {
    backend(
      profile(),
      on(
        "PATCH",
        "/api/students/7/applications/12/",
        { status: ["The application already has this status."] },
        400,
      ),
    );
    renderPage();

    await userEvent.selectOptions(
      within(await applicationsList()).getByRole("combobox", {
        name: "Status of RMIT University application",
      }),
      "applied",
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The application already has this status.",
    );
  });
});

describe("Add application", () => {
  it("says when the first Application moves the Student to Applying", async () => {
    const counselling = { ...PROFILE, stage: "counselling", applications: [] };
    const added = { ...counselling, stage: "applying", applications: [DEAKIN] };
    backend(
      profile(counselling),
      catalogue(),
      on("POST", "/api/students/7/applications/", added, 201),
    );
    renderPage();
    const dialog = await openAddDialog();

    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "3");
    await userEvent.selectOptions(within(dialog).getByLabelText("Course"), "5");
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "2027-02");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add Application" }));

    expect(
      await screen.findByText("Application added. Stage is now Applying."),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Stage: Applying" })).toBeInTheDocument();
  });

  it("picks a University, Course and Intake from the Catalogue and adds it as Applied", async () => {
    const added = {
      ...WITH_APPLICATIONS,
      applications: [
        DEAKIN,
        RMIT,
        { ...DEAKIN, id: 13, course: { id: 5, name: "Bachelor of Nursing", level: "bachelor" } },
      ],
    };
    const fetchFn = backend(
      profile(),
      catalogue(),
      on("POST", "/api/students/7/applications/", added, 201),
    );
    renderPage();
    const dialog = await openAddDialog();

    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "3");
    await userEvent.selectOptions(within(dialog).getByLabelText("Course"), "5");
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "2027-02");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add Application" }));

    expect(await screen.findByText("Application added")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", "/api/students/7/applications/")).toEqual({
      course: 5,
      intake: "2027-02",
    });
    expect(within(await applicationsList()).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: /Applications/ })).toHaveTextContent("Applications 3");
  });

  it("offers only Universities with a course, and each course's own Intakes", async () => {
    backend(profile(), catalogue());
    renderPage();
    const dialog = await openAddDialog();

    const universities = within(within(dialog).getByLabelText("University")).getAllByRole("option");
    expect(universities.map((option) => option.textContent)).toEqual([
      "Choose a university",
      "Deakin University (Australia)",
      "RMIT University (Australia)",
    ]);
    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "3");
    await userEvent.selectOptions(within(dialog).getByLabelText("Course"), "4");
    const intakes = within(within(dialog).getByLabelText("Intake")).getAllByRole("option");
    expect(intakes.map((option) => option.textContent)).toEqual([
      "Choose an intake",
      "Mar 2027",
      "Jul 2027",
    ]);
    expect(within(dialog).getByText(/Only active Catalogue entries/)).toBeInTheDocument();
  });

  it("starts the Course and Intake again when another University is picked", async () => {
    backend(profile(), catalogue());
    renderPage();
    const dialog = await openAddDialog();
    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "3");
    await userEvent.selectOptions(within(dialog).getByLabelText("Course"), "4");
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "2027-07");

    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "6");

    expect(within(dialog).getByLabelText("Course")).toHaveValue("");
    expect(within(dialog).getByLabelText("Intake")).toHaveValue("");
  });

  it("asks for each choice before sending anything", async () => {
    const fetchFn = backend(profile(), catalogue());
    renderPage();
    const dialog = await openAddDialog();

    await userEvent.click(within(dialog).getByRole("button", { name: "Add Application" }));

    expect(within(dialog).getByText("Choose a university.")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose a course.")).toBeInTheDocument();
    expect(within(dialog).getByText("Choose an intake.")).toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([, init]) => method(init) === "POST")).toBe(false);
  });

  it("shows the API's reason under the field it refused", async () => {
    backend(
      profile(),
      catalogue(),
      on(
        "POST",
        "/api/students/7/applications/",
        { intake: ["This Student already has an application for this course and intake."] },
        400,
      ),
    );
    renderPage();
    const dialog = await openAddDialog();
    await userEvent.selectOptions(within(dialog).getByLabelText("University"), "3");
    await userEvent.selectOptions(within(dialog).getByLabelText("Course"), "4");
    await userEvent.selectOptions(within(dialog).getByLabelText("Intake"), "2027-03");

    await userEvent.click(within(dialog).getByRole("button", { name: "Add Application" }));

    expect(
      await within(dialog).findByText(
        "This Student already has an application for this course and intake.",
      ),
    ).toBeInTheDocument();
  });

  it("says when the Catalogue couldn't load", async () => {
    backend(profile(), catalogue({}, 500));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Add application" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Application" });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "We couldn't load the Catalogue. Close this and try again.",
    );
  });

  it("says when the Catalogue has no courses yet", async () => {
    backend(profile(), catalogue({ count: 0, page: 1, page_size: 25, results: [] }));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Add application" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Application" });
    expect(
      await within(dialog).findByText(
        "The Catalogue has no courses yet. An Admin adds them on the Catalogue page.",
      ),
    ).toBeInTheDocument();
  });

  it("closes with Escape and puts focus in the dialog", async () => {
    backend(profile(), catalogue());
    renderPage();
    const dialog = await openAddDialog();

    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
