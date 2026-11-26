import { uid } from "@/test/ids";
import { render, screen } from "@testing-library/react";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { novemberMonth } from "./clockFixtures";
import { MyWorkingHoursRoute } from "./MyWorkingHoursRoute";

const navigation = vi.hoisted(() => ({ search: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.search,
}));

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

function renderRoute() {
  backend(
    on("GET", "/api/clock/month/?month=2026-11", novemberMonth()),
    on("GET", "/api/clock/work-from-home/", { can_ask: true, results: [] }),
  );
  render(
    <StaffContextContext value={COUNSELLOR}>
      <ToastProvider>
        <MyWorkingHoursRoute />
      </ToastProvider>
    </StaffContextContext>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T05:15:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MyWorkingHoursRoute", () => {
  it("opens my hours at /clock", async () => {
    navigation.search = new URLSearchParams();

    renderRoute();

    expect(
      await screen.findByRole("group", { name: "Clock-ins, November 2026" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Working hours" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens the Work from home tab at /clock?tab=wfh", async () => {
    navigation.search = new URLSearchParams("tab=wfh");

    renderRoute();

    expect(await screen.findByText("No work from home dates yet.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Work from home" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
