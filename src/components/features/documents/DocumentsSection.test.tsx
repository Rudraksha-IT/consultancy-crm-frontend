import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import type { DocumentLinkOption, DocumentProgress } from "@/lib/api";
import type { BlankTab } from "@/lib/documents";
import { backend, callsTo, on } from "@/test/backend";
import { CHECKLIST, PASSPORT_DOCUMENT, apiFile, checklistRow, item } from "@/test/documents";

import { DocumentsSection } from "./DocumentsSection";
import { uid } from "@/test/ids";

const { navigate, openBlankTab } = vi.hoisted(() => ({
  navigate: vi.fn<(path: string) => void>(),
  openBlankTab: vi.fn<() => BlankTab | null>(),
}));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));
vi.mock("@/lib/documents/tab", () => ({ openBlankTab }));

const CHECKLIST_PATH = `/api/students/${uid(7)}/documents/`;
const checklist = (body: unknown = CHECKLIST, status = 200) =>
  on("GET", CHECKLIST_PATH, body, status);

/** Presses "Take it off" in the confirm popup. */
async function confirmTakeOff(): Promise<void> {
  const dialog = screen.getByRole("dialog", { name: /^Take Portfolio off/ });
  await userEvent.click(within(dialog).getByRole("button", { name: "Take it off" }));
}

function renderSection(
  onProgress = vi.fn<(progress: DocumentProgress) => void>(),
  links: readonly DocumentLinkOption[] = [],
) {
  render(
    <ToastProvider>
      <DocumentsSection
        studentId={uid(7)}
        studentName="Sita Gurung"
        links={links}
        onProgress={onProgress}
      />
    </ToastProvider>,
  );
  return onProgress;
}

async function rowFor(name: string): Promise<HTMLElement> {
  return waitFor(() => checklistRow(within, screen.getAllByRole("list"), name));
}

function pdf(name = "passport.pdf", size = 2048): File {
  const file = new File(["%PDF-1.7"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

afterEach(() => {
  vi.unstubAllGlobals();
  navigate.mockReset();
  openBlankTab.mockReset();
});

describe("the checklist", () => {
  it("shows how many are received, with a progress bar", async () => {
    backend(checklist());
    renderSection();

    expect(
      await screen.findByRole("heading", { name: "2 of 4 documents received" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Documents received" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("writes each state in words beside its colour", async () => {
    backend(checklist());
    renderSection();

    expect(within(await rowFor("Passport")).getByText("Waiting for a check")).toBeInTheDocument();
    expect(
      within(await rowFor("Citizenship")).getByText("Checked and correct"),
    ).toBeInTheDocument();
    expect(within(await rowFor("SEE Marksheet")).getByText("Rejected")).toBeInTheDocument();
    expect(within(await rowFor("Bank Statement")).getByText("Not received")).toBeInTheDocument();
  });

  it("offers the right action for each state", async () => {
    backend(checklist());
    renderSection();

    expect(
      within(await rowFor("Bank Statement")).getByRole("button", {
        name: "Upload for Bank Statement",
      }),
    ).toBeInTheDocument();
    const passport = await rowFor("Passport");
    expect(
      within(passport).getByRole("button", { name: "It's correct: Passport" }),
    ).toBeInTheDocument();
    expect(within(passport).getByRole("button", { name: "Reject Passport" })).toBeInTheDocument();
    expect(within(passport).queryByRole("button", { name: /^Replace/ })).not.toBeInTheDocument();
    expect(
      within(passport).getByRole("button", { name: "Add a file to Passport" }),
    ).toBeInTheDocument();
    const citizenship = await rowFor("Citizenship");
    expect(
      within(citizenship).getByRole("button", { name: "Add a file to Citizenship" }),
    ).toBeInTheDocument();
    expect(within(citizenship).queryByRole("button", { name: /^Replace/ })).not.toBeInTheDocument();
    expect(
      within(await rowFor("SEE Marksheet")).queryByRole("button", { name: /^Add a file/ }),
    ).not.toBeInTheDocument();
    expect(
      within(await rowFor("SEE Marksheet")).getByRole("button", {
        name: "Upload new copy for SEE Marksheet",
      }),
    ).toBeInTheDocument();
  });

  it("shows why a type is there, and marks one no longer on the checklist", async () => {
    backend(
      checklist({
        ...CHECKLIST,
        items: [
          item({
            id: uid(5),
            name: "Genuine Student statement",
            state: "not_received",
            reason: "For Deakin",
          }),
          item({
            id: uid(6),
            name: "Police report",
            state: "waiting",
            isRequired: false,
            document: PASSPORT_DOCUMENT,
          }),
        ],
      }),
    );
    renderSection();

    expect(within(await rowFor("Genuine Student statement")).getByText("For Deakin")).toBeVisible();
    expect(
      within(await rowFor("Police report")).getByText("Not on the current checklist"),
    ).toBeInTheDocument();
  });

  it("groups the checklist into Applying, Visa and Statements, then Other documents", async () => {
    backend(
      checklist({
        ...CHECKLIST,
        items: [
          item({ id: uid(1), name: "Passport", state: "not_received" }),
          item({
            id: uid(5),
            name: "Police report",
            state: "not_received",
            reason: "For Australia",
            group: "visa",
          }),
          item({
            id: uid(6),
            name: "Genuine Student statement",
            state: "not_received",
            reason: "For Australia",
            group: "statements",
          }),
          item({
            id: uid(7),
            name: "Sponsor Letter",
            state: "verified",
            isRequired: false,
            document: PASSPORT_DOCUMENT,
          }),
        ],
      }),
    );
    renderSection();

    const headings = (await screen.findAllByRole("heading", { level: 3 })).map(
      (h) => h.textContent,
    );
    expect(headings).toEqual([
      "ApplyingFor the university applications",
      "VisaFor the visa application",
      "StatementsWritten statements the country asks for",
      "Other documentsUploaded before, not needed for the current plan. Kept, and moved back if needed again.",
    ]);
    const names = (list: string) =>
      within(screen.getByRole("list", { name: list }))
        .getAllByRole("listitem")
        .filter((li) => li.parentElement?.getAttribute("aria-label") === list)
        .map((li) => li.querySelector("span.font-semibold")?.textContent);
    expect(names("Applying")).toEqual(["Passport"]);
    expect(names("Visa")).toEqual(["Police report"]);
    expect(names("Statements")).toEqual(["Genuine Student statement"]);
    expect(names("Other documents")).toEqual(["Sponsor Letter"]);
    expect(
      within(await rowFor("Sponsor Letter")).getByText("Not on the current checklist"),
    ).toBeVisible();
  });

  it("leaves out a group with nothing in it, and Other documents when there are none", async () => {
    backend(
      checklist({
        ...CHECKLIST,
        items: [item({ id: uid(1), name: "Passport", state: "not_received" })],
      }),
    );
    renderSection();

    await rowFor("Passport");
    expect(screen.queryByRole("list", { name: "Visa" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Other documents" })).not.toBeInTheDocument();
  });

  it("is view only for someone who can't upload, and says who can", async () => {
    backend(checklist({ ...CHECKLIST, can_change: false }));
    renderSection();

    await rowFor("Passport");
    expect(screen.queryByRole("button", { name: /^Upload/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Replace/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^It's correct/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Reject/ })).not.toBeInTheDocument();
    expect(
      screen.getByText("Only the Student's counsellor or an Admin can upload or check files."),
    ).toBeInTheDocument();
    expect(screen.getByText("Files are private to this office.")).toBeInTheDocument();
  });

  it("shows why a Document was rejected", async () => {
    backend(checklist());
    renderSection();

    expect(
      within(await rowFor("SEE Marksheet")).getByText("Reason: Photo is blurred."),
    ).toBeVisible();
  });

  it("shows what a Document is linked to", async () => {
    const visaLinked = {
      ...PASSPORT_DOCUMENT,
      link: { kind: "visa", id: uid(3), university: "Deakin University" },
    };
    backend(
      checklist({
        ...CHECKLIST,
        items: [
          ...CHECKLIST.items,
          item({ id: uid(9), name: "Visa grant", state: "waiting", document: visaLinked }),
        ],
      }),
    );
    renderSection();

    expect(
      within(await rowFor("Citizenship")).getByText("For Federation University"),
    ).toBeVisible();
    expect(
      within(await rowFor("Visa grant")).getByText("For the Deakin University visa"),
    ).toBeVisible();
    expect(within(await rowFor("Passport")).queryByText(/^For /)).not.toBeInTheDocument();
  });

  it("shows a rejection reason as text, never as markup", async () => {
    const reason = '<img src=x onerror="alert(1)">';
    backend(
      checklist({
        ...CHECKLIST,
        items: [
          item({
            id: uid(3),
            name: "SEE Marksheet",
            state: "rejected",
            document: { ...PASSPORT_DOCUMENT, verification: "rejected", rejection_reason: reason },
          }),
        ],
      }),
    );
    renderSection();

    expect(await screen.findByText(`Reason: ${reason}`)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("says when no document is needed yet", async () => {
    backend(checklist({ done: 0, total: 0, can_change: true, asked: [], items: [] }));
    renderSection();

    expect(
      await screen.findByText(
        "No documents are needed yet. An Admin chooses them in Configuration.",
      ),
    ).toBeInTheDocument();
  });

  it("says when it can't be loaded", async () => {
    backend(checklist({ detail: "x" }, 500));
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the checklist.");
  });

  it("shows file names as text, never as markup", async () => {
    const name = '<img src=x onerror="alert(1)">.pdf';
    backend(
      checklist({
        ...CHECKLIST,
        items: [
          item({
            id: uid(1),
            name: "Passport",
            state: "waiting",
            document: { ...PASSPORT_DOCUMENT, files: [apiFile(uid(41), name)] },
          }),
        ],
      }),
    );
    renderSection();

    expect(await screen.findByRole("button", { name: `Open ${name}` })).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("opening a file", () => {
  it("opens a new tab at the click and sends it to the short-lived link", async () => {
    const url = `https://files.test/abc/documents/${uid(7)}/x.pdf?sig=1`;
    backend(
      checklist(),
      on("GET", `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(41)}/link/?action=open`, {
        url,
        expires_in: 300,
      }),
    );
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    openBlankTab.mockReturnValue(tab);
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Open passport.pdf" }));

    expect(openBlankTab).toHaveBeenCalled();
    await waitFor(() => {
      expect(tab.location.replace).toHaveBeenCalledWith(url);
    });
    expect(tab.opener).toBeNull();
  });

  it("saves a file by going to its download link", async () => {
    const url = `https://files.test/abc/documents/${uid(7)}/x.pdf?sig=2`;
    backend(
      checklist(),
      on(
        "GET",
        `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(41)}/link/?action=download`,
        {
          url,
          expires_in: 300,
        },
      ),
    );
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Download passport.pdf" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(url);
    });
    expect(openBlankTab).not.toHaveBeenCalled();
  });

  it("goes to the link here when the browser blocks the new tab", async () => {
    const url = "https://files.test/x.pdf";
    backend(
      checklist(),
      on("GET", `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(41)}/link/?action=open`, {
        url,
        expires_in: 300,
      }),
    );
    openBlankTab.mockReturnValue(null);
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Open passport.pdf" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(url);
    });
  });

  it("closes the new tab and says so when no link comes", async () => {
    backend(
      checklist(),
      on(
        "GET",
        `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(41)}/link/?action=open`,
        {},
        404,
      ),
    );
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    openBlankTab.mockReturnValue(tab);
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Open passport.pdf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't open the file.");
    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.replace).not.toHaveBeenCalled();
  });
});

describe("uploading", () => {
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

  async function openUpload(): Promise<HTMLElement> {
    await userEvent.click(
      within(await rowFor("Bank Statement")).getByRole("button", {
        name: "Upload for Bank Statement",
      }),
    );
    return screen.getByRole("dialog", { name: "Upload a document for Sita Gurung" });
  }

  it("opens with the row's type chosen and focus in the form", async () => {
    backend(checklist());
    renderSection();

    const dialog = await openUpload();

    const type = within(dialog).getByRole("combobox", { name: "Document Type" });
    expect(type).toHaveValue(uid(4));
    expect(type).toHaveFocus();
    expect(
      within(dialog).getByText(
        "PDF or photos, up to 10 MB each. Pick several for one Document, for example the front and back of a passport. Stored privately.",
      ),
    ).toBeVisible();
    expect(within(dialog).getByLabelText("File")).toHaveAttribute("multiple");
  });

  it("uploads the file, confirms and shows the new state and count", async () => {
    const fetchFn = backend(checklist(), on("POST", CHECKLIST_PATH, uploaded, 201));
    const onProgress = renderSection();
    const dialog = await openUpload();

    await userEvent.upload(within(dialog).getByLabelText("File"), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(await screen.findByText("Uploaded. Waiting for a check.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(await rowFor("Bank Statement")).getByText("Waiting for a check")).toBeVisible();
    expect(screen.getByRole("heading", { name: "3 of 4 documents received" })).toBeVisible();
    expect(onProgress).toHaveBeenCalledWith({ done: 3, total: 4 });
    const [call] = callsTo(fetchFn, "POST", CHECKLIST_PATH);
    const body = call?.[1]?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.get("document_type")).toBe(uid(4));
  });

  it("uploads several files as one Document and says so (issue 78)", async () => {
    const fetchFn = backend(checklist(), on("POST", CHECKLIST_PATH, uploaded, 201));
    renderSection();
    const dialog = await openUpload();
    const front = pdf("front.pdf");
    const back = pdf("back.pdf");

    await userEvent.upload(within(dialog).getByLabelText("File"), [front, back]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(
      await screen.findByText("2 files uploaded as one Document. Waiting for a check."),
    ).toBeInTheDocument();
    const [call] = callsTo(fetchFn, "POST", CHECKLIST_PATH);
    const body = call?.[1]?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.getAll("file")).toEqual([front, back]);
  });

  it("refuses too many files at once before sending them", async () => {
    const fetchFn = backend(checklist());
    renderSection();
    const dialog = await openUpload();
    const files = Array.from({ length: 11 }, (_, n) => pdf(`page-${String(n)}.pdf`));

    await userEvent.upload(within(dialog).getByLabelText("File"), files);
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(within(dialog).getByText("Upload at most 10 files at once.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", CHECKLIST_PATH)).toHaveLength(0);
  });

  it("asks for a file before sending anything", async () => {
    const fetchFn = backend(checklist());
    renderSection();
    const dialog = await openUpload();

    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(within(dialog).getByText("Choose a file to upload.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", CHECKLIST_PATH)).toHaveLength(0);
  });

  it.each([
    ["a file over 10 MB", pdf("big.pdf", 10 * 1024 * 1024 + 1), "The file is too big."],
    ["a file that isn't a PDF or photo", pdf("page.html"), "Upload a PDF, JPG or PNG file."],
  ])("refuses %s before sending it", async (_case, file, message) => {
    const fetchFn = backend(checklist());
    renderSection();
    const dialog = await openUpload();

    await userEvent.upload(within(dialog).getByLabelText("File"), file, { applyAccept: false });
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(within(dialog).getByText(new RegExp(message))).toBeVisible();
    expect(callsTo(fetchFn, "POST", CHECKLIST_PATH)).toHaveLength(0);
  });

  it("shows the server's refusal under the file", async () => {
    backend(
      checklist(),
      on("POST", CHECKLIST_PATH, { file: ["Upload a PDF, JPG or PNG file."] }, 400),
    );
    renderSection();
    const dialog = await openUpload();

    await userEvent.upload(within(dialog).getByLabelText("File"), pdf("fake.pdf"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(await within(dialog).findByText("Upload a PDF, JPG or PNG file.")).toBeVisible();
    expect(within(dialog).getByLabelText("File")).toHaveAttribute("aria-invalid", "true");
  });

  it.each([
    [403, "Only the Student's counsellor or an Admin can upload files."],
    [413, "The files are too big together. Upload at most 20 MB at once."],
    [503, "We couldn't upload the file. Try again."],
  ])("explains a %s failure", async (status, message) => {
    backend(checklist(), on("POST", CHECKLIST_PATH, { detail: "x" }, status));
    renderSection();
    const dialog = await openUpload();

    await userEvent.upload(within(dialog).getByLabelText("File"), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
  });

  it("closes with Escape without uploading", async () => {
    const fetchFn = backend(checklist());
    renderSection();
    await openUpload();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", CHECKLIST_PATH)).toHaveLength(0);
  });
});

describe("a Document with several files (issue 78)", () => {
  const twoPages = {
    ...CHECKLIST,
    items: [
      item({
        id: uid(1),
        name: "Passport",
        state: "waiting",
        document: {
          ...PASSPORT_DOCUMENT,
          files: [apiFile(uid(41), "front.jpg"), apiFile(uid(44), "back.jpg")],
        },
      }),
    ],
  };

  it("lists every file, each to open and to save", async () => {
    backend(checklist(twoPages));
    renderSection();

    const files = within(await rowFor("Passport")).getByRole("list", {
      name: "Files of Passport",
    });
    const rows = within(files).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["front.jpg", "back.jpg"]);
    expect(within(files).getByRole("button", { name: "Open back.jpg" })).toBeInTheDocument();
    expect(within(files).getByRole("button", { name: "Download back.jpg" })).toBeInTheDocument();
  });

  it("opens the file asked for, not the first one", async () => {
    const url = `https://files.test/abc/documents/${uid(7)}/back.jpg?sig=1`;
    backend(
      checklist(twoPages),
      on(
        "GET",
        `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(44)}/link/?action=download`,
        {
          url,
          expires_in: 300,
        },
      ),
    );
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Download back.jpg" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(url);
    });
  });
});

describe("adding a file to a Document (issue 78)", () => {
  const FILES_PATH = `/api/students/${uid(7)}/documents/${uid(32)}/files/`;
  const added = {
    ...CHECKLIST,
    items: CHECKLIST.items.map((one) =>
      one.document_type.id === uid(2)
        ? item({
            id: uid(2),
            name: "Citizenship",
            state: "waiting",
            document: {
              ...PASSPORT_DOCUMENT,
              id: uid(32),
              files: [
                apiFile(uid(42), "citizenship.jpg"),
                apiFile(uid(45), "citizenship-back.jpg"),
              ],
            },
          })
        : one,
    ),
  };

  async function openAddFile(name = "Citizenship"): Promise<HTMLElement> {
    await userEvent.click(
      within(await rowFor(name)).getByRole("button", { name: `Add a file to ${name}` }),
    );
    return screen.getByRole("dialog", { name: `Add a file to ${name}` });
  }

  it("says a checked Document will need checking again, with focus in the form", async () => {
    backend(checklist());
    renderSection();

    const dialog = await openAddFile();

    expect(
      within(dialog).getByText(
        "For Sita Gurung. The new file joins the same Document, which then needs checking again.",
      ),
    ).toBeVisible();
    const input = within(dialog).getByLabelText("File");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveFocus();
  });

  it("only says the file joins the Document when it is waiting for a check", async () => {
    backend(checklist());
    renderSection();

    const dialog = await openAddFile("Passport");

    expect(
      within(dialog).getByText("For Sita Gurung. The new file joins the same Document."),
    ).toBeVisible();
  });

  it("adds the file, says it needs checking again and shows it", async () => {
    const fetchFn = backend(checklist(), on("POST", FILES_PATH, added, 201));
    const onProgress = renderSection();
    const dialog = await openAddFile();
    const back = pdf("citizenship-back.pdf");

    await userEvent.upload(within(dialog).getByLabelText("File"), back);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("File added. The Document needs checking again."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const row = await rowFor("Citizenship");
    expect(within(row).getByText("Waiting for a check")).toBeVisible();
    expect(within(row).getByRole("button", { name: "Open citizenship-back.jpg" })).toBeVisible();
    expect(onProgress).toHaveBeenCalledWith({ done: 2, total: 4 });
    const [call] = callsTo(fetchFn, "POST", FILES_PATH);
    const body = call?.[1]?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect([...body.keys()]).toEqual(["file"]);
    expect(body.get("file")).toBe(back);
  });

  it("confirms plainly when the Document was waiting for a check anyway", async () => {
    backend(
      checklist(),
      on("POST", `/api/students/${uid(7)}/documents/${uid(31)}/files/`, CHECKLIST, 201),
    );
    renderSection();
    const dialog = await openAddFile("Passport");

    await userEvent.upload(within(dialog).getByLabelText("File"), [pdf("2.pdf"), pdf("3.pdf")]);
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(await screen.findByText("2 files added")).toBeInTheDocument();
  });

  it.each([
    ["no file", [], "Choose a file to upload."],
    ["a file that isn't a PDF or photo", [pdf("page.html")], "Upload a PDF, JPG or PNG file."],
  ])("refuses %s before sending anything", async (_case, files, message) => {
    const fetchFn = backend(checklist());
    renderSection();
    const dialog = await openAddFile();

    if (files.length > 0) {
      await userEvent.upload(within(dialog).getByLabelText("File"), files, {
        applyAccept: false,
      });
    }
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(within(dialog).getByText(message)).toBeVisible();
    expect(callsTo(fetchFn, "POST", FILES_PATH)).toHaveLength(0);
  });

  it("shows the server's refusal under the file", async () => {
    backend(checklist(), on("POST", FILES_PATH, { file: ["Upload a PDF, JPG or PNG file."] }, 400));
    renderSection();
    const dialog = await openAddFile();

    await userEvent.upload(within(dialog).getByLabelText("File"), pdf("fake.pdf"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(await within(dialog).findByText("Upload a PDF, JPG or PNG file.")).toBeVisible();
  });

  it("shows the server's reason when adding is refused", async () => {
    const detail = "A document can have at most 20 files.";
    backend(checklist(), on("POST", FILES_PATH, { detail }, 400));
    renderSection();
    const dialog = await openAddFile();

    await userEvent.upload(within(dialog).getByLabelText("File"), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(detail);
  });

  it("closes with Escape without adding", async () => {
    const fetchFn = backend(checklist());
    renderSection();
    await openAddFile();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", FILES_PATH)).toHaveLength(0);
  });

  it("is not offered to someone who can only view", async () => {
    backend(checklist({ ...CHECKLIST, can_change: false }));
    renderSection();

    await rowFor("Citizenship");

    expect(screen.queryByRole("button", { name: /^Add a file/ })).not.toBeInTheDocument();
  });
});

describe("checking a document", () => {
  const VERIFY_PATH = `/api/students/${uid(7)}/documents/${uid(31)}/verification/`;
  const verified = {
    ...CHECKLIST,
    items: CHECKLIST.items.map((one) =>
      one.document_type.id === uid(1)
        ? item({
            id: uid(1),
            name: "Passport",
            state: "verified",
            document: { ...PASSPORT_DOCUMENT, verification: "verified" },
          })
        : one,
    ),
  };
  const rejected = {
    ...CHECKLIST,
    done: 1,
    items: CHECKLIST.items.map((one) =>
      one.document_type.id === uid(1)
        ? item({
            id: uid(1),
            name: "Passport",
            state: "rejected",
            document: {
              ...PASSPORT_DOCUMENT,
              verification: "rejected",
              rejection_reason: "Number can't be read.",
            },
          })
        : one,
    ),
  };

  function sentJson(fetchFn: ReturnType<typeof backend>): unknown {
    const [call] = callsTo(fetchFn, "POST", VERIFY_PATH);
    const body = call?.[1]?.body;
    return typeof body === "string" ? JSON.parse(body) : undefined;
  }

  async function openReject(): Promise<HTMLElement> {
    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "Reject Passport" }),
    );
    return screen.getByRole("dialog", { name: "Reject Document" });
  }

  it("marks a Document correct, confirms it and shows the new state", async () => {
    const fetchFn = backend(checklist(), on("POST", VERIFY_PATH, verified));
    const onProgress = renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "It's correct: Passport" }),
    );

    expect(await screen.findByText("Passport verified")).toBeInTheDocument();
    expect(within(await rowFor("Passport")).getByText("Checked and correct")).toBeVisible();
    expect(sentJson(fetchFn)).toEqual({ verification: "verified" });
    expect(onProgress).toHaveBeenCalledWith({ done: 2, total: 4 });
  });

  it("says why a check failed", async () => {
    backend(
      checklist(),
      on("POST", VERIFY_PATH, { detail: "This document has already been checked." }, 400),
    );
    renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "It's correct: Passport" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This document has changed since you opened it. Refresh the page to see it.",
    );
  });

  it("says when checking is no longer allowed", async () => {
    backend(checklist(), on("POST", VERIFY_PATH, { detail: "Not your Student." }, 403));
    renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "It's correct: Passport" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Only the Student's counsellor or an Admin can check files.",
    );
  });

  it("rejects with a reason, confirms and shows the reason", async () => {
    const fetchFn = backend(checklist(), on("POST", VERIFY_PATH, rejected));
    const onProgress = renderSection();
    const dialog = await openReject();

    const reason = within(dialog).getByRole("textbox", { name: "Reason" });
    expect(reason).toHaveFocus();
    await userEvent.type(reason, "Number can't be read.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    expect(
      await screen.findByText("Rejected. Ask the Student for a new copy."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      within(await rowFor("Passport")).getByText("Reason: Number can't be read."),
    ).toBeVisible();
    expect(sentJson(fetchFn)).toEqual({
      verification: "rejected",
      reason: "Number can't be read.",
    });
    expect(onProgress).toHaveBeenCalledWith({ done: 1, total: 4 });
  });

  it("rejects on Ctrl + Enter in the reason, with the keys shown", async () => {
    const fetchFn = backend(checklist(), on("POST", VERIFY_PATH, rejected));
    renderSection();
    const dialog = await openReject();

    const reason = within(dialog).getByRole("textbox", { name: "Reason" });
    expect(within(dialog).getByText("Ctrl + Enter to save")).toBeInTheDocument();
    expect(reason).toHaveAccessibleDescription("Ctrl + Enter to save");
    await userEvent.type(reason, "Number can't be read.{Control>}{Enter}{/Control}");

    expect(
      await screen.findByText("Rejected. Ask the Student for a new copy."),
    ).toBeInTheDocument();
    expect(sentJson(fetchFn)).toEqual({
      verification: "rejected",
      reason: "Number can't be read.",
    });
  });

  it("asks for the reason before sending anything", async () => {
    const fetchFn = backend(checklist());
    renderSection();
    const dialog = await openReject();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Reason" }), "   ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    expect(within(dialog).getByText("Say why the document is rejected.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", VERIFY_PATH)).toHaveLength(0);
  });

  it("shows the server's refusal under the reason", async () => {
    backend(
      checklist(),
      on(
        "POST",
        VERIFY_PATH,
        { reason: ["Ensure this field has no more than 500 characters."] },
        400,
      ),
    );
    renderSection();
    const dialog = await openReject();

    await userEvent.type(within(dialog).getByRole("textbox", { name: "Reason" }), "Too long");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    expect(
      await within(dialog).findByText("Ensure this field has no more than 500 characters."),
    ).toBeVisible();
  });

  it("closes with Escape without rejecting", async () => {
    const fetchFn = backend(checklist());
    renderSection();
    await openReject();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", VERIFY_PATH)).toHaveLength(0);
  });
});

describe("linking an upload", () => {
  const LINKS: DocumentLinkOption[] = [
    {
      kind: "application",
      id: uid(11),
      label: "Application: Federation University, Bachelor of IT",
    },
    { kind: "visa", id: uid(3), label: "Visa: Deakin University, Master of IT" },
  ];

  async function openUpload(): Promise<HTMLElement> {
    await userEvent.click(
      within(await rowFor("Bank Statement")).getByRole("button", {
        name: "Upload for Bank Statement",
      }),
    );
    return screen.getByRole("dialog", { name: "Upload a document for Sita Gurung" });
  }

  it("offers the Student's Applications and Visas, the Student only by default", async () => {
    backend(checklist());
    renderSection(undefined, LINKS);
    const dialog = await openUpload();

    const link = within(dialog).getByRole("combobox", { name: "Link to (optional)" });
    expect(link).toHaveValue("");
    expect(
      within(link)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Just the Student",
      "Application: Federation University, Bachelor of IT",
      "Visa: Deakin University, Master of IT",
    ]);
  });

  it("sends the chosen link with the file", async () => {
    const fetchFn = backend(checklist(), on("POST", CHECKLIST_PATH, CHECKLIST, 201));
    renderSection(undefined, LINKS);
    const dialog = await openUpload();

    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Link to (optional)" }),
      "Visa: Deakin University, Master of IT",
    );
    await userEvent.upload(within(dialog).getByLabelText("File"), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    await screen.findByText("Uploaded. Waiting for a check.");
    const [call] = callsTo(fetchFn, "POST", CHECKLIST_PATH);
    const body = call?.[1]?.body;
    if (!(body instanceof FormData)) throw new Error("expected a form");
    expect(body.get("visa")).toBe(uid(3));
    expect(body.has("application")).toBe(false);
  });

  it("shows the server's refusal under the link", async () => {
    backend(
      checklist(),
      on(
        "POST",
        CHECKLIST_PATH,
        { application: ["Choose one of this Student's applications."] },
        400,
      ),
    );
    renderSection(undefined, LINKS);
    const dialog = await openUpload();

    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Link to (optional)" }),
      "Application: Federation University, Bachelor of IT",
    );
    await userEvent.upload(within(dialog).getByLabelText("File"), pdf());
    await userEvent.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(
      await within(dialog).findByText("Choose one of this Student's applications."),
    ).toBeVisible();
  });

  it("has no link field when the Student has no Applications or Visas", async () => {
    backend(checklist());
    renderSection();
    const dialog = await openUpload();

    expect(
      within(dialog).queryByRole("combobox", { name: "Link to (optional)" }),
    ).not.toBeInTheDocument();
  });
});

describe("documents asked for this Student alone", () => {
  const TYPES_PATH = "/api/documents/types/";
  const ASKED_PATH = `/api/students/${uid(7)}/documents/asked/`;
  const TYPES = {
    results: [
      { id: uid(1), name: "Passport", needed_by_everyone: true, usual_group: "applying" },
      { id: uid(20), name: "Portfolio", needed_by_everyone: false, usual_group: "applying" },
      { id: uid(21), name: "CV", needed_by_everyone: false, usual_group: "applying" },
    ],
  };
  const portfolio = item({
    id: uid(20),
    name: "Portfolio",
    state: "not_received",
    reason: "Added for this Student",
    addedForStudent: true,
  });
  const WITH_PORTFOLIO = {
    ...CHECKLIST,
    total: 5,
    asked: [uid(20)],
    items: [...CHECKLIST.items, portfolio],
  };

  it("offers to ask for another document, saying it is only for this Student", async () => {
    backend(checklist());
    renderSection();

    expect(
      await screen.findByRole("button", { name: "Ask for another document" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Only for this Student. Lists for each country are set in Configuration."),
    ).toBeInTheDocument();
  });

  it("asks for documents in the picker and shows the new checklist", async () => {
    const fetchFn = backend(
      checklist(WITH_PORTFOLIO),
      on("GET", TYPES_PATH, TYPES),
      on("PUT", ASKED_PATH, {
        ...WITH_PORTFOLIO,
        total: 6,
        asked: [uid(20), uid(21)],
        items: [
          ...WITH_PORTFOLIO.items,
          item({
            id: uid(21),
            name: "CV",
            state: "not_received",
            reason: "Added for this Student",
            addedForStudent: true,
          }),
        ],
      }),
    );
    const onProgress = renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Ask for another document" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Ask Sita Gurung for another document",
    });
    expect(
      within(dialog).getByText("Only Sita Gurung will be asked for these."),
    ).toBeInTheDocument();
    expect(await within(dialog).findByLabelText("Portfolio")).toBeChecked();
    await userEvent.click(within(dialog).getByLabelText("CV"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Document list saved")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", ASKED_PATH)[0]?.[1]?.body).toBe(
      JSON.stringify({ document_types: [uid(20), uid(21)] }),
    );
    expect(await rowFor("CV")).toHaveTextContent("Added for this Student");
    expect(onProgress).toHaveBeenLastCalledWith({ done: 2, total: 6 });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("takes one asked for this Student off with Not needed", async () => {
    const fetchFn = backend(
      checklist(WITH_PORTFOLIO),
      on("DELETE", `${ASKED_PATH}${uid(20)}/`, CHECKLIST),
    );
    const onProgress = renderSection();

    await userEvent.click(
      within(await rowFor("Portfolio")).getByRole("button", { name: "Not needed: Portfolio" }),
    );
    await confirmTakeOff();

    expect(await screen.findByText("Taken off the checklist")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `${ASKED_PATH}${uid(20)}/`)).toHaveLength(1);
    await waitFor(() => {
      expect(screen.queryByText("Portfolio")).not.toBeInTheDocument();
    });
    expect(onProgress).toHaveBeenLastCalledWith({ done: 2, total: 4 });
  });

  it("says why Not needed was refused", async () => {
    const reason = "A file is already uploaded for Portfolio, so it stays on the checklist.";
    backend(
      checklist(WITH_PORTFOLIO),
      on("DELETE", `${ASKED_PATH}${uid(20)}/`, { detail: reason }, 400),
    );
    renderSection();

    await userEvent.click(
      within(await rowFor("Portfolio")).getByRole("button", { name: "Not needed: Portfolio" }),
    );
    await confirmTakeOff();

    expect(await within(screen.getByRole("dialog")).findByText(reason)).toBeInTheDocument();
  });

  it("takes nothing off until the popup is confirmed", async () => {
    const fetchFn = backend(checklist(WITH_PORTFOLIO));
    renderSection();

    await userEvent.click(
      within(await rowFor("Portfolio")).getByRole("button", { name: "Not needed: Portfolio" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Take Portfolio off Sita Gurung's checklist?",
    });
    expect(dialog).toHaveTextContent("It is no longer asked for. You can ask for it again later.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `${ASKED_PATH}${uid(20)}/`)).toHaveLength(0);
  });

  it("closes the picker with Cancel, changing nothing", async () => {
    const fetchFn = backend(checklist(WITH_PORTFOLIO), on("GET", TYPES_PATH, TYPES));
    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Ask for another document" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Ask Sita Gurung for another document",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", ASKED_PATH)).toHaveLength(0);
  });

  it("says when Not needed failed for another reason", async () => {
    backend(checklist(WITH_PORTFOLIO), on("DELETE", `${ASKED_PATH}${uid(20)}/`, {}, 500));
    renderSection();

    await userEvent.click(
      within(await rowFor("Portfolio")).getByRole("button", { name: "Not needed: Portfolio" }),
    );
    await confirmTakeOff();

    expect(
      await within(screen.getByRole("dialog")).findByText("We couldn't save that. Try again."),
    ).toBeInTheDocument();
  });

  it("offers Not needed only on documents asked for this Student with nothing uploaded", async () => {
    const uploaded = { ...portfolio, state: "waiting", document: PASSPORT_DOCUMENT };
    backend(checklist({ ...WITH_PORTFOLIO, items: [...CHECKLIST.items, uploaded] }));
    renderSection();

    await rowFor("Portfolio");
    expect(screen.queryByRole("button", { name: /Not needed/ })).not.toBeInTheDocument();
  });

  it("offers none of this to someone who can only view", async () => {
    backend(checklist({ ...WITH_PORTFOLIO, can_change: false }));
    renderSection();

    await rowFor("Portfolio");
    expect(screen.queryByRole("button", { name: /Not needed/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ask for another document" }),
    ).not.toBeInTheDocument();
  });
});
