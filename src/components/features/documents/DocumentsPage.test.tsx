import type { RecordId } from "@/lib/recordId";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { CHECKLIST } from "@/test/documents";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { DocumentsPage } from "./DocumentsPage";
import { consultancySummary } from "@/test/consultancy";
import { uid } from "@/test/ids";

function contextFor(role: StaffContext["staff"]["role"]): StaffContext {
  return {
    staff: { id: uid(5), name: "Bikash Thapa", email: "bikash@acme.test", role },
    consultancy: consultancySummary(),
    modules: ["documents"],
    dateDisplay: "AD",
    colourMode: "light",
    supportAccess: null,
  };
}

type Item = { name: string; state: string };

const row = (
  id: RecordId,
  name: string,
  counts: Partial<Record<string, number>> = {},
  items: Item[] = [],
) => ({
  student: {
    id,
    name,
    stage: "applying",
    country: "australia",
    assigned_counsellor: { id: uid(5), name: "Bikash Thapa" },
  },
  done: 5,
  total: 8,
  rejected: 0,
  waiting: 0,
  missing: 0,
  verified: 0,
  ...counts,
  items,
});

const SITA_ITEMS: Item[] = [
  { name: "Passport", state: "verified" },
  { name: "Citizenship", state: "missing" },
  { name: "SEE Marksheet", state: "waiting" },
  { name: "+2 Transcript", state: "rejected" },
  { name: "Bank Statement", state: "missing" },
];

const PAGE = {
  count: 2,
  page: 1,
  page_size: 25,
  totals: { rejected: 1, waiting: 2, missing: 3, verified: 9 },
  results: [
    row(uid(7), "Sita Gurung", { rejected: 1, waiting: 2, verified: 5 }, SITA_ITEMS),
    row(uid(8), "Ram Thapa", { missing: 3, verified: 4 }),
  ],
};

const paperwork = (scope: string, body: unknown = PAGE, page = 1, status = 200) =>
  on("GET", `/api/documents/students/?scope=${scope}&page=${String(page)}`, body, status);

function renderPage(role: StaffContext["staff"]["role"], onlyWaiting = false) {
  render(
    <StaffContextContext value={contextFor(role)}>
      <ToastProvider>
        <DocumentsPage initialOnlyWaiting={onlyWaiting} />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function rowFor(name: string): Promise<HTMLElement> {
  const list = await screen.findByRole("list", { name: "Documents" });
  const found = within(list)
    .getAllByRole("listitem")
    .find((li) => within(li).queryByRole("link", { name }) !== null);
  if (found === undefined) throw new Error(`No row for ${name}`);
  return found;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocumentsPage", () => {
  it("starts a Counsellor on their own Students", async () => {
    const fetchFn = backend(paperwork("mine"));
    renderPage("counsellor");

    expect(await screen.findByRole("heading", { level: 1, name: "Documents" })).toBeVisible();
    expect(screen.getByRole("button", { name: "My Students" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await rowFor("Sita Gurung");
    expect(callsTo(fetchFn, "GET", "/api/documents/students/?scope=mine&page=1")).toHaveLength(1);
  });

  it("lets a Counsellor see everyone's, with their counsellor named", async () => {
    const fetchFn = backend(paperwork("mine"), paperwork("everyone"));
    renderPage("counsellor");
    await rowFor("Sita Gurung");

    await userEvent.click(screen.getByRole("button", { name: "Everyone" }));

    expect(
      await within(await rowFor("Sita Gurung")).findByText("Applying, Australia, Bikash Thapa"),
    ).toBeVisible();
    expect(callsTo(fetchFn, "GET", "/api/documents/students/?scope=everyone&page=1")).toHaveLength(
      1,
    );
  });

  it("shows an Admin everyone without a switch", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    await rowFor("Sita Gurung");
    expect(screen.queryByRole("group", { name: "Whose documents" })).not.toBeInTheDocument();
  });

  it("totals each state in tiles", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    await rowFor("Sita Gurung");
    const tiles = [
      ["Rejected, need a new copy", "1"],
      ["Waiting for you to check", "2"],
      ["Not received yet", "3"],
      ["Checked and correct", "9"],
    ] as const;
    for (const [label, value] of tiles) {
      expect(screen.getByText(label).parentElement).toHaveTextContent(`${label}${value}`);
    }
  });

  it("says how many documents came in, of how many", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    const sita = await rowFor("Sita Gurung");
    expect(sita.querySelector("[data-received]")).toHaveTextContent("5 of 8 received");
    expect(within(sita).getByText("5 of 8 documents received")).toHaveClass("sr-only");
  });

  it("keeps the short counts for phones: only rejected and to check", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    const sita = await rowFor("Sita Gurung");
    const counts = within(sita).getByText("1 rejected").closest("[data-counts]");
    expect(counts).toHaveClass("phone:hidden");
    expect(counts).toHaveTextContent(/^1 rejected2 to check$/);
    expect((await rowFor("Ram Thapa")).querySelector("[data-counts]")).toBeNull();
  });

  it("shows a pill per document with its name, icon and state, the ones needing work first", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    const pills = within(await rowFor("Sita Gurung")).getByRole("list", {
      name: "Sita Gurung's documents",
    });
    const items = within(pills).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "+2 Transcript, rejected, needs a new copy",
      "SEE Marksheet, received, waiting to be checked",
      "Citizenship, not received yet",
      "Bank Statement, not received yet",
      "Passport, checked and correct",
    ]);
    expect(items.map((item) => item.dataset.state)).toEqual([
      "rejected",
      "waiting",
      "missing",
      "missing",
      "verified",
    ]);
    expect(items.map((item) => item.querySelector("svg")?.dataset.icon)).toEqual([
      "x",
      "clock",
      "plus",
      "plus",
      "check",
    ]);
    expect(items[0]).toHaveAttribute("title", "+2 Transcript: rejected, needs a new copy");
    expect(pills).toHaveClass("max-phone:hidden");
  });

  it("has no pills for a Student whose checklist is empty", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    expect(
      within(await rowFor("Ram Thapa")).queryByRole("list", { name: "Ram Thapa's documents" }),
    ).not.toBeInTheDocument();
  });

  it("shows a document name shaped like markup as plain text", async () => {
    const name = "<img src=x onerror=alert(1)>";
    backend(
      paperwork("everyone", {
        ...PAGE,
        results: [row(uid(7), "Sita Gurung", {}, [{ name, state: "missing" }])],
      }),
    );
    renderPage("admin");

    expect(within(await rowFor("Sita Gurung")).getByText(name)).toBeVisible();
    expect(document.querySelector("img")).toBeNull();
  });

  it("explains the four states in a key above the list, not on phones", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");
    await rowFor("Sita Gurung");

    const key = screen.getByRole("list", { name: "What the colours mean" });
    expect(
      within(key)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Checked: checked and correct",
      "To check: received, waiting to be checked",
      "Rejected: rejected, needs a new copy",
      "Not received: not received yet",
    ]);
    expect(
      within(key)
        .getAllByRole("listitem")
        .map((item) => item.querySelector("svg")?.dataset.icon),
    ).toEqual(["check", "clock", "x", "plus"]);
    expect(key).toHaveClass("max-phone:hidden");
  });

  it("has no key when there are no Students", async () => {
    backend(paperwork("everyone", { ...PAGE, count: 0, results: [] }));
    renderPage("admin");

    await screen.findByText("No Students here yet.");
    expect(screen.queryByRole("list", { name: "What the colours mean" })).not.toBeInTheDocument();
  });

  it("opens the checklist from a click anywhere on the row", async () => {
    backend(paperwork("everyone"), on("GET", `/api/students/${uid(7)}/documents/`, CHECKLIST));
    renderPage("admin");

    await userEvent.click(within(await rowFor("Sita Gurung")).getByText("received"));

    expect(screen.getByRole("dialog", { name: "Documents for Sita Gurung" })).toBeVisible();
  });

  it("opens the Student from the name only, with no underline", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    const name = within(await rowFor("Sita Gurung")).getByRole("link", { name: "Sita Gurung" });
    // jsdom can't follow a link; the click must still not open the checklist.
    name.addEventListener("click", (event) => {
      event.preventDefault();
    });
    await userEvent.click(name);

    expect(name).toHaveAttribute("href", `/students/${uid(7)}`);
    expect(name).toHaveClass("hover:text-accent");
    expect(name).not.toHaveClass("hover:underline");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts the cursor back on the row's Open checklist button after a row click (rule 8)", async () => {
    backend(paperwork("everyone"), on("GET", `/api/students/${uid(7)}/documents/`, CHECKLIST));
    renderPage("admin");
    const sita = await rowFor("Sita Gurung");

    await userEvent.click(within(sita).getByText("Applying, Australia, Bikash Thapa"));
    const dialog = screen.getByRole("dialog", { name: "Documents for Sita Gurung" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Done" }));

    await waitFor(() => {
      expect(
        within(sita).getByRole("button", { name: "Open checklist for Sita Gurung" }),
      ).toHaveFocus();
    });
    expect(sita).toBeInTheDocument();
  });

  it("opens a Student's checklist over the page and refreshes the counts after", async () => {
    const fetchFn = backend(
      paperwork("everyone"),
      on("GET", `/api/students/${uid(7)}/documents/`, CHECKLIST),
    );
    renderPage("admin");

    await userEvent.click(
      within(await rowFor("Sita Gurung")).getByRole("button", {
        name: "Open checklist for Sita Gurung",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Documents for Sita Gurung" });
    expect(
      await within(dialog).findByRole("heading", { name: "2 of 4 documents received" }),
    ).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "Open their page" })).toHaveAttribute(
      "href",
      `/students/${uid(7)}`,
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        callsTo(fetchFn, "GET", "/api/documents/students/?scope=everyone&page=1"),
      ).toHaveLength(2);
    });
  });

  it("pages through many Students", async () => {
    const fetchFn = backend(
      paperwork("everyone", { ...PAGE, count: 30 }),
      paperwork("everyone", { ...PAGE, count: 30, page: 2, results: [row(uid(9), "Last One")] }, 2),
    );
    renderPage("admin");
    await rowFor("Sita Gurung");

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    await rowFor("Last One");
    expect(callsTo(fetchFn, "GET", "/api/documents/students/?scope=everyone&page=2")).toHaveLength(
      1,
    );
  });

  it("says when there are no Students yet", async () => {
    backend(paperwork("everyone", { ...PAGE, count: 0, results: [] }));
    renderPage("admin");

    expect(await screen.findByText("No Students here yet.")).toBeVisible();
  });

  it("says when it can't load", async () => {
    backend(paperwork("everyone", { detail: "x" }, 1, 500));
    renderPage("admin");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load the Documents page.",
    );
  });

  it.each(["front_desk", "teacher"] as const)("isn't for %s, and asks nothing", (role) => {
    const fetchFn = backend();
    renderPage(role);

    expect(screen.getByText("This page isn't available to you.")).toBeVisible();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows only Students waiting to be checked when the Home's link asks", async () => {
    backend(on("GET", "/api/documents/students/?scope=mine&page=1&waiting=true", PAGE));
    renderPage("counsellor", true);

    await rowFor("Sita Gurung");
    expect(
      screen.getByText("Showing only Students with documents waiting to be checked."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Show everyone" })).toHaveAttribute(
      "href",
      "/documents",
    );
  });

  it("keeps the waiting filter when a Counsellor switches to everyone", async () => {
    const fetchFn = backend(
      on("GET", "/api/documents/students/?scope=mine&page=1&waiting=true", PAGE),
      on("GET", "/api/documents/students/?scope=everyone&page=1&waiting=true", PAGE),
    );
    renderPage("counsellor", true);
    await rowFor("Sita Gurung");

    await userEvent.click(screen.getByRole("button", { name: "Everyone" }));

    await waitFor(() => {
      expect(
        callsTo(fetchFn, "GET", "/api/documents/students/?scope=everyone&page=1&waiting=true"),
      ).toHaveLength(1);
    });
  });

  it("has no filter banner without the link", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    await rowFor("Sita Gurung");
    expect(screen.queryByRole("link", { name: "Show everyone" })).not.toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("Documents page rows in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });
  afterEach(() => {
    resetTheme();
  });

  it("shows the key, the pills and the count", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    const sita = await rowFor("Sita Gurung");
    expect(document.documentElement.dataset.theme).toBe(mode);
    expect(screen.getByRole("list", { name: "What the colours mean" })).toBeVisible();
    expect(
      within(within(sita).getByRole("list", { name: "Sita Gurung's documents" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(SITA_ITEMS.length);
    expect(sita.querySelector("[data-received]")).toHaveTextContent("5 of 8 received");
  });
});
