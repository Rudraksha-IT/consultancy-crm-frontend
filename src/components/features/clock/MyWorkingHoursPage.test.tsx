import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { novemberMonth } from "./clockFixtures";
import { MyWorkingHoursPage } from "./MyWorkingHoursPage";

const COUNSELLOR: StaffContext = {
  staff: { id: 3, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};
const ADMIN: StaffContext = {
  ...COUNSELLOR,
  staff: { id: 1, name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
};
const MONTH = "/api/clock/month/?month=2026-11";

function renderPage(context: StaffContext = COUNSELLOR) {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <MyWorkingHoursPage />
      </ToastProvider>
    </StaffContextContext>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T05:15:00Z"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("MyWorkingHoursPage", () => {
  it("shows this month's figures above a Sunday-first calendar", async () => {
    backend(on("GET", MONTH, novemberMonth()));

    renderPage();

    expect(screen.getByRole("heading", { name: "My working hours" })).toBeInTheDocument();
    const calendar = await screen.findByRole("group", { name: "Clock-ins, November 2026" });
    expect(screen.getByText("Your clock-ins for November 2026.")).toBeInTheDocument();
    expect(screen.getByText("Days worked").parentElement).toHaveTextContent("3");
    expect(screen.getByText("Hours").parentElement).toHaveTextContent("12.4 h");
    expect(screen.getByText("Hours").parentElement).toHaveTextContent("about 4 h 8 min a day");
    expect(screen.getByText("Short days").parentElement).toHaveTextContent("under 8 h");
    expect(screen.getAllByText("No clock-out")[0]?.parentElement).toHaveTextContent("1");
    expect(within(calendar).getByText("Sun")).toBeInTheDocument();
    expect(within(calendar).getByText("Sat")).toBeInTheDocument();
  });

  it("marks each day with words as well as colours", async () => {
    backend(on("GET", MONTH, novemberMonth()));

    renderPage();
    const calendar = await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    expect(within(calendar).getByText("8h 24m")).toBeInTheDocument();
    expect(within(calendar).getByText("9:02 AM –")).toBeInTheDocument();
    expect(within(calendar).getByText("5:26 PM")).toBeInTheDocument();
    expect(within(calendar).getByText("Corrected")).toBeInTheDocument();
    expect(within(calendar).getByText("Short day")).toBeInTheDocument();
    expect(within(calendar).getByText("No out")).toBeInTheDocument();
    expect(within(calendar).getByText("no clock-out")).toBeInTheDocument();
    expect(within(calendar).getByText("Not in")).toBeInTheDocument();
    expect(
      within(calendar).getByText("3 Nov 2026: 4 h, short day, in 9:00 AM, out 1:00 PM"),
    ).toBeInTheDocument();
    expect(within(calendar).getByText("6 Nov 2026, not yet")).toBeInTheDocument();
  });

  it("marks a holiday by its name, never as not in (asked 2026-11-16)", async () => {
    backend(on("GET", MONTH, novemberMonth(undefined, { 1: "Dashain" })));

    renderPage();
    const calendar = await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    expect(within(calendar).getByText("Dashain")).toBeInTheDocument();
    expect(within(calendar).getByText("1 Nov 2026, holiday: Dashain")).toBeInTheDocument();
    expect(within(calendar).queryByText("1 Nov 2026, not in")).not.toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "What the days show" });
    expect(within(legend).getByText("Holiday")).toBeInTheDocument();
  });

  it("marks the office's weekly days off as Day off, whichever days they are (asked 2026-11-17)", async () => {
    const month = novemberMonth();
    const days = month.days.map((day) =>
      day.date === "2026-11-01" ? { ...day, day_off: true, not_in: false } : day,
    );
    backend(on("GET", MONTH, { ...month, days }));

    renderPage();
    const calendar = await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    expect(within(calendar).getByText("1 Nov 2026, day off")).toBeInTheDocument();
    expect(within(calendar).getAllByText("Day off").length).toBeGreaterThan(0);
    const legend = screen.getByRole("list", { name: "What the days show" });
    expect(within(legend).getByText("Day off")).toBeInTheDocument();
    expect(within(legend).queryByText("Saturday")).toBeNull();
  });

  it("has a legend, the corrections and how to get a day fixed", async () => {
    backend(on("GET", MONTH, novemberMonth()));

    renderPage();
    await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    const legend = screen.getByRole("list", { name: "What the days show" });
    expect(within(legend).getByText("Full day (8 h or more)")).toBeInTheDocument();
    expect(
      screen.getByText(
        /2 Nov 2026: In 9:02 AM, no clock-out → Out 5:26 PM\. “Forgot to clock out\.” Maya Shrestha/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Forgot to clock out, or missed a clock-in? Ask your Admin to correct it."),
    ).toBeInTheDocument();
    // My own days never open.
    expect(screen.queryByRole("button", { name: /Open to correct/ })).not.toBeInTheDocument();
  });

  it("shows another month when it is picked", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", MONTH, novemberMonth()),
      on("GET", "/api/clock/month/?month=2026-10", { ...novemberMonth(), month: "2026-10" }),
    );
    renderPage();
    await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    await user.selectOptions(screen.getByLabelText("Month"), "2026-10");

    expect(await screen.findByText("Your clock-ins for October 2026.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", "/api/clock/month/?month=2026-10")).toHaveLength(1);
  });

  it("gives an Admin a way to everyone's hours", async () => {
    backend(on("GET", MONTH, novemberMonth()));

    renderPage(ADMIN);

    expect(await screen.findByRole("link", { name: "Everyone's hours" })).toHaveAttribute(
      "href",
      "/staff?tab=hours",
    );
  });

  it("says when the month can't be loaded", async () => {
    backend();

    renderPage();

    expect(
      await screen.findByText("The month couldn't be loaded. Try again later."),
    ).toBeInTheDocument();
  });

  it("isn't there with Clock-in off, or for a visiting Platform Admin", () => {
    backend();
    renderPage({ ...COUNSELLOR, modules: ["students"] });
    expect(screen.queryByRole("heading", { name: "My working hours" })).not.toBeInTheDocument();
  });

  it("sends a visiting Platform Admin to everyone's hours", () => {
    const fetchFn = backend();

    renderPage({
      ...ADMIN,
      supportAccess: { platformAdminName: "Ramesh", platformHost: "platform.crm.test" },
    });

    expect(screen.getByRole("link", { name: "Everyone's hours" })).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", MONTH)).toHaveLength(0);
  });
});
