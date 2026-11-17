import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { backend, callsTo, on } from "@/test/backend";

import { DocumentTypesSettings } from "./DocumentTypesSettings";

const TYPES_PATH = "/api/configuration/document-types/";
const UNUSED = { countries: 0, courses: 0, students: 0, documents: 0 };
const TYPES = {
  results: [
    { id: 1, name: "Passport", needed_by_everyone: true, usual_group: "applying", used_by: UNUSED },
    {
      id: 8,
      name: "Sponsor Letter",
      needed_by_everyone: true,
      usual_group: "applying",
      used_by: UNUSED,
    },
    {
      id: 9,
      name: "Police report",
      needed_by_everyone: false,
      usual_group: "applying",
      used_by: UNUSED,
    },
  ],
};

const ALWAYS = "Always needed";
const EXTRA = "Extra documents";

function renderSettings(part: "always" | "extra" = "extra") {
  render(
    <ToastProvider>
      <DocumentTypesSettings part={part} />
    </ToastProvider>,
  );
}

async function list(name: string): Promise<HTMLElement> {
  return screen.findByRole("list", { name });
}

function names(element: HTMLElement): string[] {
  return within(element)
    .getAllByRole("listitem")
    .map((item) => item.firstElementChild?.firstElementChild?.textContent ?? "");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocumentTypesSettings", () => {
  it("shows Always needed alone, with no add form", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    renderSettings("always");

    expect(names(await list(ALWAYS))).toEqual(["Passport", "Sponsor Letter"]);
    expect(screen.queryByRole("list", { name: EXTRA })).toBeNull();
    expect(screen.queryByLabelText("Add a document")).toBeNull();
  });

  it("shows Extra documents alone, with the add form and no usual group to choose", async () => {
    backend(on("GET", TYPES_PATH, TYPES));
    renderSettings("extra");

    expect(names(await list(EXTRA))).toEqual(["Police report"]);
    expect(screen.queryByRole("list", { name: ALWAYS })).toBeNull();
    expect(screen.getByLabelText("Add a document")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Usually needed for" })).toBeNull();
    expect(screen.queryByText(/Usually needed for/)).toBeNull();
  });

  it("moves a type off everyone's checklist", async () => {
    const fetchFn = backend(
      on("GET", TYPES_PATH, TYPES),
      on("PATCH", `${TYPES_PATH}8/`, {
        id: 8,
        name: "Sponsor Letter",
        needed_by_everyone: false,
        usual_group: "applying",
        used_by: UNUSED,
      }),
    );
    renderSettings("always");

    await userEvent.click(
      within(await list(ALWAYS)).getByRole("button", {
        name: "Only when asked: Sponsor Letter",
      }),
    );

    expect(await screen.findByText("Now under Extra documents")).toBeVisible();
    expect(names(await list(ALWAYS))).toEqual(["Passport"]);
    const [call] = callsTo(fetchFn, "PATCH", `${TYPES_PATH}8/`);
    expect(call?.[1]?.body).toBe(JSON.stringify({ needed_by_everyone: false }));
  });

  it("moves a type onto everyone's checklist", async () => {
    backend(
      on("GET", TYPES_PATH, TYPES),
      on("PATCH", `${TYPES_PATH}9/`, {
        id: 9,
        name: "Police report",
        needed_by_everyone: true,
        usual_group: "applying",
        used_by: UNUSED,
      }),
    );
    renderSettings();

    await userEvent.click(
      within(await list(EXTRA)).getByRole("button", {
        name: "Needed by everyone: Police report",
      }),
    );

    expect(await screen.findByText("Now on every Student's checklist")).toBeVisible();
    expect(screen.getByText("None yet.")).toBeVisible();
  });

  it("says when a move fails, keeping the lists", async () => {
    backend(on("GET", TYPES_PATH, TYPES), on("PATCH", `${TYPES_PATH}8/`, {}, 500));
    renderSettings("always");

    await userEvent.click(
      within(await list(ALWAYS)).getByRole("button", {
        name: "Only when asked: Sponsor Letter",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that.");
    expect(names(await list(ALWAYS))).toContain("Sponsor Letter");
  });

  it("adds a type needed by every Student", async () => {
    const fetchFn = backend(
      on("GET", TYPES_PATH, TYPES),
      on(
        "POST",
        TYPES_PATH,
        {
          id: 10,
          name: "Birth certificate",
          needed_by_everyone: true,
          usual_group: "applying",
          used_by: UNUSED,
        },
        201,
      ),
    );
    renderSettings();
    await list(EXTRA);

    await userEvent.type(screen.getByLabelText("Add a document"), "  Birth certificate ");
    await userEvent.click(screen.getByRole("checkbox", { name: "Every Student needs this" }));
    await userEvent.click(screen.getByRole("button", { name: "Add document" }));

    expect(await screen.findByText("Added to every Student's checklist")).toBeVisible();
    expect(names(await list(EXTRA))).not.toContain("Birth certificate");
    expect(screen.getByLabelText("Add a document")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Every Student needs this" })).not.toBeChecked();
    const [call] = callsTo(fetchFn, "POST", TYPES_PATH);
    expect(call?.[1]?.body).toBe(
      JSON.stringify({ name: "Birth certificate", needed_by_everyone: true }),
    );
  });

  it("adds one after another", async () => {
    const added = [
      { id: 21, name: "CV", needed_by_everyone: false, usual_group: "applying", used_by: UNUSED },
      {
        id: 22,
        name: "Medical report",
        needed_by_everyone: false,
        usual_group: "applying",
        used_by: UNUSED,
      },
    ];
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES), (path, init) =>
      path === TYPES_PATH && init?.method === "POST"
        ? jsonResponse(added[callsTo(fetchFn, "POST", TYPES_PATH).length - 1], 201)
        : undefined,
    );
    renderSettings();
    await list(EXTRA);

    for (const name of ["CV", "Medical report"]) {
      await userEvent.type(screen.getByLabelText("Add a document"), name);
      await userEvent.click(screen.getByRole("button", { name: "Add document" }));
      await waitFor(async () => {
        expect(names(await list(EXTRA))).toContain(name);
      });
    }
    expect(callsTo(fetchFn, "POST", TYPES_PATH)).toHaveLength(2);
  });

  it("adds one asked for only when needed", async () => {
    backend(
      on("GET", TYPES_PATH, TYPES),
      on(
        "POST",
        TYPES_PATH,
        { id: 11, name: "CV", needed_by_everyone: false, usual_group: "applying", used_by: UNUSED },
        201,
      ),
    );
    renderSettings();
    await list(EXTRA);

    await userEvent.type(screen.getByLabelText("Add a document"), "CV");
    await userEvent.click(screen.getByRole("button", { name: "Add document" }));

    expect(
      await screen.findByText("Document added. Add it to a country's list, a course or a Student."),
    ).toBeVisible();
    expect(names(await list(EXTRA))).toContain("CV");
  });

  it("asks for a name before sending anything", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, TYPES));
    renderSettings();
    await list(EXTRA);

    await userEvent.type(screen.getByLabelText("Add a document"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Add document" }));

    expect(screen.getByText("Enter the document's name.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", TYPES_PATH)).toHaveLength(0);
  });

  it("shows the server's refusal under the name", async () => {
    const message = "There is already a document with this name.";
    backend(on("GET", TYPES_PATH, TYPES), on("POST", TYPES_PATH, { name: [message] }, 400));
    renderSettings();
    await list(EXTRA);

    await userEvent.type(screen.getByLabelText("Add a document"), "passport");
    await userEvent.click(screen.getByRole("button", { name: "Add document" }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.getByLabelText("Add a document")).toHaveAttribute("aria-invalid", "true");
  });

  it("says when another failure stops the add", async () => {
    backend(on("GET", TYPES_PATH, TYPES), on("POST", TYPES_PATH, { detail: "x" }, 403));
    renderSettings();
    await list(EXTRA);

    await userEvent.type(screen.getByLabelText("Add a document"), "CV");
    await userEvent.click(screen.getByRole("button", { name: "Add document" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that.");
  });

  it("says when the types can't be loaded", async () => {
    backend(on("GET", TYPES_PATH, {}, 500));
    renderSettings();

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load the documents.");
  });

  it("keeps an injection-shaped name as text", async () => {
    const name = "<img src=x onerror=alert(1)>";
    backend(
      on("GET", TYPES_PATH, {
        results: [
          { id: 3, name, needed_by_everyone: true, usual_group: "applying", used_by: UNUSED },
        ],
      }),
    );
    renderSettings("always");

    expect(names(await list(ALWAYS))).toEqual([name]);
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("where each document is used", () => {
  const USED = {
    results: [
      {
        id: 1,
        name: "Passport",
        needed_by_everyone: true,
        usual_group: "applying",
        used_by: UNUSED,
      },
      {
        id: 20,
        name: "Genuine Student statement",
        needed_by_everyone: false,
        usual_group: "applying",
        used_by: { countries: 2, courses: 6, students: 1, documents: 0 },
      },
      {
        id: 21,
        name: "CV",
        needed_by_everyone: false,
        usual_group: "applying",
        used_by: { countries: 0, courses: 1, students: 0, documents: 3 },
      },
      {
        id: 22,
        name: "Old form",
        needed_by_everyone: false,
        usual_group: "applying",
        used_by: { countries: 0, courses: 0, students: 0, documents: 1 },
      },
      {
        id: 23,
        name: "Unused",
        needed_by_everyone: false,
        usual_group: "applying",
        used_by: UNUSED,
      },
    ],
  };

  async function rowFor(name: string): Promise<HTMLElement> {
    const optional = await list(EXTRA);
    const row = within(optional)
      .getAllByRole("listitem")
      .find((item) => item.firstElementChild?.firstElementChild?.textContent === name);
    if (row === undefined) throw new Error(`No row for ${name}`);
    return row;
  }

  it("says who asks for each document asked for only when needed", async () => {
    backend(on("GET", TYPES_PATH, USED));
    renderSettings();

    expect(
      within(await rowFor("Genuine Student statement")).getByText(
        "Asked for by 2 countries, 6 courses, 1 Student",
      ),
    ).toBeInTheDocument();
    expect(
      within(await rowFor("CV")).getByText("Asked for by 1 course · 3 files uploaded"),
    ).toBeInTheDocument();
    expect(
      within(await rowFor("Old form")).getByText("Not asked for yet · 1 file uploaded"),
    ).toBeInTheDocument();
    expect(within(await rowFor("Unused")).getByText("Not asked for yet")).toBeInTheDocument();
  });

  it("offers Remove only for a document nothing uses", async () => {
    backend(on("GET", TYPES_PATH, USED));
    renderSettings();

    expect(
      within(await rowFor("Unused")).getByRole("button", { name: "Remove Unused" }),
    ).toBeVisible();
    for (const name of ["Genuine Student statement", "CV", "Old form"]) {
      expect(within(await rowFor(name)).queryByRole("button", { name: /Remove/ })).toBeNull();
    }
    expect(screen.queryByRole("list", { name: ALWAYS })).toBeNull();
  });

  it("removes an unused document", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, USED), (path, init) =>
      init?.method === "DELETE" && path === `${TYPES_PATH}23/`
        ? new Response(null, { status: 204 })
        : undefined,
    );
    renderSettings();

    await userEvent.click(
      within(await rowFor("Unused")).getByRole("button", { name: "Remove Unused" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Remove Unused?" });
    expect(dialog).toHaveTextContent(
      "It comes off the office's documents, so it can't be asked for",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Removed from the office's documents")).toBeInTheDocument();
    expect(names(await list(EXTRA))).toEqual(["Genuine Student statement", "CV", "Old form"]);
    expect(callsTo(fetchFn, "DELETE", `${TYPES_PATH}23/`)).toHaveLength(1);
  });

  it("removes nothing until the popup is confirmed", async () => {
    const fetchFn = backend(on("GET", TYPES_PATH, USED));
    renderSettings();

    await userEvent.click(
      within(await rowFor("Unused")).getByRole("button", { name: "Remove Unused" }),
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(names(await list(EXTRA))).toContain("Unused");
    expect(callsTo(fetchFn, "DELETE", `${TYPES_PATH}23/`)).toHaveLength(0);
  });

  it("says why a removal was refused, keeping the list", async () => {
    const detail = "This document is asked for or has files, so it can't be removed.";
    backend(on("GET", TYPES_PATH, USED), on("DELETE", `${TYPES_PATH}23/`, { detail }, 400));
    renderSettings();

    await userEvent.click(
      within(await rowFor("Unused")).getByRole("button", { name: "Remove Unused" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Remove Unused?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await within(dialog).findByText(detail)).toBeInTheDocument();
    expect(names(await list(EXTRA))).toContain("Unused");
  });
});
