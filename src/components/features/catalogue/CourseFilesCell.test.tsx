import { uid } from "@/test/ids";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { CourseSchema, type Course } from "@/lib/api/catalogue/catalogueTypes";
import type { BlankTab } from "@/lib/documents";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { CourseFilesCell } from "./CourseFilesCell";

const { openBlankTab, navigate } = vi.hoisted(() => ({
  openBlankTab: vi.fn<() => BlankTab | null>(),
  navigate: vi.fn(),
}));
vi.mock("@/lib/documents/tab", () => ({ openBlankTab }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const BROCHURE = {
  id: uid(31),
  name: "Deakin IT brochure",
  file_name: "deakin-it.pdf",
  size: 2_516_582,
  uploaded_at: "2026-11-19T10:00:00+05:45",
};
const FEES = {
  id: uid(32),
  name: "Fees 2027",
  file_name: "fees.pdf",
  size: 819_200,
  uploaded_at: "2026-11-19T11:00:00+05:45",
};

function courseWith(files: unknown[]): Course {
  return CourseSchema.parse({
    id: uid(11),
    university_id: uid(1),
    name: "Master of IT",
    level: "master",
    intakes: ["2027-03"],
    archived: false,
    documents: [],
    applications: 0,
    files,
    file_count: files.length,
  });
}

const UPLOAD = `/api/catalogue/courses/${uid(11)}/files/`;
const FILE_31 = `/api/catalogue/course-files/${uid(31)}/`;
const LINK_31 = `/api/catalogue/course-files/${uid(31)}/link/?action=open`;

function pdf(name = "deakin-it_2027.pdf", size = 1000): File {
  const file = new File(["%PDF-1.7"], name, { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function renderCell(files: unknown[] = [BROCHURE, FEES], isLive = true) {
  const onChanged = vi.fn();
  render(
    <ToastProvider>
      <CourseFilesCell course={courseWith(files)} isLive={isLive} onChanged={onChanged} />
    </ToastProvider>,
  );
  return { onChanged };
}

function fileNames(): string[] {
  const list = screen.queryByRole("list", { name: "Course Files: Master of IT" });
  if (list === null) return [];
  return within(list)
    .getAllByRole("button", { name: /^Open / })
    .map((button) => button.textContent);
}

function picker(): HTMLInputElement {
  return screen.getByLabelText<HTMLInputElement>("Upload a PDF for Master of IT");
}

/** The form a call sent; fails the test when it sent something else. */
function sentForm(init: RequestInit | undefined): FormData {
  const body = init?.body;
  if (!(body instanceof FormData)) throw new Error("Expected a form to be sent");
  return body;
}

function sentJson(init: RequestInit | undefined): unknown {
  const body = init?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function tab(): BlankTab & { replace: ReturnType<typeof vi.fn> } {
  const replace = vi.fn();
  return { opener: window, location: { replace }, close: vi.fn(), replace };
}

beforeEach(() => {
  openBlankTab.mockReset();
  navigate.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CourseFilesCell", () => {
  it("lists each PDF with its size, oldest first", () => {
    renderCell();

    expect(fileNames()).toEqual(["Deakin IT brochure", "Fees 2027"]);
    expect(screen.getByText("2.4 MB")).toBeInTheDocument();
    expect(screen.getByText("800 KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename Fees 2027" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Fees 2027" })).toBeInTheDocument();
  });

  it("says there are no PDFs yet and offers Upload PDF", () => {
    renderCell([]);

    expect(screen.getByText("No PDFs yet")).toBeInTheDocument();
    expect(picker()).toHaveAttribute("accept", "application/pdf,.pdf");
  });

  it("has no Upload PDF while the Course or its University is archived", () => {
    renderCell([BROCHURE], false);

    expect(screen.queryByLabelText("Upload a PDF for Master of IT")).not.toBeInTheDocument();
    expect(fileNames()).toEqual(["Deakin IT brochure"]);
  });

  it("refuses a file that isn't a PDF before sending anything", async () => {
    const fetchFn = backend();
    const user = userEvent.setup({ applyAccept: false });
    renderCell();

    await user.upload(picker(), new File(["hello"], "notes.docx", { type: "application/msword" }));

    expect(
      screen.getByText("Only PDF files can be Course Files. That one isn't a PDF."),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses a PDF over 5 MB, saying how big it is", async () => {
    const fetchFn = backend();
    const user = userEvent.setup();
    renderCell();

    await user.upload(picker(), pdf("big.pdf", 6 * 1024 * 1024));

    expect(
      screen.getByText("That file is 6.0 MB. A Course File can be at most 5 MB."),
    ).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("names a new PDF, uploads it as a form, adds it to the list and says so", async () => {
    const fetchFn = backend(
      on(
        "POST",
        UPLOAD,
        { ...FEES, id: uid(33), name: "Deakin it 2027", file_name: "deakin-it_2027.pdf" },
        201,
      ),
    );
    const user = userEvent.setup();
    const { onChanged } = renderCell([BROCHURE]);

    await user.upload(picker(), pdf());
    const dialog = screen.getByRole("dialog", { name: "Name this Course File" });
    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue("Deakin it 2027");
    await user.click(within(dialog).getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(fileNames()).toEqual(["Deakin IT brochure", "Deakin it 2027"]);
    });
    const form = sentForm(callsTo(fetchFn, "POST", UPLOAD)[0]?.[1]);
    expect(form.get("name")).toBe("Deakin it 2027");
    expect(form.get("file")).toBeInstanceOf(File);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Deakin it 2027 uploaded")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("asks for a name rather than uploading with none", async () => {
    const fetchFn = backend();
    const user = userEvent.setup();
    renderCell();

    await user.upload(picker(), pdf());
    const dialog = screen.getByRole("dialog");
    await user.clear(within(dialog).getByRole("textbox", { name: "Name" }));
    await user.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(within(dialog).getByText("Give it a name.")).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows the server's refusal of the name, and of the file, in the dialog", async () => {
    backend(
      on(
        "POST",
        UPLOAD,
        {
          name: ["Ensure this field has no more than 120 characters."],
          file: ["Only PDF files can be Course Files. That one isn't a PDF."],
        },
        400,
      ),
    );
    const user = userEvent.setup();
    renderCell();

    await user.upload(picker(), pdf());
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(
      await within(dialog).findByText("Ensure this field has no more than 120 characters."),
    ).toBeVisible();
    expect(
      within(dialog).getByText("Only PDF files can be Course Files. That one isn't a PDF."),
    ).toBeVisible();
  });

  it("shows the server's one-sentence reason, e.g. an archived Course", async () => {
    backend(on("POST", UPLOAD, { detail: "A course can have at most 20 Course Files." }, 400));
    const user = userEvent.setup();
    renderCell();

    await user.upload(picker(), pdf());
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(
      await within(dialog).findByText("A course can have at most 20 Course Files."),
    ).toBeVisible();
  });

  it("says the upload failed when the server can't store it", async () => {
    backend(on("POST", UPLOAD, { detail: "We couldn't store the file. Try again." }, 503));
    const user = userEvent.setup();
    const { onChanged } = renderCell();

    await user.upload(picker(), pdf());
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Upload" }));

    expect(
      await within(dialog).findByText("We couldn't upload the file. Please try again."),
    ).toBeVisible();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("closes the name dialog with Escape, uploading nothing", async () => {
    const fetchFn = backend();
    const user = userEvent.setup();
    renderCell();

    await user.upload(picker(), pdf());
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("renames a file, sending only the new name", async () => {
    const fetchFn = backend(on("PATCH", FILE_31, { ...BROCHURE, name: "IT course guide" }));
    const user = userEvent.setup();
    const { onChanged } = renderCell();

    await user.click(screen.getByRole("button", { name: "Rename Deakin IT brochure" }));
    const dialog = screen.getByRole("dialog", { name: "Rename the Course File" });
    expect(within(dialog).getByText("The file stays deakin-it.pdf.")).toBeInTheDocument();
    const field = within(dialog).getByRole("textbox", { name: "Name" });
    await user.clear(field);
    await user.type(field, "  IT course guide ");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fileNames()).toEqual(["IT course guide", "Fees 2027"]);
    });
    expect(sentJson(callsTo(fetchFn, "PATCH", FILE_31)[0]?.[1])).toEqual({
      name: "IT course guide",
    });
    expect(screen.getByText("Renamed")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("puts a file in the Bin after asking, then focuses the next file", async () => {
    const fetchFn = backend((path, init) =>
      init?.method === "DELETE" && path === FILE_31
        ? new Response(null, { status: 204 })
        : undefined,
    );
    const user = userEvent.setup();
    const { onChanged } = renderCell();

    await user.click(screen.getByRole("button", { name: "Delete Deakin IT brochure" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Deakin IT brochure?" });
    expect(within(dialog).getByText(/It goes to the Bin/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    await waitFor(() => {
      expect(fileNames()).toEqual(["Fees 2027"]);
    });
    expect(callsTo(fetchFn, "DELETE", FILE_31)).toHaveLength(1);
    expect(screen.getByText("Deakin IT brochure is in the Bin")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open Fees 2027" })).toHaveFocus();
    });
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("focuses Upload PDF after the last file goes to the Bin", async () => {
    backend((path, init) =>
      init?.method === "DELETE" && path === FILE_31
        ? new Response(null, { status: 204 })
        : undefined,
    );
    const user = userEvent.setup();
    renderCell([BROCHURE]);

    await user.click(screen.getByRole("button", { name: "Delete Deakin IT brochure" }));
    await user.click(screen.getByRole("button", { name: "Put in the Bin" }));

    await waitFor(() => {
      expect(picker()).toHaveFocus();
    });
    expect(screen.getByText("No PDFs yet")).toBeInTheDocument();
  });

  it("keeps the file when Cancel is chosen", async () => {
    const fetchFn = backend();
    const user = userEvent.setup();
    renderCell();

    await user.click(screen.getByRole("button", { name: "Delete Fees 2027" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fileNames()).toEqual(["Deakin IT brochure", "Fees 2027"]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("opens a file in a new tab through its short link", async () => {
    backend(on("GET", LINK_31, { url: "https://files.example.com/a.pdf", expires_in: 300 }));
    const blank = tab();
    openBlankTab.mockReturnValue(blank);
    const user = userEvent.setup();
    renderCell();

    await user.click(screen.getByRole("button", { name: "Open Deakin IT brochure" }));

    await waitFor(() => {
      expect(blank.replace).toHaveBeenCalledWith("https://files.example.com/a.pdf");
    });
    expect(blank.opener).toBeNull();
  });

  it("says so, and closes the empty tab, when the link can't be had", async () => {
    backend(on("GET", LINK_31, { detail: "Not found." }, 404));
    const blank = tab();
    openBlankTab.mockReturnValue(blank);
    const user = userEvent.setup();
    renderCell();

    await user.click(screen.getByRole("button", { name: "Open Deakin IT brochure" }));

    expect(await screen.findByText("We couldn't open the file. Please try again.")).toBeVisible();
    expect(blank.close).toHaveBeenCalledOnce();
  });
});

describe.each(THEME_CASES)("Course Files in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the files, their buttons and Upload PDF", () => {
    renderCell();

    expect(fileNames()).toEqual(["Deakin IT brochure", "Fees 2027"]);
    expect(picker()).toBeInTheDocument();
  });
});
