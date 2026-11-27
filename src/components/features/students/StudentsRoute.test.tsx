import { STUDENTS_VIEW_KEY } from "@/constants/students";
import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";

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
};

// These tests are about the List; the Board (the first view on a computer) has its own file.
beforeEach(() => {
  window.localStorage.setItem(STUDENTS_VIEW_KEY, "list");
});

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

  it("starts with the Priority in the address, still the counsellor's own Students", async () => {
    navigation.search = new URLSearchParams({ priority: "high" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/students/?priority=high&counsellor=me",
      expect.anything(),
    );
    expect(screen.getByRole("combobox", { name: "Priority" })).toHaveValue("high");
  });

  it("ignores a Priority in the address that isn't one", async () => {
    navigation.search = new URLSearchParams({ priority: "urgent" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith("/api/students/?counsellor=me", expect.anything());
  });

  it("starts with No counsellor yet from the address, for Home's new visitors", async () => {
    navigation.search = new URLSearchParams({ stage: "lead", counsellor: "none" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/students/?stage=lead&counsellor=none",
      expect.anything(),
    );
    expect(screen.getByRole("combobox", { name: "Counsellor" })).toHaveValue("none");
  });

  it("starts with My Students and High from the address, for a counsellor's See all", async () => {
    navigation.search = new URLSearchParams({ priority: "high", counsellor: "me" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/students/?priority=high&counsellor=me",
      expect.anything(),
    );
  });

  it("ignores a counsellor in the address that isn't one", async () => {
    navigation.search = new URLSearchParams({ stage: "lead", counsellor: "<b>x</b>" });
    const fetchFn = renderRoute();

    await screen.findByText("No Students match. Try clearing the search or a filter.");
    expect(fetchFn).toHaveBeenCalledWith("/api/students/?stage=lead", expect.anything());
  });
});
