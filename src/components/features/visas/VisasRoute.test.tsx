import { render, screen, waitFor } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { DEFAULT_THEME } from "@/lib/theme";
import { consultancySummary } from "@/test/consultancy";

import { VisasRoute } from "./VisasRoute";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.search,
}));

const COUNSELLOR: StaffContext = {
  staff: { id: 3, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["visas"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function renderRoute() {
  const fetchFn = vi.fn((path: string) =>
    Promise.resolve(
      path === "/api/staff/counsellors/"
        ? jsonResponse([])
        : path === "/api/visas/filter-choices/"
          ? jsonResponse({ intakes: [], countries: [] })
          : jsonResponse({ count: 0, page: 1, page_size: 25, results: [] }),
    ),
  );
  vi.stubGlobal("fetch", fetchFn);
  render(
    <StaffContextContext value={COUNSELLOR}>
      <ToastProvider>
        <VisasRoute />
      </ToastProvider>
    </StaffContextContext>,
  );
  return fetchFn;
}

const listCalls = (fetchFn: ReturnType<typeof renderRoute>) =>
  fetchFn.mock.calls
    .map(([path]) => path)
    .filter((path) => path.startsWith("/api/visas/?") || path === "/api/visas/");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("VisasRoute", () => {
  it("starts on my Students' appointments in the next 7 days from the Home's link", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 5, 9, 0));
    navigation.search = new URLSearchParams({ appointment: "next_7" });
    const fetchFn = renderRoute();

    await waitFor(() => {
      expect(listCalls(fetchFn)).toEqual([
        "/api/visas/?counsellor=me&appointment_from=2026-11-05&appointment_to=2026-11-11",
      ]);
    });
    expect(screen.getByRole("combobox", { name: "Appointment" })).toHaveDisplayValue(
      "Appointment in the next 7 days",
    );
  });

  it.each(["<script>", "next_9", ""])(
    "ignores an unknown appointment choice (%s)",
    async (asked) => {
      navigation.search = new URLSearchParams({ appointment: asked });
      const fetchFn = renderRoute();

      await waitFor(() => {
        expect(listCalls(fetchFn)).toEqual(["/api/visas/?counsellor=me"]);
      });
    },
  );
});
