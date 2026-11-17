import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";
import { CHECKLIST, PASSPORT_DOCUMENT, apiFile, checklistRow, item } from "@/test/documents";

import { DocumentsSection } from "./DocumentsSection";

const CHECKLIST_PATH = "/api/students/7/documents/";
const ME = 5;
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
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const AS_COUNSELLOR = { ...CHECKLIST, deletes_for_good: false, viewer_id: ME };
const AS_ADMIN_FLAGS = { deletes_for_good: true, viewer_id: 1 };
const AS_ADMIN = { ...CHECKLIST, ...AS_ADMIN_FLAGS };

const TWO_PAGES = {
  ...PASSPORT_DOCUMENT,
  files: [apiFile(41, "passport.pdf"), apiFile(44, "page-2.pdf")],
};

/** The Passport put in the Bin: missing, and listed greyed with who, when and why. */
function binnedPassport(by = BIN_NOTE.by, reason = BIN_NOTE.reason) {
  return {
    ...AS_COUNSELLOR,
    items: [
      {
        ...item({ id: 1, name: "Passport", state: "not_received" }),
        in_bin: [
          {
            id: 31,
            files: [{ id: 41, file_name: "passport.pdf" }],
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
      id: 1,
      name: "Passport",
      state: "waiting",
      document: {
        ...PASSPORT_DOCUMENT,
        binned_files: [{ id: 44, file_name: "page-2.pdf", bin: BIN_NOTE }],
      },
    }),
  ],
};

function renderSection() {
  render(
    <StaffContextContext value={CONTEXT}>
      <ToastProvider>
        <DocumentsSection studentId={7} studentName="Sita Gurung" />
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
      on("POST", "/api/students/7/documents/31/bin/", binnedPassport()),
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

    const [call] = callsTo(fetchFn, "POST", "/api/students/7/documents/31/bin/");
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
    expect(callsTo(fetchFn, "POST", "/api/students/7/documents/31/bin/")).toHaveLength(0);
  });

  it("deletes one file of several, and never offers it for the only one", async () => {
    const withPages = {
      ...AS_COUNSELLOR,
      items: [item({ id: 1, name: "Passport", state: "waiting", document: TWO_PAGES })],
    };
    const fetchFn = backend(
      on("GET", CHECKLIST_PATH, withPages),
      on("POST", "/api/students/7/documents/31/files/44/bin/", BINNED_PAGE),
    );
    renderSection();

    await userEvent.click(
      within(await rowFor("Passport")).getByRole("button", { name: "Delete page-2.pdf" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Put in the Bin" }));

    expect(callsTo(fetchFn, "POST", "/api/students/7/documents/31/files/44/bin/")).toHaveLength(1);
    const row = await rowFor("Passport");
    expect(within(row).queryByRole("button", { name: "Delete passport.pdf" })).toBeNull();
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
      on("POST", "/api/students/7/documents/31/take-out/", AS_COUNSELLOR),
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

    expect(callsTo(fetchFn, "POST", "/api/students/7/documents/31/take-out/")).toHaveLength(1);
    expect(await screen.findByText("Taken out of the Bin")).toBeVisible();
  });

  it("offers no Take it out for what someone else put there", async () => {
    backend(on("GET", CHECKLIST_PATH, binnedPassport({ id: 99, name: "Anita Rai" })));
    renderSection();

    const row = await rowFor("Passport");
    expect(within(row).queryByRole("button", { name: /out of the Bin/ })).toBeNull();
  });

  it("offers an Admin the way to the Bin tab", async () => {
    backend(
      on("GET", CHECKLIST_PATH, {
        ...binnedPassport({ id: 99, name: "Anita Rai" }),
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
      on("POST", "/api/students/7/documents/31/files/44/take-out/", AS_COUNSELLOR),
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
      callsTo(fetchFn, "POST", "/api/students/7/documents/31/files/44/take-out/"),
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
      on("DELETE", "/api/students/7/documents/31/", {
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

    expect(callsTo(fetchFn, "DELETE", "/api/students/7/documents/31/")).toHaveLength(1);
    expect(await screen.findByText("Passport deleted")).toBeVisible();
  });
});
