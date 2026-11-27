import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { CHECKLIST, PASSPORT_DOCUMENT, item } from "@/test/documents";
import { PROFILE } from "@/test/studentProfile";

import { StudentProfilePage } from "./StudentProfilePage";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "documents"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const CHECKLIST_PATH = `/api/students/${uid(7)}/documents/`;

function renderPage() {
  render(
    <StaffContextContext value={COUNSELLOR}>
      <ToastProvider>
        <StudentProfilePage studentId={uid(7)} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the profile's Documents tab", () => {
  it("comes after Applications and shows how many are received", async () => {
    backend(on("GET", `/api/students/${uid(7)}/`, PROFILE));
    renderPage();

    const tabs = within(await screen.findByRole("tablist", { name: "Sections" })).getAllByRole(
      "tab",
    );
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Applications 0",
      "Documents 1/8",
      "Tasks 0",
      "Profile",
      "Activity",
    ]);
  });

  it("opens the checklist, and an upload updates the tab's count", async () => {
    const uploaded = {
      ...CHECKLIST,
      done: 3,
      items: CHECKLIST.items.map((one) =>
        one.document_type.id === uid(4)
          ? item({
              id: uid(4),
              name: "Bank Statement",
              state: "waiting",
              document: PASSPORT_DOCUMENT,
            })
          : one,
      ),
    };
    let isUploaded = false;
    backend(
      onEach("GET", `/api/students/${uid(7)}/`, () => ({
        ...PROFILE,
        documents: isUploaded ? { done: 3, total: 4 } : PROFILE.documents,
      })),
      on("GET", CHECKLIST_PATH, CHECKLIST),
      onEach(
        "POST",
        CHECKLIST_PATH,
        () => {
          isUploaded = true;
          return uploaded;
        },
        201,
      ),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Documents 1/8" }));
    await userEvent.click(await screen.findByRole("button", { name: "Upload for Bank Statement" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.upload(
      within(dialog).getByLabelText("File"),
      new File(["%PDF-1.7"], "bank.pdf", { type: "application/pdf" }),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(await screen.findByRole("tab", { name: "Documents 3/4" })).toBeVisible();
  });

  it("offers the Student's Applications and Visas as links when uploading", async () => {
    const deakin = {
      id: uid(11),
      university: { id: uid(3), name: "Deakin University" },
      course: { id: uid(4), name: "Master of IT", level: "master" },
      intake: "2027-03",
      status: "offer",
      offer_kind: "",
      offered_on: null,
      course_files: [],
      offer_letter: null,
      documents: [],
    };
    const visa = {
      id: uid(21),
      application_id: uid(11),
      university: deakin.university,
      course: deakin.course,
      status: "applied",
      started_on: "2026-10-12",
      biometrics_at: null,
      medical_at: null,
      interview_at: null,
      documents: [],
    };
    backend(
      on("GET", `/api/students/${uid(7)}/`, { ...PROFILE, applications: [deakin], visas: [visa] }),
      on("GET", CHECKLIST_PATH, CHECKLIST),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Documents 1/8" }));
    await userEvent.click(await screen.findByRole("button", { name: "Upload for Bank Statement" }));

    const link = within(screen.getByRole("dialog")).getByRole("combobox", {
      name: "Link to (optional)",
    });
    expect(
      within(link)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Just the Student",
      "Application: Deakin University, Master of IT",
      "Visa: Deakin University, Master of IT",
    ]);
  });

  it("reloads the profile after a change, so linked Documents show on the Application", async () => {
    const deakin = {
      id: uid(11),
      university: { id: uid(3), name: "Deakin University" },
      course: { id: uid(4), name: "Master of IT", level: "master" },
      intake: "2027-03",
      status: "applied",
      offer_kind: "",
      offered_on: null,
      course_files: [],
      offer_letter: null,
    };
    const linked = {
      id: uid(31),
      document_type: { id: uid(4), name: "Bank Statement" },
      files: [{ id: uid(41), file_name: "passport.pdf" }],
      verification: "pending",
    };
    let profileCalls = 0;
    backend(
      onEach("GET", `/api/students/${uid(7)}/`, () => {
        profileCalls += 1;
        return {
          ...PROFILE,
          applications: [{ ...deakin, documents: profileCalls === 1 ? [] : [linked] }],
        };
      }),
      on("GET", CHECKLIST_PATH, CHECKLIST),
      on("POST", CHECKLIST_PATH, CHECKLIST, 201),
    );
    renderPage();

    await userEvent.click(await screen.findByRole("tab", { name: "Documents 1/8" }));
    await userEvent.click(await screen.findByRole("button", { name: "Upload for Bank Statement" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Link to (optional)" }),
      "Application: Deakin University, Master of IT",
    );
    await userEvent.upload(
      within(dialog).getByLabelText("File"),
      new File(["%PDF-1.7"], "bank.pdf", { type: "application/pdf" }),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));
    await screen.findByText("Uploaded. Waiting for a check.");
    await userEvent.click(screen.getByRole("tab", { name: /^Applications/ }));

    const list = await screen.findByRole("list", { name: "Documents for Deakin University" });
    expect(within(list).getByText("Bank Statement")).toBeVisible();
  });
});

describe("emailing a Document Type's examples from the checklist (ticket 12)", () => {
  const EMAILING: StaffContext = {
    ...COUNSELLOR,
    consultancy: { ...COUNSELLOR.consultancy, hasContactEmail: true },
    modules: ["students", "documents", "communication"],
  };
  const SAMPLE = {
    id: uid(52),
    file_name: "sample-bank-statement.pdf",
    content_type: "application/pdf",
    size: 1_157_120,
    uploaded_at: "2026-11-20T10:00:00+05:45",
  };
  const INSTRUCTION = "Last 6 months, with the bank's stamp on every page.";
  const WITH_EXAMPLE = {
    ...CHECKLIST,
    items: CHECKLIST.items.map((one) =>
      one.document_type.id === uid(4)
        ? { ...one, instruction: INSTRUCTION, examples: [SAMPLE] }
        : one,
    ),
  };
  const PLAIN = {
    subject: "",
    body: "Dear Sita,\n\nKind regards,\nBikash Thapa\nAcme Education",
    attachments: [],
  };

  function renderWith(context: StaffContext) {
    render(
      <StaffContextContext value={context}>
        <ToastProvider>
          <StudentProfilePage studentId={uid(7)} />
        </ToastProvider>
      </StaffContextContext>,
    );
  }

  async function openExamples() {
    await userEvent.click(await screen.findByRole("tab", { name: "Documents 1/8" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "See the example of Bank Statement" }),
    );
    return screen.getByRole("dialog", { name: "Bank Statement: what it should look like" });
  }

  it("opens the Plain email with the Document Type, its instruction and the example attached", async () => {
    const fetchFn = backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", CHECKLIST_PATH, WITH_EXAMPLE),
      on("GET", `/api/students/${uid(7)}/emails/ready-made/`, {
        kinds: [{ kind: "plain", record: null, records: [], unavailable: null }],
      }),
      on("GET", `/api/students/${uid(7)}/emails/draft/?kind=plain`, PLAIN),
    );
    renderWith(EMAILING);

    const examples = await openExamples();
    await userEvent.click(
      within(examples).getByRole("button", { name: "Email the example to Sita" }),
    );

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(within(dialog).getByRole("textbox", { name: "Subject" })).toHaveValue(
        "An example of the Bank Statement we need",
      );
    });
    expect(within(dialog).getByRole("textbox", { name: "Message" })).toHaveValue(
      `Dear Sita,\n\nHere is an example of the Bank Statement we need. ${INSTRUCTION}\n\nKind regards,\nBikash Thapa\nAcme Education`,
    );
    const attached = within(dialog).getAllByRole("list", { name: "Attached files" })[0];
    expect(attached).toHaveTextContent("sample-bank-statement.pdf");
    expect(callsTo(fetchFn, "GET", `/api/students/${uid(7)}/emails/attachable/`)).toHaveLength(0);
  });

  it("isn't offered when Email is off", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, PROFILE),
      on("GET", CHECKLIST_PATH, WITH_EXAMPLE),
    );
    renderWith(COUNSELLOR);

    const examples = await openExamples();

    expect(within(examples).queryByRole("button", { name: /^Email the example/ })).toBeNull();
  });

  it("isn't offered when the Student has no email address", async () => {
    backend(
      on("GET", `/api/students/${uid(7)}/`, { ...PROFILE, email: "" }),
      on("GET", CHECKLIST_PATH, WITH_EXAMPLE),
    );
    renderWith(EMAILING);

    const examples = await openExamples();

    expect(within(examples).queryByRole("button", { name: /^Email the example/ })).toBeNull();
  });
});
