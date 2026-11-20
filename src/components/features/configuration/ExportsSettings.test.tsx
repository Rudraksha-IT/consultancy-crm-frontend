import type { RecordId } from "@/lib/recordId";
import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import type { StaffContext } from "@/lib/api";
import { formatAdDateTime } from "@/lib/dates";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { ExportsSettings } from "./ExportsSettings";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const AT = "2026-10-24T10:55:00+00:00";

function record(id: RecordId, overrides: Record<string, unknown> = {}) {
  return {
    id,
    list: "students",
    filters: "Stage: Applying",
    row_count: 2,
    by: "Sita Sharma",
    at: AT,
    ...overrides,
  };
}

function pageOf(results: unknown[], count = results.length, page = 1) {
  return { count, page, page_size: 25, results };
}

function renderSection() {
  render(
    <StaffContextContext value={ADMIN}>
      <ExportsSettings />
    </StaffContextContext>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ExportsSettings", () => {
  it("lists every export: which list, rows, filters, who and when", async () => {
    backend(
      on(
        "GET",
        "/api/exports/",
        pageOf([
          record(uid(2), {
            list: "visas",
            row_count: 1,
            filters: "No filters, everyone",
            by: "Ramesh (Platform Admin)",
          }),
          record(uid(1)),
        ]),
      ),
    );
    renderSection();

    const list = await screen.findByRole("list", { name: "Exports" });
    const [visas, students] = within(list).getAllByRole("listitem");
    expect(visas).toHaveTextContent("Visas, 1 row");
    expect(visas).toHaveTextContent("No filters, everyone");
    expect(visas).toHaveTextContent(`Ramesh (Platform Admin), ${formatAdDateTime(AT)}`);
    expect(students).toHaveTextContent("Students, 2 rows");
    expect(students).toHaveTextContent("Stage: Applying");
    expect(screen.getByText(/so you know whenever data has left the office/)).toBeInTheDocument();
  });

  it("says when nothing has been exported yet", async () => {
    backend(on("GET", "/api/exports/", pageOf([])));
    renderSection();

    expect(await screen.findByText("Nothing exported yet.")).toBeInTheDocument();
  });

  it("says when the exports can't be loaded, or don't look right", async () => {
    backend(on("GET", "/api/exports/", pageOf([record(uid(1), { row_count: "two" })])));
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The exports couldn't be loaded. Try again later.",
    );
  });

  it("shows filters as text, never as markup", async () => {
    backend(
      on("GET", "/api/exports/", pageOf([record(uid(1), { filters: "Search: <b>bold</b>" })])),
    );
    renderSection();

    expect(await screen.findByText("Search: <b>bold</b>")).toBeInTheDocument();
  });

  it("pages through many exports", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", "/api/exports/", pageOf([record(uid(1))], 30)),
      on("GET", "/api/exports/?page=2", pageOf([record(uid(9), { list: "applications" })], 30, 2)),
    );
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Next page" }));

    expect(await screen.findByText("Applications, 2 rows")).toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith("/api/exports/?page=2", expect.anything());
  });
});
