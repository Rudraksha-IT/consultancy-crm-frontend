import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { backend, callsTo, on } from "@/test/backend";

import { CountryDocumentLists } from "./CountryDocumentLists";

const LISTS_PATH = "/api/configuration/document-lists/";
const TYPES_PATH = "/api/documents/types/";
const TYPES = {
  results: [
    { id: 1, name: "Passport", needed_by_everyone: true, usual_group: "applying" },
    { id: 7, name: "Bank Statement", needed_by_everyone: false, usual_group: "visa" },
    { id: 24, name: "Police report", needed_by_everyone: false, usual_group: "visa" },
    {
      id: 26,
      name: "Genuine Student statement",
      needed_by_everyone: false,
      usual_group: "statements",
    },
  ],
};
const row = (id: number, name: string, group: string) => ({
  document_type: { id, name },
  group,
});
const AUSTRALIA = {
  country: "australia",
  documents: [row(7, "Bank Statement", "visa"), row(26, "Genuine Student statement", "statements")],
};
const LISTS = {
  results: [
    AUSTRALIA,
    { country: "uk", documents: [row(7, "Bank Statement", "visa")] },
    { country: "canada", documents: [] },
    { country: "usa", documents: [] },
    { country: "new_zealand", documents: [] },
    { country: "japan", documents: [] },
  ],
};

function renderLists() {
  render(
    <ToastProvider>
      <CountryDocumentLists />
    </ToastProvider>,
  );
}

async function pickCountry(country: string): Promise<void> {
  await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Country" }), country);
}

async function openGroup(name: RegExp): Promise<void> {
  const groups = await screen.findByRole("group", { name: "When it's needed" });
  await userEvent.click(within(groups).getByRole("button", { name }));
}

function newPath(country: string): string {
  return `${LISTS_PATH}${country}/new-document/`;
}

function rowsOf(group: string): string[] {
  return within(screen.getByRole("list", { name: group }))
    .getAllByRole("listitem")
    .map((item) => item.firstElementChild?.textContent ?? "");
}

function sentBody(fetchFn: ReturnType<typeof backend>, method: string, path: string): unknown {
  const [call] = callsTo(fetchFn, method, path);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

function sentRows(fetchFn: ReturnType<typeof backend>, country: string): unknown {
  const [call] = callsTo(fetchFn, "PUT", `${LISTS_PATH}${country}/`);
  const body = call?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CountryDocumentLists", () => {
  it("picks the Country from a dropdown that shows each one's document count", async () => {
    backend(on("GET", LISTS_PATH, LISTS), on("GET", TYPES_PATH, TYPES));
    renderLists();

    const country = await screen.findByRole("combobox", { name: "Country" });
    expect(country).toHaveValue("australia");
    expect(
      within(country)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual([
      "Australia (2 documents)",
      "UK (1 document)",
      "Canada (0 documents)",
      "USA (0 documents)",
      "New Zealand (0 documents)",
      "Japan (0 documents)",
    ]);
    expect(screen.queryByRole("group", { name: "Country" })).toBeNull();
  });

  it("shows one list at a time behind Applying, Visa and Statements tabs with counts", async () => {
    backend(on("GET", LISTS_PATH, LISTS), on("GET", TYPES_PATH, TYPES));
    renderLists();

    const groups = await screen.findByRole("group", { name: "When it's needed" });
    expect(within(groups).getAllByRole("button")).toHaveLength(3);
    expect(within(groups).getByRole("button", { name: "Visa, 1" })).toBeVisible();
    expect(within(groups).getByRole("button", { name: "Statements, 1" })).toBeVisible();
    expect(within(groups).getByRole("button", { name: "Applying" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Nothing here for Australia.")).toBeVisible();
    expect(screen.getByText("For the university applications")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Visa" })).toBeNull();

    await openGroup(/^Visa/);

    expect(rowsOf("Visa")).toEqual(["Bank Statement"]);
    expect(screen.getByText("For the visa application")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Statements" })).toBeNull();
  });

  it("switches Country and keeps the list shown", async () => {
    backend(on("GET", LISTS_PATH, LISTS), on("GET", TYPES_PATH, TYPES));
    renderLists();
    await openGroup(/^Visa/);

    await pickCountry("japan");

    expect(screen.getByText("Nothing here for Japan.")).toBeVisible();
    expect(
      within(screen.getByRole("group", { name: "When it's needed" })).getByRole("button", {
        name: "Visa",
      }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("adds an existing document to the list shown, offering only those not on it", async () => {
    const saved = {
      ...AUSTRALIA,
      documents: [...AUSTRALIA.documents, row(24, "Police report", "statements")],
    };
    const fetchFn = backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on("PUT", `${LISTS_PATH}australia/`, saved),
    );
    renderLists();
    await openGroup(/^Statements/);
    const pick = screen.getByRole("combobox", {
      name: "Add an existing document to Australia's Statements list",
    });

    expect(
      within(pick)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Police report"]);
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Police report added to Australia's Statements list"),
    ).toBeVisible();
    expect(sentRows(fetchFn, "australia")).toEqual({
      documents: [
        { document_type: 7, group: "visa" },
        { document_type: 26, group: "statements" },
        { document_type: 24, group: "statements" },
      ],
    });
    expect(rowsOf("Statements")).toEqual(["Genuine Student statement", "Police report"]);
  });

  it("says so when every existing document is already on the list", async () => {
    backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, { results: TYPES.results.filter((t) => t.id !== 24) }),
    );
    renderLists();

    expect(
      await screen.findByText("Every existing document is already on Australia's list."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    expect(screen.getByRole("button", { name: "New document" })).toBeVisible();
  });

  it("makes a new document on the list shown, in one request", async () => {
    const made = {
      document_type: {
        id: 30,
        name: "Police clearance",
        needed_by_everyone: false,
        usual_group: "statements",
        used_by: { countries: 1, courses: 0, students: 0, documents: 0 },
      },
      list: {
        country: "uk",
        documents: [row(7, "Bank Statement", "visa"), row(30, "Police clearance", "statements")],
      },
    };
    const fetchFn = backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on("POST", newPath("uk"), made, 201),
    );
    renderLists();
    await pickCountry("uk");
    await openGroup(/^Statements/);
    expect(screen.getByText("Not on the list?")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "New document" }));
    const dialog = screen.getByRole("dialog", { name: "New document for UK" });
    expect(dialog).toHaveTextContent(
      "It's added to UK's Statements list, and listed under Extra documents",
    );
    const name = within(dialog).getByLabelText("Document name");
    expect(name).toHaveFocus();
    await userEvent.type(name, "Police clearance");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create and add" }));

    expect(
      await screen.findByText(
        "Police clearance created and added to UK's Statements list. It's also under Extra documents.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sentBody(fetchFn, "POST", newPath("uk"))).toEqual({
      name: "Police clearance",
      group: "statements",
    });
    expect(callsTo(fetchFn, "PUT", `${LISTS_PATH}uk/`)).toHaveLength(0);
    expect(rowsOf("Statements")).toEqual(["Police clearance"]);
  });

  it("refuses a name that already exists and keeps the dialog open", async () => {
    const message = "Police report is already on UK's list.";
    const fetchFn = backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on("POST", newPath("uk"), { name: [message] }, 400),
    );
    renderLists();
    await pickCountry("uk");

    await userEvent.click(screen.getByRole("button", { name: "New document" }));
    const dialog = screen.getByRole("dialog", { name: "New document for UK" });
    await userEvent.type(within(dialog).getByLabelText("Document name"), "police REPORT");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create and add" }));

    expect(await within(dialog).findByText(message)).toBeVisible();
    expect(within(dialog).getByLabelText("Document name")).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByLabelText("Document name")).toHaveValue("police REPORT");
    expect(screen.getByRole("dialog", { name: "New document for UK" })).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", newPath("uk"))).toHaveLength(1);
    expect(screen.getByText("Nothing here for UK.")).toBeInTheDocument();
  });

  it("asks for a name before sending, and Escape closes the dialog", async () => {
    const fetchFn = backend(on("GET", LISTS_PATH, LISTS), on("GET", TYPES_PATH, TYPES));
    renderLists();

    await userEvent.click(await screen.findByRole("button", { name: "New document" }));
    const dialog = screen.getByRole("dialog", { name: "New document for Australia" });
    await userEvent.type(within(dialog).getByLabelText("Document name"), "   ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create and add" }));

    expect(within(dialog).getByText("Enter the document's name.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", newPath("australia"))).toHaveLength(0);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says when another failure stops a new document, keeping the dialog open", async () => {
    backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on(
        "POST",
        newPath("australia"),
        { detail: "An office can have at most 100 document types." },
        400,
      ),
    );
    renderLists();

    await userEvent.click(await screen.findByRole("button", { name: "New document" }));
    const dialog = screen.getByRole("dialog", { name: "New document for Australia" });
    await userEvent.type(within(dialog).getByLabelText("Document name"), "CV 2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create and add" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "An office can have at most 100 document types.",
    );
    expect(screen.getByText("Nothing here for Australia.")).toBeInTheDocument();
  });

  it("moves a type to another group", async () => {
    const fetchFn = backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on("PUT", `${LISTS_PATH}australia/`, {
        ...AUSTRALIA,
        documents: [row(7, "Bank Statement", "applying"), AUSTRALIA.documents[1]],
      }),
    );
    renderLists();
    await openGroup(/^Visa/);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Group for Bank Statement" }),
      "applying",
    );

    expect(await screen.findByText("Moved to Applying")).toBeVisible();
    expect(sentRows(fetchFn, "australia")).toEqual({
      documents: [
        { document_type: 7, group: "applying" },
        { document_type: 26, group: "statements" },
      ],
    });
    await openGroup(/^Applying/);
    expect(rowsOf("Applying")).toEqual(["Bank Statement"]);
  });

  it("takes a type off after asking, and Escape keeps it", async () => {
    const fetchFn = backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on("PUT", `${LISTS_PATH}australia/`, { ...AUSTRALIA, documents: [AUSTRALIA.documents[1]] }),
    );
    renderLists();
    await openGroup(/^Visa/);
    const remove = screen.getByRole("button", {
      name: "Take Bank Statement off Australia's list",
    });

    await userEvent.click(remove);
    await userEvent.keyboard("{Escape}");
    expect(callsTo(fetchFn, "PUT", `${LISTS_PATH}australia/`)).toHaveLength(0);

    await userEvent.click(remove);
    const dialog = screen.getByRole("dialog", {
      name: "Take Bank Statement off Australia's list?",
    });
    expect(dialog).toHaveTextContent(
      "Students going to Australia won't be asked for it any more. Files already uploaded stay.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Take it off" }));

    expect(await screen.findByText("Taken off Australia's list")).toBeVisible();
    expect(sentRows(fetchFn, "australia")).toEqual({
      documents: [{ document_type: 26, group: "statements" }],
    });
  });

  it("never sends a type every Student now needs", async () => {
    const fetchFn = backend(
      on("GET", LISTS_PATH, {
        results: [
          { country: "australia", documents: [row(1, "Passport", "visa"), AUSTRALIA.documents[0]] },
        ],
      }),
      on("GET", TYPES_PATH, TYPES),
      on("PUT", `${LISTS_PATH}australia/`, AUSTRALIA),
    );
    renderLists();

    await userEvent.click(await screen.findByRole("button", { name: "Add" }));

    expect(sentRows(fetchFn, "australia")).toEqual({
      documents: [
        { document_type: 7, group: "visa" },
        { document_type: 24, group: "applying" },
      ],
    });
  });

  it("shows the server's refusal and keeps the list", async () => {
    backend(
      on("GET", LISTS_PATH, LISTS),
      on("GET", TYPES_PATH, TYPES),
      on(
        "PUT",
        `${LISTS_PATH}australia/`,
        { documents: ["Police report is already needed by every Student."] },
        400,
      ),
    );
    renderLists();

    await userEvent.click(await screen.findByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Police report is already needed by every Student.",
    );
    expect(screen.getByText("Nothing here for Australia.")).toBeVisible();
  });

  it("says when the lists can't be loaded", async () => {
    backend(on("GET", LISTS_PATH, {}, 500), on("GET", TYPES_PATH, TYPES));
    renderLists();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load the document lists. Refresh the page to try again.",
    );
  });

  it("shows names as text, never as markup", async () => {
    const name = '<img src=x onerror="alert(1)">';
    backend(
      on("GET", LISTS_PATH, {
        results: [{ country: "australia", documents: [row(9, name, "applying")] }],
      }),
      on("GET", TYPES_PATH, TYPES),
    );
    renderLists();

    expect(await screen.findByText(name)).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });
});
