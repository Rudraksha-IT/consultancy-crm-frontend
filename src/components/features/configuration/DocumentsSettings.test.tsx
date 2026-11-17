import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { backend, on, onEach } from "@/test/backend";

import { DocumentsSettings } from "./DocumentsSettings";

const CONFIG_TYPES_PATH = "/api/configuration/document-types/";
const PICKABLE_PATH = "/api/documents/types/";
const LISTS_PATH = "/api/configuration/document-lists/";
const UNUSED = { countries: 0, courses: 0, students: 0, documents: 0 };
const PASSPORT = { id: 1, name: "Passport", needed_by_everyone: true, usual_group: "applying" };
const SPONSOR = { id: 8, name: "Sponsor Letter", needed_by_everyone: false, usual_group: "visa" };
const POLICE = {
  id: 30,
  name: "Police clearance",
  needed_by_everyone: false,
  usual_group: "statements",
};
const EMPTY_LISTS = {
  results: ["australia", "uk", "canada", "usa", "new_zealand", "japan"].map((country) => ({
    country,
    documents: [],
  })),
};

function renderDocuments() {
  render(
    <ToastProvider>
      <DocumentsSettings />
    </ToastProvider>,
  );
}

function tabs(): HTMLElement {
  return screen.getByRole("group", { name: "Documents" });
}

async function openTab(name: string): Promise<void> {
  await userEvent.click(within(tabs()).getByRole("button", { name }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocumentsSettings", () => {
  it("has three tabs, Always needed, Extra documents and By country, and opens on the first", async () => {
    backend(
      on("GET", CONFIG_TYPES_PATH, {
        results: [
          { ...PASSPORT, used_by: UNUSED },
          { ...SPONSOR, used_by: UNUSED },
        ],
      }),
    );
    renderDocuments();

    expect(
      within(tabs())
        .getAllByRole("button")
        .map((tab) => tab.textContent),
    ).toEqual(["Always needed", "Extra documents", "By country"]);
    expect(within(tabs()).getByRole("button", { name: "Always needed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByRole("list", { name: "Always needed" })).toHaveTextContent(
      "Passport",
    );
    expect(screen.getByText("On every Student's checklist, whatever their plans.")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Extra documents" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Country" })).toBeNull();
  });

  it("shows one part at a time", async () => {
    backend(
      on("GET", CONFIG_TYPES_PATH, {
        results: [
          { ...PASSPORT, used_by: UNUSED },
          { ...SPONSOR, used_by: UNUSED },
        ],
      }),
      on("GET", PICKABLE_PATH, { results: [PASSPORT, SPONSOR] }),
      on("GET", LISTS_PATH, EMPTY_LISTS),
    );
    renderDocuments();

    await openTab("Extra documents");
    expect(await screen.findByRole("list", { name: "Extra documents" })).toHaveTextContent(
      "Sponsor Letter",
    );
    expect(screen.queryByRole("list", { name: "Always needed" })).toBeNull();
    expect(screen.queryByText(/Usually needed for/)).toBeNull();

    await openTab("By country");
    expect(await screen.findByRole("combobox", { name: "Country" })).toBeVisible();
    expect(screen.queryByRole("list", { name: "Extra documents" })).toBeNull();
  });

  it("lists a document made from a Country's list under Extra documents", async () => {
    let isMade = false;
    const made = { ...POLICE, used_by: { ...UNUSED, countries: 1 } };
    backend(
      onEach("GET", CONFIG_TYPES_PATH, () => ({
        results: [{ ...PASSPORT, used_by: UNUSED }, ...(isMade ? [made] : [])],
      })),
      on("GET", PICKABLE_PATH, { results: [PASSPORT] }),
      on("GET", LISTS_PATH, EMPTY_LISTS),
      (path, init) => {
        if (path !== `${LISTS_PATH}uk/new-document/` || init?.method !== "POST") return undefined;
        isMade = true;
        const list = {
          country: "uk",
          documents: [{ document_type: { id: 30, name: "Police clearance" }, group: "statements" }],
        };
        return jsonResponse({ document_type: made, list }, 201);
      },
    );
    renderDocuments();

    await openTab("By country");
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Country" }), "uk");
    await userEvent.click(
      within(screen.getByRole("group", { name: "When it's needed" })).getByRole("button", {
        name: "Statements",
      }),
    );
    expect(
      screen.getByText("Every existing document is already on UK's list."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New document" }));
    const dialog = screen.getByRole("dialog", { name: "New document for UK" });
    await userEvent.type(within(dialog).getByLabelText("Document name"), "Police clearance");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create and add" }));
    expect(await screen.findByRole("list", { name: "Statements" })).toHaveTextContent(
      "Police clearance",
    );

    await openTab("Extra documents");

    const extra = await screen.findByRole("list", { name: "Extra documents" });
    expect(extra).toHaveTextContent("Police clearance");
    expect(within(extra).getByText("Asked for by 1 country")).toBeVisible();
  });
});
