import type { RecordId } from "@/lib/recordId";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { CHECKLIST } from "@/test/documents";

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

const row = (id: RecordId, name: string, counts: Partial<Record<string, number>> = {}) => ({
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
});

const PAGE = {
  count: 2,
  page: 1,
  page_size: 25,
  totals: { rejected: 1, waiting: 2, missing: 3, verified: 9 },
  results: [
    row(uid(7), "Sita Gurung", { rejected: 1, waiting: 2, verified: 5 }),
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

  it("names each count in a chip, and the progress", async () => {
    backend(paperwork("everyone"));
    renderPage("admin");

    const sita = await rowFor("Sita Gurung");
    expect(within(sita).getByText("1 rejected")).toBeVisible();
    expect(within(sita).getByText("2 to check")).toBeVisible();
    expect(within(sita).getByText("5 correct")).toBeVisible();
    expect(within(sita).queryByText(/missing/)).not.toBeInTheDocument();
    expect(within(sita).getByText("5 of 8")).toBeVisible();
    expect(within(await rowFor("Ram Thapa")).getByText("3 missing")).toBeVisible();
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
