import { uid } from "@/test/ids";
import { render, screen, waitFor } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";

import { DocumentsRoute } from "./DocumentsRoute";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.search,
}));

const ADMIN: StaffContext = {
  staff: { id: uid(3), name: "Asha Rai", email: "asha@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["documents"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const EMPTY = {
  count: 0,
  page: 1,
  page_size: 25,
  totals: { rejected: 0, waiting: 0, missing: 0, verified: 0 },
  results: [],
};

function renderRoute() {
  const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(EMPTY)));
  vi.stubGlobal("fetch", fetchFn);
  render(
    <StaffContextContext value={ADMIN}>
      <ToastProvider>
        <DocumentsRoute />
      </ToastProvider>
    </StaffContextContext>,
  );
  return fetchFn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocumentsRoute", () => {
  it("shows only Students waiting to be checked from the Home's link", async () => {
    navigation.search = new URLSearchParams({ waiting: "true" });
    const fetchFn = renderRoute();

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledWith(
        "/api/documents/students/?scope=everyone&page=1&waiting=true",
        expect.anything(),
      );
    });
    expect(screen.getByRole("link", { name: "Show everyone" })).toBeVisible();
  });

  it.each(["1", "yes", "<script>"])("ignores any other value (%s)", async (asked) => {
    navigation.search = new URLSearchParams({ waiting: asked });
    const fetchFn = renderRoute();

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledWith(
        "/api/documents/students/?scope=everyone&page=1",
        expect.anything(),
      );
    });
    expect(screen.queryByRole("link", { name: "Show everyone" })).not.toBeInTheDocument();
  });

  it.each([
    ["bin", true],
    ["Bin", false],
    ["<script>", false],
  ])("opens the Bin tab only for ?tab=bin (%s)", async (asked, isBin) => {
    navigation.search = new URLSearchParams({ tab: asked });
    renderRoute();

    const binTab = await screen.findByRole("button", { name: /^Bin/ });
    expect(binTab).toHaveAttribute("aria-pressed", String(isBin));
  });
});
