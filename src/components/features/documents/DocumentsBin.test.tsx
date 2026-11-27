import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { CHECKLIST, PASSPORT_DOCUMENT, apiFile, checklistRow, item } from "@/test/documents";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { DocumentsSection } from "./DocumentsSection";
import { uid } from "@/test/ids";

const CHECKLIST_PATH = `/api/students/${uid(7)}/documents/`;
const ME = uid(5);
const BIN_NOTE = {
  by: { id: ME, name: "Bikash Thapa" },
  at: "2026-11-02T10:00:00+05:45",
  reason: "Blurry scan",
};

const CONTEXT: StaffContext = {
  staff: { id: ME, name: "Bikash Thapa", email: "counsellor@office.com", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const AS_COUNSELLOR = { ...CHECKLIST, deletes_for_good: false, viewer_id: ME };
const AS_ADMIN_FLAGS = { deletes_for_good: true, viewer_id: uid(1) };
const AS_ADMIN = { ...CHECKLIST, ...AS_ADMIN_FLAGS };

const THREE_PAGES = {
  ...PASSPORT_DOCUMENT,
  files: [
    apiFile(uid(41), "passport.pdf"),
    apiFile(uid(44), "page-2.pdf"),
    apiFile(uid(45), "page-3.pdf"),
  ],
};

const TWO_PAGES = {
  ...PASSPORT_DOCUMENT,
  files: [apiFile(uid(41), "passport.pdf"), apiFile(uid(44), "page-2.pdf")],
};

/** The Passport put in the Bin: missing, and listed greyed with who, when and why. */
function binnedPassport(by = BIN_NOTE.by, reason = BIN_NOTE.reason) {
  return {
    ...AS_COUNSELLOR,
    items: [
      {
        ...item({ id: uid(1), name: "Passport", state: "not_received" }),
        in_bin: [
          {
            id: uid(31),
            files: [{ id: uid(41), file_name: "passport.pdf" }],
            bin: { ...BIN_NOTE, by, reason },
          },
        ],
      },
      ...CHECKLIST.items.slice(1),
    ],
  };
}

/** One page of the Passport put in the Bin; the Document stays. */
const BINNED_PAGE = {
  ...AS_COUNSELLOR,
  items: [
    item({
      id: uid(1),
      name: "Passport",
      state: "waiting",
      document: {
        ...PASSPORT_DOCUMENT,
        binned_files: [{ id: uid(44), file_name: "page-2.pdf", bin: BIN_NOTE }],
      },
    }),
  ],
};

function renderSection() {
  render(
    <StaffContextContext value={CONTEXT}>
      <ToastProvider>
        <DocumentsSection studentId={uid(7)} studentName="Sita Gurung" />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function rowFor(name: string): Promise<HTMLElement> {
  return waitFor(() =>
    checklistRow(within, screen.getAllByRole("list"), name, { selector: "span" }),
  );
}

describe("deleting a Document as anyone but an Admin (the Bin, issue 79)", () => {
  it("asks why, then puts it in the Bin", async () => {
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, AS_COUNSELLOR),
      on("POST", `/api/students/${uid(7)}/documents/${uid(31)}/bin/`, binnedPassport()),
    );
    renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "Delete Passport" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Delete Passport?" });
    expect(dialog).toHaveTextContent("It goes to the Bin, and nobody can open or use it.");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("radio", { name: "Blurry scan" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    const [call] = callsTo(fetchFn, "POST", `/api/students/${uid(7)}/documents/${uid(31)}/bin/`);
    expect(call?.[1]?.body).toBe(JSON.stringify({ reason: "Blurry scan" }));
    expect(
      await screen.findByText("In the Bin. An Admin will delete it for good or restore it."),
    ).toBeVisible();
    expect(within(await rowFor("Passport")).getByText("In the bin")).toBeVisible();
  });

  it("sends nothing on Cancel or Escape", async () => {
    const fetchFn = backend(on("GET", CHECKLIST_PATH, AS_COUNSELLOR));
    renderSection();
    const deleteButton = within(await rowFor("Passport")).getByRole("button", {
      name: "Delete Passport",
    });

    await userEvent.click(deleteButton);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(deleteButton);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      callsTo(fetchFn, "POST", `/api/students/${uid(7)}/documents/${uid(31)}/bin/`),
    ).toHaveLength(0);
  });

  it("offers no Delete to someone who can't change the Student's documents", async () => {
    backend(on("GET", CHECKLIST_PATH, { ...AS_COUNSELLOR, can_change: false }));
    renderSection();

    expect(within(await rowFor("Passport")).queryByRole("button", { name: /^Delete/ })).toBeNull();
  });
});

describe("what is in the Bin on the checklist", () => {
  it("shows it greyed with who, when and why, unopenable, and lets me take it out", async () => {
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, binnedPassport()),
      on("POST", `/api/students/${uid(7)}/documents/${uid(31)}/take-out/`, AS_COUNSELLOR),
    );
    renderSection();

    const row = await rowFor("Passport");
    expect(within(row).getByText("In the bin")).toBeVisible();
    expect(within(row).getByText("Not received")).toBeVisible();
    expect(row).toHaveTextContent("Blurry scan. Bikash Thapa, 2 Nov 2026");
    expect(within(row).queryByRole("button", { name: "Open passport.pdf" })).toBeNull();
    await userEvent.click(
      within(row).getByRole("button", { name: "Take Passport out of the Bin" }),
    );

    expect(
      callsTo(fetchFn, "POST", `/api/students/${uid(7)}/documents/${uid(31)}/take-out/`),
    ).toHaveLength(1);
    expect(await screen.findByText("Taken out of the Bin")).toBeVisible();
  });

  it("offers no Take it out for what someone else put there", async () => {
    backend(on("GET", CHECKLIST_PATH, binnedPassport({ id: uid(99), name: "Anita Rai" })));
    renderSection();

    const row = await rowFor("Passport");
    expect(within(row).queryByRole("button", { name: /out of the Bin/ })).toBeNull();
  });

  it("offers an Admin the way to the Bin tab", async () => {
    backend(
      on("GET", CHECKLIST_PATH, {
        ...binnedPassport({ id: uid(99), name: "Anita Rai" }),
        ...AS_ADMIN_FLAGS,
      }),
    );
    renderSection();

    const link = within(await rowFor("Passport")).getByRole("link", { name: "Open the Bin" });
    expect(link).toHaveAttribute("href", "/documents?tab=bin");
  });

  it("lists a file in the Bin under its Document, unopenable, with Take it out", async () => {
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, BINNED_PAGE),
      on(
        "POST",
        `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(44)}/take-out/`,
        AS_COUNSELLOR,
      ),
    );
    renderSection();

    const files = within(await rowFor("Passport")).getByRole("list", {
      name: "Files of Passport",
    });
    expect(within(files).getByText("page-2.pdf")).toBeVisible();
    expect(within(files).getByText("In the bin")).toBeVisible();
    expect(within(files).queryByRole("button", { name: "Open page-2.pdf" })).toBeNull();
    await userEvent.click(
      within(files).getByRole("button", { name: "Take page-2.pdf out of the Bin" }),
    );

    expect(
      callsTo(
        fetchFn,
        "POST",
        `/api/students/${uid(7)}/documents/${uid(31)}/files/${uid(44)}/take-out/`,
      ),
    ).toHaveLength(1);
  });

  it("writes an injection-shaped reason as text", async () => {
    const reason = "<img src=x onerror=alert(1)>";
    backend(on("GET", CHECKLIST_PATH, binnedPassport(BIN_NOTE.by, reason)));
    renderSection();

    expect(await rowFor("Passport")).toHaveTextContent(reason);
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("an Admin's own delete skips the Bin", () => {
  it("asks once, then deletes it for good", async () => {
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, AS_ADMIN),
      on("DELETE", `/api/students/${uid(7)}/documents/${uid(31)}/`, {
        ...AS_ADMIN,
        items: CHECKLIST.items.slice(1),
      }),
    );
    renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "Delete Passport" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Delete Passport?" });
    expect(dialog).toHaveTextContent(
      "This Document and all its files are removed from Sita Gurung's documents for good. As an Admin, it doesn't go to the Bin.",
    );
    expect(within(dialog).queryByRole("radiogroup")).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(
      callsTo(fetchFn, "DELETE", `/api/students/${uid(7)}/documents/${uid(31)}/`),
    ).toHaveLength(1);
    expect(await screen.findByText("Passport deleted")).toBeVisible();
  });
});

describe("deleting a Document with several files (UI revamp 11)", () => {
  const DOCUMENT_URL = `/api/students/${uid(7)}/documents/${uid(31)}/`;
  const fileUrl = (fileId: string): string => `${DOCUMENT_URL}files/${fileId}/`;
  const withFiles = (flags: object, document: typeof PASSPORT_DOCUMENT) => ({
    ...flags,
    items: [item({ id: uid(1), name: "Passport", state: "waiting", document })],
  });
  const STAFF_PAGES = withFiles(AS_COUNSELLOR, THREE_PAGES);
  const ADMIN_PAGES = withFiles(AS_ADMIN, THREE_PAGES);

  async function openDelete(): Promise<HTMLElement> {
    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "Delete Passport" }),
    );
    return screen.getByRole("dialog", { name: "Delete Passport?" });
  }

  it("has one Delete for the Document and no trash beside a file", async () => {
    backend(on("GET", CHECKLIST_PATH, STAFF_PAGES));
    renderSection();

    const row = await rowFor("Passport");
    expect(within(row).getAllByRole("button", { name: /^Delete/ })).toHaveLength(1);
    expect(within(row).queryByRole("button", { name: "Delete page-2.pdf" })).toBeNull();
  });

  it("lists the Document's files, all ticked, and says what all of them means", async () => {
    backend(on("GET", CHECKLIST_PATH, STAFF_PAGES));
    renderSection();

    const dialog = await openDelete();
    const files = within(dialog).getByRole("group", { name: "Which files?" });
    const boxes = within(files).getAllByRole("checkbox");
    expect(boxes.map((box) => box.closest("label")?.textContent)).toEqual([
      "passport.pdf",
      "page-2.pdf",
      "page-3.pdf",
    ]);
    for (const box of boxes) expect(box).toBeChecked();
    expect(files).toHaveTextContent(
      "All of them deletes the whole Document. Untick the ones to keep.",
    );
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("asks nothing about files when the Document has only one", async () => {
    backend(on("GET", CHECKLIST_PATH, AS_COUNSELLOR));
    renderSection();

    const dialog = await openDelete();
    expect(within(dialog).queryByRole("group", { name: "Which files?" })).toBeNull();
    expect(within(dialog).queryByRole("checkbox")).toBeNull();
  });

  it("puts the whole Document in the Bin when every file is ticked", async () => {
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, STAFF_PAGES),
      on("POST", `${DOCUMENT_URL}bin/`, binnedPassport()),
    );
    renderSection();

    const dialog = await openDelete();
    await userEvent.click(within(dialog).getByRole("radio", { name: "Uploaded twice" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    const [call] = callsTo(fetchFn, "POST", `${DOCUMENT_URL}bin/`);
    expect(call?.[1]?.body).toBe(JSON.stringify({ reason: "Uploaded twice" }));
    expect(fetchFn.mock.calls.some(([path]) => path.includes("/files/"))).toBe(false);
    expect(
      await screen.findByText("In the Bin. An Admin will delete it for good or restore it."),
    ).toBeVisible();
  });

  it("puts only the ticked files in the Bin, one call each, with the reason", async () => {
    const onePageLeft = withFiles(AS_COUNSELLOR, {
      ...PASSPORT_DOCUMENT,
      binned_files: [
        { id: uid(44), file_name: "page-2.pdf", bin: BIN_NOTE },
        { id: uid(45), file_name: "page-3.pdf", bin: BIN_NOTE },
      ],
    });
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, STAFF_PAGES),
      on("POST", `${fileUrl(uid(44))}bin/`, onePageLeft),
      on("POST", `${fileUrl(uid(45))}bin/`, onePageLeft),
    );
    renderSection();

    const dialog = await openDelete();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "passport.pdf" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    for (const fileId of [uid(44), uid(45)]) {
      const calls = callsTo(fetchFn, "POST", `${fileUrl(fileId)}bin/`);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.[1]?.body).toBe(JSON.stringify({ reason: "Wrong Student" }));
    }
    expect(callsTo(fetchFn, "POST", `${fileUrl(uid(41))}bin/`)).toHaveLength(0);
    expect(callsTo(fetchFn, "POST", `${DOCUMENT_URL}bin/`)).toHaveLength(0);
    const row = await rowFor("Passport");
    expect(within(row).getByRole("button", { name: "Open passport.pdf" })).toBeVisible();
    // Rule 8: the cursor is back on the Delete it was opened from.
    expect(within(row).getByRole("button", { name: "Delete Passport" })).toHaveFocus();
  });

  it("sends nothing while no file is ticked, and says to tick one", async () => {
    const fetchFn = backend(on("GET", CHECKLIST_PATH, STAFF_PAGES));
    renderSection();

    const dialog = await openDelete();
    for (const box of within(dialog).getAllByRole("checkbox")) await userEvent.click(box);
    await userEvent.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    expect(await within(dialog).findByText("Tick at least one file to delete.")).toBeVisible();
    expect(fetchFn.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    expect(screen.getByRole("dialog", { name: "Delete Passport?" })).toBeVisible();
  });

  it("keeps the files that did go when a later one is refused, and says why", async () => {
    const pageTwoGone = withFiles(AS_COUNSELLOR, {
      ...TWO_PAGES,
      files: [apiFile(uid(41), "passport.pdf"), apiFile(uid(45), "page-3.pdf")],
      binned_files: [{ id: uid(44), file_name: "page-2.pdf", bin: BIN_NOTE }],
    });
    backend(
      on("GET", CHECKLIST_PATH, STAFF_PAGES),
      on("POST", `${fileUrl(uid(44))}bin/`, pageTwoGone),
      on("POST", `${fileUrl(uid(45))}bin/`, { detail: "You can't change this Student." }, 403),
    );
    renderSection();

    const dialog = await openDelete();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "passport.pdf" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    expect(await within(dialog).findByText("You can't change this Student.")).toBeVisible();
    const left = within(dialog).getAllByRole("checkbox");
    expect(left.map((box) => box.closest("label")?.textContent)).toEqual([
      "passport.pdf",
      "page-3.pdf",
    ]);
    expect(within(dialog).getByRole("checkbox", { name: "passport.pdf" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "page-3.pdf" })).toBeChecked();
  });

  it("an Admin deletes the whole Document for good when every file is ticked", async () => {
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, ADMIN_PAGES),
      on("DELETE", DOCUMENT_URL, { ...AS_ADMIN, items: CHECKLIST.items.slice(1) }),
    );
    renderSection();

    const dialog = await openDelete();
    expect(dialog).toHaveTextContent(
      "The chosen files are removed from Sita Gurung's documents for good. As an Admin, it doesn't go to the Bin.",
    );
    expect(within(dialog).queryByRole("radiogroup")).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Passport deleted")).toBeVisible();
    expect(callsTo(fetchFn, "DELETE", DOCUMENT_URL)).toHaveLength(1);
    expect(fetchFn.mock.calls.some(([path]) => path.includes("/files/"))).toBe(false);
  });

  it("an Admin deletes only the ticked files for good, one call each", async () => {
    const onePageLeft = withFiles(AS_ADMIN, PASSPORT_DOCUMENT);
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, ADMIN_PAGES),
      on("DELETE", fileUrl(uid(44)), onePageLeft),
      on("DELETE", fileUrl(uid(45)), onePageLeft),
    );
    renderSection();

    const dialog = await openDelete();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "passport.pdf" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("2 files deleted")).toBeVisible();
    expect(callsTo(fetchFn, "DELETE", fileUrl(uid(44)))).toHaveLength(1);
    expect(callsTo(fetchFn, "DELETE", fileUrl(uid(45)))).toHaveLength(1);
    expect(callsTo(fetchFn, "DELETE", DOCUMENT_URL)).toHaveLength(0);
    expect(fetchFn.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("names the one file an Admin deleted", async () => {
    backend(
      on("GET", CHECKLIST_PATH, withFiles(AS_ADMIN, TWO_PAGES)),
      on("DELETE", fileUrl(uid(44)), withFiles(AS_ADMIN, PASSPORT_DOCUMENT)),
    );
    renderSection();

    const dialog = await openDelete();
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "passport.pdf" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("page-2.pdf deleted")).toBeVisible();
  });

  it("puts the cursor on the row's first button when its Delete is gone (rule 8)", async () => {
    backend(
      on("GET", CHECKLIST_PATH, STAFF_PAGES),
      on("POST", `${DOCUMENT_URL}bin/`, binnedPassport()),
    );
    renderSection();

    const dialog = await openDelete();
    await userEvent.click(within(dialog).getByRole("button", { name: "Put in the Bin" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    const row = await rowFor("Passport");
    await waitFor(() => {
      expect(
        within(row).getByRole("button", { name: "Take Passport out of the Bin" }),
      ).toHaveFocus();
    });
  });

  it("writes an injection-shaped file name as text", async () => {
    const name = "<img src=x onerror=alert(1)>.pdf";
    backend(
      on(
        "GET",
        CHECKLIST_PATH,
        withFiles(AS_COUNSELLOR, {
          ...PASSPORT_DOCUMENT,
          files: [apiFile(uid(41), "passport.pdf"), apiFile(uid(44), name)],
        }),
      ),
    );
    renderSection();

    const dialog = await openDelete();
    expect(within(dialog).getByRole("checkbox", { name })).toBeChecked();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe.each(THEME_CASES)("the Delete popup in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("lists the files to tick, with the reason asked under them", async () => {
    backend(
      on("GET", CHECKLIST_PATH, {
        ...AS_COUNSELLOR,
        items: [item({ id: uid(1), name: "Passport", state: "waiting", document: TWO_PAGES })],
      }),
    );
    renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "Delete Passport" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Delete Passport?" });
    expect(within(dialog).getByRole("checkbox", { name: "page-2.pdf" })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: "Blurry scan" })).toBeVisible();
  });
});
