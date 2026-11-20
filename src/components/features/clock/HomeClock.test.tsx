import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HomeGreeting } from "@/components/features/home/HomeGreeting";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { SESSION_TEXT } from "@/constants/session";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

const COUNSELLOR: StaffContext = {
  staff: { id: 3, name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "clock_in"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const CLOCK_OFF: StaffContext = { ...COUNSELLOR, modules: ["students"] };
const VISITING: StaffContext = {
  ...COUNSELLOR,
  supportAccess: { platformAdminName: "Ramesh", platformHost: "platform.crm.test" },
};

const CLOCK = "/api/clock/";
// 11:00 in Kathmandu.
const NOW = "2026-11-05T05:15:00Z";
const NOT_IN = {
  now: NOW,
  office_network: "on",
  anywhere: null,
  open: null,
  forgotten_day: null,
  today_minutes: 0,
  last_out: null,
};
// Clocked in at 9:02 AM, Kathmandu.
const IN = {
  ...NOT_IN,
  open: { id: 4, clocked_in_at: "2026-11-05T03:17:00Z" },
  today_minutes: 118,
};

function renderGreeting(context: StaffContext = COUNSELLOR) {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <HomeGreeting />
      </ToastProvider>
    </StaffContextContext>,
  );
}

async function clockRegion() {
  return screen.findByRole("region", { name: "Clock in and out" });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("HomeClock", () => {
  it("is beside the greeting, not clocked in, on the office network, with a link to my month", async () => {
    backend(on("GET", CLOCK, NOT_IN));

    renderGreeting();
    const clock = await clockRegion();

    expect(screen.getByRole("heading", { name: "Namaste, Bikash" })).toBeInTheDocument();
    expect(within(clock).getByText("Not clocked in")).toBeInTheDocument();
    expect(within(clock).getByText("Office network")).toBeInTheDocument();
    expect(within(clock).getByRole("button", { name: "Clock in" })).toBeEnabled();
    expect(
      within(clock).getByRole("link", { name: "My working hours this month" }),
    ).toHaveAttribute("href", "/clock");
  });

  it("moves the button under the words on a narrow screen, never squeezing them (issue 91)", async () => {
    backend(on("GET", CLOCK, NOT_IN));

    renderGreeting();
    const clock = await clockRegion();

    const words = within(clock).getByText("Not clocked in").parentElement;
    expect(words).toHaveClass("basis-48", "flex-1", "min-w-0");
  });

  it("shows the time since clocking in from the server's clock, never the computer's", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setInterval", "Date"] });
    // The computer's own clock is a year off; it must not matter.
    vi.setSystemTime(new Date("2027-12-01T00:00:00Z"));
    backend(on("GET", CLOCK, IN));

    renderGreeting();
    const clock = await clockRegion();

    expect(within(clock).getByText("In since 9:02 AM")).toBeInTheDocument();
    expect(within(clock).getByText("1 h 58 min")).toBeInTheDocument();
    expect(within(clock).getByRole("button", { name: "Clock out" })).toBeInTheDocument();
  });

  it("reads the clock again when the window gets focus", async () => {
    const fetchFn = backend(on("GET", CLOCK, NOT_IN));
    renderGreeting();
    await clockRegion();

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await vi.waitFor(() => {
      expect(callsTo(fetchFn, "GET", CLOCK)).toHaveLength(2);
    });
  });

  it("says when a clock-out was forgotten, and that the Admin can fix it", async () => {
    backend(on("GET", CLOCK, { ...NOT_IN, forgotten_day: "2026-11-04" }));

    renderGreeting();
    const clock = await clockRegion();

    expect(within(clock).getByText("No clock-out on 4 Nov 2026")).toBeInTheDocument();
    expect(within(clock).getByText("Your Admin can fix it")).toBeInTheDocument();
  });

  it("after clocking out today, shows when and how long", async () => {
    backend(on("GET", CLOCK, { ...NOT_IN, today_minutes: 125, last_out: "2026-11-05T05:00:00Z" }));

    renderGreeting();
    const clock = await clockRegion();

    expect(within(clock).getByText("Out at 10:45 AM")).toBeInTheDocument();
    expect(within(clock).getByText("2 h 5 min today")).toBeInTheDocument();
  });

  it.each([
    ["off", "Not on the office network"],
    ["none", "No office network set up"],
  ])("says so when the network is %s", async (state, words) => {
    backend(on("GET", CLOCK, { ...NOT_IN, office_network: state }));

    renderGreeting();

    expect(within(await clockRegion()).getByText(words)).toBeInTheDocument();
  });

  it("clocks in with nothing but a POST, and says when", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", CLOCK, NOT_IN),
      on(
        "POST",
        "/api/clock/in/",
        { clock: { ...IN, now: "2026-11-05T03:17:00Z" }, marked_not_clocked_out: "2026-11-04" },
        201,
      ),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock in" }));

    expect(
      await screen.findByText(
        "Clocked in at 9:02 AM. Your session on 4 Nov 2026 is marked Not clocked out. Your Admin can fix it.",
      ),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", "/api/clock/in/")[0]?.[1]?.body).toBe("{}");
    expect(
      within(await clockRegion()).getByRole("button", { name: "Clock out" }),
    ).toBeInTheDocument();
  });

  it("clocks out and says how long this time was", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", CLOCK, IN),
      on("POST", "/api/clock/out/", {
        clock: { ...NOT_IN, last_out: NOW, today_minutes: 118 },
        minutes: 118,
      }),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock out" }));

    expect(
      await screen.findByText("Clocked out at 11:00 AM. 1 h 58 min this time."),
    ).toBeInTheDocument();
  });

  it("off the office network, a dialog says nothing was recorded", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", CLOCK, { ...NOT_IN, office_network: "off" }),
      on(
        "POST",
        "/api/clock/in/",
        { detail: "You can only clock in from the office network." },
        403,
      ),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock in" }));

    const dialog = await screen.findByRole("dialog", { name: "You're not on the office network" });
    expect(
      within(dialog).getByText("You can only clock in from the office network."),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Nothing was recorded/)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("with no office network, the dialog says they can't clock in yet", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", CLOCK, { ...NOT_IN, office_network: "none" }),
      on("POST", "/api/clock/in/", { detail: "Ask your Admin to add the office network." }, 403),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock in" }));

    expect(
      await screen.findByRole("dialog", { name: "You can't clock in yet" }),
    ).toBeInTheDocument();
  });

  it("another refusal is said in a toast", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", CLOCK, NOT_IN),
      on("POST", "/api/clock/in/", { detail: "You're already clocked in." }, 400),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock in" }));

    expect(await screen.findByText("You're already clocked in.")).toBeInTheDocument();
  });

  it("while the app is being updated, the toast says so, not that it didn't work (ticket 14)", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", CLOCK, NOT_IN),
      on("POST", "/api/clock/in/", { detail: SESSION_TEXT.updating, code: "updating" }, 503),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock in" }));

    expect(await screen.findByText(SESSION_TEXT.updating)).toBeInTheDocument();
    expect(screen.queryByText("That didn't work. Try again.")).not.toBeInTheDocument();
  });

  it("an Admin is told they can clock in anywhere, and needs no Work from home", async () => {
    backend(on("GET", CLOCK, { ...NOT_IN, office_network: "off", anywhere: "admin" }));

    renderGreeting({
      ...COUNSELLOR,
      staff: { ...COUNSELLOR.staff, role: "admin" },
    });
    const clock = await clockRegion();

    expect(within(clock).getByText("Admins can clock in anywhere")).toBeInTheDocument();
    expect(within(clock).queryByText("Not on the office network")).not.toBeInTheDocument();
    expect(within(clock).queryByRole("button", { name: "Work from home" })).not.toBeInTheDocument();
  });

  it("on Work from home dates it says working from home today", async () => {
    backend(on("GET", CLOCK, { ...NOT_IN, office_network: "off", anywhere: "work_from_home" }));

    renderGreeting();
    const clock = await clockRegion();

    expect(within(clock).getByText("Working from home today")).toBeInTheDocument();
  });

  it("Work from home beside the clock asks for dates", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", CLOCK, NOT_IN),
      on(
        "POST",
        "/api/clock/work-from-home/",
        {
          id: 7,
          staff_id: 3,
          starts_on: "2026-11-05",
          ends_on: null,
          reason: "Plumber",
          status: "waiting",
          set_directly: false,
          asked_by: "Bikash Thapa",
          asked_at: NOW,
          answered_by: null,
          answered_at: null,
        },
        201,
      ),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Work from home" }));
    const dialog = screen.getByRole("dialog", { name: "Ask to work from home" });
    await user.type(within(dialog).getByLabelText("Reason"), "Plumber");
    await user.click(within(dialog).getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", "/api/clock/work-from-home/")).toHaveLength(1);
  });

  it("off the office network, the dialog offers to ask to work from home", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", CLOCK, { ...NOT_IN, office_network: "off" }),
      on(
        "POST",
        "/api/clock/in/",
        { detail: "You can only clock in from the office network." },
        403,
      ),
    );
    renderGreeting();

    await user.click(within(await clockRegion()).getByRole("button", { name: "Clock in" }));
    const dialog = await screen.findByRole("dialog", { name: "You're not on the office network" });
    expect(
      within(dialog).getByText(
        "Nothing was recorded. Working from home? Ask an Admin for Work from home dates first.",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Ask to work from home" }));

    expect(screen.getByRole("dialog", { name: "Ask to work from home" })).toBeInTheDocument();
  });

  it("says when the clock can't be loaded", async () => {
    backend();

    renderGreeting();

    expect(await screen.findByText("The clock couldn't be loaded.")).toBeInTheDocument();
  });

  it.each([
    ["Clock-in is off", CLOCK_OFF],
    ["a Platform Admin is visiting", VISITING],
  ])("there is no clock when %s", async (_, context) => {
    const fetchFn = backend(on("GET", CLOCK, NOT_IN));

    renderGreeting(context);

    expect(await screen.findByRole("heading", { name: "Namaste, Bikash" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Clock in and out" })).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", CLOCK)).toHaveLength(0);
  });
});
