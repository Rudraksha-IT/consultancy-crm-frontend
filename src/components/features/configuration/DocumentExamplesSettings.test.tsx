import { uid } from "@/test/ids";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import type { BlankTab } from "@/lib/documents";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { DocumentTypesSettings } from "./DocumentTypesSettings";

const { openBlankTab } = vi.hoisted(() => ({ openBlankTab: vi.fn<() => BlankTab | null>() }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));
vi.mock("@/lib/documents/tab", () => ({ openBlankTab }));

const TYPES_PATH = "/api/configuration/document-types/";
const UNUSED = { countries: 0, courses: 0, students: 0, documents: 0 };
const SAMPLE = {
  id: uid(52),
  file_name: "sample-bank-statement.pdf",
  content_type: "application/pdf",
  size: 1_157_120,
  uploaded_at: "2026-11-20T10:00:00+05:45",
};
const PHOTO = {
  ...SAMPLE,
  id: uid(53),
  file_name: "sample-balance.jpg",
  content_type: "image/jpeg",
};
const NEW_SAMPLE = {
  ...SAMPLE,
  id: uid(60),
  file_name: "new-sample.png",
  content_type: "image/png",
};
const STATEMENT = {
  id: uid(7),
  name: "Bank Statement",
  needed_by_everyone: true,
  usual_group: "visa",
  used_by: UNUSED,
  instruction: "Last 6 months, stamped.",
  examples: [SAMPLE, PHOTO],
  example_count: 3,
};
const PASSPORT = {
  ...STATEMENT,
  id: uid(1),
  name: "Passport",
  instruction: "",
  examples: [],
  example_count: 0,
};
const POLICE = {
  ...PASSPORT,
  id: uid(9),
  name: "Police report",
  needed_by_everyone: false,
  example_count: 1,
};
const TYPES = { results: [PASSPORT, STATEMENT, POLICE] };

function renderSettings(part: "always" | "extra" = "always") {
  render(
    <ToastProvider>
      <DocumentTypesSettings part={part} />
    </ToastProvider>,
  );
}

async function rowFor(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: /Always needed|Extra documents/ });
  const row = within(list)
    .getAllByRole("listitem")
    .find((item) => item.textContent.startsWith(name));
  if (row === undefined) throw new Error(`No row for ${name}`);
  return row;
}

async function openExamples(name = "Bank Statement"): Promise<HTMLElement> {
  await userEvent.click(
    within(await rowFor(name)).getByRole("button", {
      name: `Instruction and examples for ${name}`,
    }),
  );
  return screen.getByRole("dialog", { name: `${name}: instruction and examples` });
}

function aFile(name: string, size = 2048, type = "application/pdf"): File {
  const file = new File(["%PDF-1.7"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function fileNames(dialog: HTMLElement): string[] {
  const list = within(dialog).queryByRole("list", { name: "Example files" });
  if (list === null) return [];
  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.querySelector(".break-all")?.textContent ?? "");
}

afterEach(() => {
  openBlankTab.mockReset();
});

describe("Document Examples in Configuration → Documents (ticket 11)", () => {
  it("says what each type has, with an Examples button", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    renderSettings();

    expect(await rowFor("Bank Statement")).toHaveTextContent("Instruction and 2 example files");
    expect(await rowFor("Passport")).toHaveTextContent("No example yet");
    expect(
      within(await rowFor("Passport")).getByRole("button", {
        name: "Instruction and examples for Passport",
      }),
    ).toBeVisible();
  });

  it("opens the type's instruction and files, how many of 3", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    renderSettings();

    const dialog = await openExamples();

    expect(within(dialog).getByLabelText(/Instruction/)).toHaveValue("Last 6 months, stamped.");
    expect(within(dialog).getByText("23 of 500")).toBeVisible();
    expect(within(dialog).getByText("(2 of 3)")).toBeVisible();
    expect(fileNames(dialog)).toEqual(["sample-bank-statement.pdf", "sample-balance.jpg"]);
    expect(within(dialog).getByRole("button", { name: "Remove sample-balance.jpg" })).toBeVisible();
    expect(within(dialog).getByLabelText("Replace sample-balance.jpg")).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText("Add an example file to Bank Statement"),
    ).toBeInTheDocument();
  });

  it("saves the instruction on one line, closes and gives focus back", async () => {
    const fetchFn = backend(
      on("GET", TYPES_PATH, TYPES),
      on("PUT", `/api/configuration/document-types/${uid(7)}/instruction/`, {
        ...STATEMENT,
        instruction: "Six months. Stamped.",
      }),
    );
    renderSettings();
    const dialog = await openExamples();
    const box = within(dialog).getByLabelText(/Instruction/);

    await userEvent.clear(box);
    await userEvent.type(box, "Six months.{Enter}Stamped.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Saved for Bank Statement")).toBeVisible();
    const [put] = callsTo(
      fetchFn,
      "PUT",
      `/api/configuration/document-types/${uid(7)}/instruction/`,
    );
    const body = put?.[1]?.body;
    expect(JSON.parse(typeof body === "string" ? body : "")).toEqual({
      instruction: "Six months. Stamped.",
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      within(await rowFor("Bank Statement")).getByRole("button", {
        name: "Instruction and examples for Bank Statement",
      }),
    ).toHaveFocus();
  });

  it("shows the server's refusal under the instruction", async () => {
    const message = "Ensure this field has no more than 500 characters.";
    backend(
      on("GET", TYPES_PATH, TYPES),
      on(
        "PUT",
        `/api/configuration/document-types/${uid(7)}/instruction/`,
        { instruction: [message] },
        400,
      ),
    );
    renderSettings();
    const dialog = await openExamples();

    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByText(message)).toBeVisible();
    expect(
      screen.getByRole("dialog", { name: "Bank Statement: instruction and examples" }),
    ).toBeVisible();
  });

  it("adds an example file at once and counts it", async () => {
    const fetchFn = backend(
      on("GET", TYPES_PATH, TYPES),
      on("POST", `/api/configuration/document-types/${uid(1)}/examples/`, NEW_SAMPLE, 201),
    );
    renderSettings();
    const dialog = await openExamples("Passport");

    await userEvent.upload(
      within(dialog).getByLabelText("Add an example file to Passport"),
      aFile("new-sample.png", 2048, "image/png"),
    );

    expect(await screen.findByText("new-sample.png added")).toBeVisible();
    expect(fileNames(dialog)).toEqual(["new-sample.png"]);
    expect(within(dialog).getByText("(1 of 3)")).toBeVisible();
    const [post] = callsTo(
      fetchFn,
      "POST",
      `/api/configuration/document-types/${uid(1)}/examples/`,
    );
    expect(post?.[1]?.body).toBeInstanceOf(FormData);
    await userEvent.keyboard("{Escape}");
    expect(await rowFor("Passport")).toHaveTextContent("No instruction and 1 example file");
  });

  it.each([
    ["a file that isn't a PDF, JPEG or PNG", aFile("letter.docx"), "Use a PDF, JPEG or PNG file."],
    [
      "a file over 5 MB",
      aFile("big.pdf", 6 * 1024 * 1024),
      "That file is 6.0 MB. An example can be at most 5 MB.",
    ],
  ])("refuses %s before sending it", async (_case, file, message) => {
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES));
    renderSettings();
    const dialog = await openExamples("Passport");

    await userEvent.upload(within(dialog).getByLabelText("Add an example file to Passport"), file, {
      applyAccept: false,
    });

    expect(await within(dialog).findByText(message)).toBeVisible();
    expect(
      callsTo(fetchFn, "POST", `/api/configuration/document-types/${uid(1)}/examples/`),
    ).toHaveLength(0);
  });

  it.each([
    [
      { file: ["An example must be a PDF, JPEG or PNG file. That one isn't."] },
      "An example must be a PDF, JPEG or PNG file. That one isn't.",
    ],
    [
      { detail: "A document can have at most 3 example files. Remove one to add another." },
      "A document can have at most 3 example files. Remove one to add another.",
    ],
    [{ detail: "Something odd" }, "We couldn't upload the file. Try again.", 503],
  ])("says why the server refused an upload", async (body, message, code = 400) => {
    backend(
      on("GET", TYPES_PATH, TYPES),
      on("POST", `/api/configuration/document-types/${uid(1)}/examples/`, body, code),
    );
    renderSettings();
    const dialog = await openExamples("Passport");

    await userEvent.upload(
      within(dialog).getByLabelText("Add an example file to Passport"),
      aFile("sample.pdf"),
    );

    expect(await within(dialog).findByText(message)).toBeVisible();
    expect(fileNames(dialog)).toEqual([]);
  });

  it("offers no more files once a type has 3", async () => {
    const full = { ...STATEMENT, examples: [SAMPLE, PHOTO, { ...SAMPLE, id: uid(54) }] };
    backend(on("GET", TYPES_PATH, { results: [full] }));
    renderSettings();

    const dialog = await openExamples();

    expect(within(dialog).getByText("3 is the most. Remove one to add another.")).toBeVisible();
    expect(within(dialog).queryByLabelText("Add an example file to Bank Statement")).toBeNull();
  });

  it("replaces a file in its place and keeps focus there", async () => {
    backend(
      on("GET", TYPES_PATH, TYPES),
      on("POST", `/api/configuration/document-examples/${uid(52)}/replace/`, NEW_SAMPLE, 201),
    );
    renderSettings();
    const dialog = await openExamples();

    await userEvent.upload(
      within(dialog).getByLabelText("Replace sample-bank-statement.pdf"),
      aFile("new-sample.png", 2048, "image/png"),
    );

    expect(
      await screen.findByText("Replaced. sample-bank-statement.pdf is in the Bin."),
    ).toBeVisible();
    expect(fileNames(dialog)).toEqual(["new-sample.png", "sample-balance.jpg"]);
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Open new-sample.png" })).toHaveFocus();
    });
  });

  it("removes a file to the Bin after asking, with focus on the next one", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES), (path, init) =>
      init?.method === "DELETE" && path === `/api/configuration/document-examples/${uid(52)}/`
        ? new Response(null, { status: 204 })
        : undefined,
    );
    renderSettings();
    const dialog = await openExamples();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Remove sample-bank-statement.pdf" }),
    );
    const confirm = screen.getByRole("dialog", { name: "Remove sample-bank-statement.pdf?" });
    expect(confirm).toHaveTextContent(
      "It goes to the Bin, where an Admin can restore it or delete it for good.",
    );
    await userEvent.click(within(confirm).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("sample-bank-statement.pdf is in the Bin")).toBeVisible();
    expect(fileNames(dialog)).toEqual(["sample-balance.jpg"]);
    expect(
      callsTo(fetchFn, "DELETE", `/api/configuration/document-examples/${uid(52)}/`),
    ).toHaveLength(1);
    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Open sample-balance.jpg" })).toHaveFocus();
    });
  });

  it("opens a file through a short link", async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    openBlankTab.mockReturnValue(tab);
    backend(
      on("GET", TYPES_PATH, TYPES),
      on("GET", `/api/documents/examples/${uid(53)}/link/?action=open`, {
        url: "https://files.test/e53?sig=1",
        expires_in: 300,
      }),
    );
    renderSettings();
    const dialog = await openExamples();

    await userEvent.click(within(dialog).getByRole("button", { name: "Open sample-balance.jpg" }));

    await waitFor(() => {
      expect(tab.location.replace).toHaveBeenCalledWith("https://files.test/e53?sig=1");
    });
  });

  it("offers Remove only for an extra document with no example files, even in the Bin", async () => {
    backend(
      on("GET", TYPES_PATH, {
        results: [POLICE, { ...POLICE, id: uid(10), name: "CV", example_count: 0 }],
      }),
    );
    renderSettings("extra");

    expect(
      within(await rowFor("Police report")).queryByRole("button", { name: /^Remove/ }),
    ).toBeNull();
    expect(within(await rowFor("CV")).getByRole("button", { name: "Remove CV" })).toBeVisible();
  });

  it("shows an instruction and a file name written like markup as words", async () => {
    const markup = '<img src=x onerror="alert(1)">';
    backend(
      on("GET", TYPES_PATH, {
        results: [
          { ...STATEMENT, instruction: markup, examples: [{ ...SAMPLE, file_name: markup }] },
        ],
      }),
    );
    renderSettings();

    const dialog = await openExamples();

    expect(within(dialog).getByLabelText(/Instruction/)).toHaveValue(markup);
    expect(fileNames(dialog)).toEqual([markup]);
    expect(dialog.querySelector("img")).toBeNull();
  });
});

describe.each(THEME_CASES)("Document Examples in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the dialog with its files and buttons", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    renderSettings();

    const dialog = await openExamples();

    expect(fileNames(dialog)).toEqual(["sample-bank-statement.pdf", "sample-balance.jpg"]);
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeVisible();
  });
});
