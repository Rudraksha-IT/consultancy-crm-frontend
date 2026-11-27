import type { RecordId } from "@/lib/recordId";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import type { BlankTab } from "@/lib/documents";
import { backend, on } from "@/test/backend";
import { CHECKLIST, checklistRow } from "@/test/documents";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { DocumentsSection } from "./DocumentsSection";
import { uid } from "@/test/ids";

const { openBlankTab } = vi.hoisted(() => ({ openBlankTab: vi.fn<() => BlankTab | null>() }));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));
vi.mock("@/lib/documents/tab", () => ({ openBlankTab }));

const CHECKLIST_PATH = `/api/students/${uid(7)}/documents/`;
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
const INSTRUCTION = "Last 6 months, with the bank's stamp on every page.";

/** The checklist with examples on the given rows, by type id. */
function checklistWith(guides: Record<RecordId, { instruction: string; examples: unknown[] }>) {
  return {
    ...CHECKLIST,
    items: CHECKLIST.items.map((one) => ({ ...one, ...guides[one.document_type.id] })),
  };
}

function renderSection(body: unknown) {
  backend(on("GET", CHECKLIST_PATH, body));
  render(
    <ToastProvider>
      <DocumentsSection
        studentId={uid(7)}
        studentName="Sita Gurung"
        links={[]}
        onProgress={vi.fn()}
      />
    </ToastProvider>,
  );
}

async function rowFor(name: string): Promise<HTMLElement> {
  return waitFor(() => checklistRow(within, screen.getAllByRole("list"), name));
}

afterEach(() => {
  openBlankTab.mockReset();
});

describe("a Document Type's examples on the checklist (ticket 11)", () => {
  it("shows the instruction and how many examples beside a Document not received", async () => {
    renderSection(
      checklistWith({ [uid(4)]: { instruction: INSTRUCTION, examples: [SAMPLE, PHOTO] } }),
    );

    const row = await rowFor("Bank Statement");

    expect(within(row).getByText(INSTRUCTION)).toBeVisible();
    expect(
      within(row).getByRole("button", { name: "See 2 examples of Bank Statement" }),
    ).toBeVisible();
  });

  it("shows them beside a Rejected Document too, which needs a new copy", async () => {
    renderSection(checklistWith({ [uid(3)]: { instruction: "Both sides", examples: [SAMPLE] } }));

    const row = await rowFor("SEE Marksheet");

    expect(within(row).getByText("Both sides")).toBeVisible();
    expect(
      within(row).getByRole("button", { name: "See the example of SEE Marksheet" }),
    ).toBeVisible();
  });

  it("leaves them out beside a Document already in", async () => {
    renderSection(checklistWith({ [uid(1)]: { instruction: "Every page", examples: [SAMPLE] } }));

    const row = await rowFor("Passport");

    expect(within(row).queryByText("Every page")).toBeNull();
    expect(within(row).queryByRole("button", { name: /^See / })).toBeNull();
  });

  it("asks to see what it should look like when there is no instruction", async () => {
    renderSection(checklistWith({ [uid(4)]: { instruction: "", examples: [SAMPLE] } }));

    expect(
      within(await rowFor("Bank Statement")).getByText("See what it should look like."),
    ).toBeVisible();
  });

  it("shows only the instruction when there are no example files", async () => {
    renderSection(checklistWith({ [uid(4)]: { instruction: INSTRUCTION, examples: [] } }));

    const row = await rowFor("Bank Statement");

    expect(within(row).getByText(INSTRUCTION)).toBeVisible();
    expect(within(row).queryByRole("button", { name: /^See / })).toBeNull();
  });

  it("shows nothing for a type with neither", async () => {
    renderSection(CHECKLIST);

    const row = await rowFor("Bank Statement");

    expect(within(row).queryByText("See what it should look like.")).toBeNull();
  });

  it("shows an instruction written like markup as words", async () => {
    const markup = '<img src=x onerror="alert(1)">';
    renderSection(checklistWith({ [uid(4)]: { instruction: markup, examples: [SAMPLE] } }));

    const row = await rowFor("Bank Statement");

    expect(within(row).getByText(markup)).toBeVisible();
    expect(row.querySelector("img")).toBeNull();
  });

  it("lists the examples in a dialog, opens one by a short link, and gives focus back", async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    openBlankTab.mockReturnValue(tab);
    backend(
      on(
        "GET",
        CHECKLIST_PATH,
        checklistWith({ [uid(4)]: { instruction: INSTRUCTION, examples: [SAMPLE, PHOTO] } }),
      ),
      on("GET", `/api/documents/examples/${uid(53)}/link/?action=download`, {
        url: "https://files.test/e53?sig=1",
        expires_in: 300,
      }),
    );
    render(
      <ToastProvider>
        <DocumentsSection
          studentId={uid(7)}
          studentName="Sita Gurung"
          links={[]}
          onProgress={vi.fn()}
        />
      </ToastProvider>,
    );
    const see = within(await rowFor("Bank Statement")).getByRole("button", {
      name: "See 2 examples of Bank Statement",
    });

    await userEvent.click(see);
    const dialog = screen.getByRole("dialog", { name: "Bank Statement: what it should look like" });
    expect(within(dialog).getByText(INSTRUCTION)).toBeVisible();
    expect(within(dialog).getAllByText("1.1 MB")).toHaveLength(2);
    expect(
      within(dialog).getByText(
        "Examples only. Never put on a Student's checklist as their own Document.",
      ),
    ).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Download sample-balance.jpg" }),
    );

    await waitFor(() => {
      expect(tab.location.replace).toHaveBeenCalledWith("https://files.test/e53?sig=1");
    });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(see).toHaveFocus();
  });

  it("says when an example can't be opened", async () => {
    openBlankTab.mockReturnValue(null);
    backend(
      on(
        "GET",
        CHECKLIST_PATH,
        checklistWith({ [uid(4)]: { instruction: "", examples: [SAMPLE] } }),
      ),
      on("GET", `/api/documents/examples/${uid(52)}/link/?action=open`, { detail: "x" }, 404),
    );
    render(
      <ToastProvider>
        <DocumentsSection
          studentId={uid(7)}
          studentName="Sita Gurung"
          links={[]}
          onProgress={vi.fn()}
        />
      </ToastProvider>,
    );
    await userEvent.click(
      within(await rowFor("Bank Statement")).getByRole("button", {
        name: "See the example of Bank Statement",
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Open sample-bank-statement.pdf" }));

    expect(await screen.findByText("We couldn't open the file. Try again.")).toBeVisible();
  });
});

describe.each(THEME_CASES)("examples on the checklist in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the instruction and the button to see the example", async () => {
    renderSection(checklistWith({ [uid(4)]: { instruction: INSTRUCTION, examples: [SAMPLE] } }));

    const row = await rowFor("Bank Statement");

    expect(within(row).getByText(INSTRUCTION)).toBeVisible();
    expect(
      within(row).getByRole("button", { name: "See the example of Bank Statement" }),
    ).toBeVisible();
  });
});
