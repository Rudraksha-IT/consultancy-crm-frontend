import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";

import { StudentsRoute } from "./StudentsRoute";
import { consultancySummary } from "@/test/consultancy";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.search,
}));

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function renderRoute() {
  const fetchFn = vi.fn((path: string) =>
    Promise.resolve(
      path === "/api/staff/counsellors/"
        ? jsonResponse([])
        : jsonResponse({ count: 0, page: 1, page_size: 25, results: [] }),
    ),
  );
  vi.stubGlobal("fetch", fetchFn);
  render(
    <StaffContextContext value={COUNSELLOR}>
      <ToastProvider>
        <StudentsRoute />
      </ToastProvider>
    </StaffContextContext>,
  );
  return fetchFn;
}

describe("StudentsRoute", () => {
  it("starts with the top bar's search", async () => {
    navigation.search = new URLSearchParams({ q: "sita" });
    renderRoute();

    expect(await screen.findByRole("searchbox", { name: "Search Students" })).toHaveValue("sita");
  });

  it("starts with the usual filters without a search", async () => {
    navigation.search = new URLSearchParams();
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith("/api/students/?counsellor=me", expect.anything());
  });

  it("starts at the Stage of a pipeline card", async () => {
    navigation.search = new URLSearchParams({ stage: "visa" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith("/api/students/?stage=visa", expect.anything());
    expect(screen.getByRole("combobox", { name: "Stage" })).toHaveValue("visa");
  });

  it("ignores a Stage in the address that isn't one", async () => {
    navigation.search = new URLSearchParams({ stage: "<b>x</b>" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith("/api/students/?counsellor=me", expect.anything());
  });
});
