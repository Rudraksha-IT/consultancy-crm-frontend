import { uid } from "@/test/ids";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { CLOCK_VIEW_KEY } from "@/constants/clock";
import { fakeMatchMedia } from "@/test/matchMedia";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { novemberMonth } from "./clockFixtures";
import { MyWorkingHoursPage } from "./MyWorkingHoursPage";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};
const ADMIN: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(1), name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
};
const MONTH = "/api/clock/month/?month=2026-11";
const MINE = "/api/clock/work-from-home/";
const NO_DATES = { can_ask: true, results: [] };
const HOLIDAYS = "/api/clock/holidays/";
/** Today is 5 Nov 2026: Dashain and Constitution Day are over, Tihar (with a gap) is coming. */
const OFFICE_HOLIDAYS = {
  holidays: [
    { id: uid(40), date: "2026-09-19", name: "Constitution Day" },
    { id: uid(41), date: "2026-10-21", name: "Dashain" },
    { id: uid(42), date: "2026-11-08", name: "Tihar" },
    { id: uid(43), date: "2026-11-09", name: "Tihar" },
    { id: uid(44), date: "2026-11-10", name: "Tihar" },
    { id: uid(45), date: "2026-11-12", name: "Tihar" },
    { id: uid(46), date: "2026-12-25", name: "Christmas" },
  ],
};

function page(context: StaffContext, askedTab: string | null) {
  return (
    <StaffContextContext value={context}>
      <ToastProvider>
        <MyWorkingHoursPage askedTab={askedTab} />
      </ToastProvider>
    </StaffContextContext>
  );
}

function renderPage(context: StaffContext = COUNSELLOR, askedTab: string | null = null) {
  return render(page(context, askedTab));
}

function onAPhone(): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => query === PHONE_QUERY,
    ).matchMedia,
  );
}

/** The cells of the List's rows, each row as its texts. */
/** What an element says, or "" when it is not there. */
function wordsOf(element: Element | undefined): string {
  return element?.textContent ?? "";
}

/** A day of the List as its three parts: the day, its times line (or ""), and its status. */
function rowParts(row: HTMLElement): string[] {
  const [words, status] = [...row.children];
  const [day, times] = words === undefined ? [] : [...words.children];
  return [wordsOf(day), wordsOf(times), wordsOf(status)];
}

function listRows(): string[][] {
  const list = screen.getByRole("list", { name: "Days of November 2026" });
  return within(list).getAllByRole("listitem").map(rowParts);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-05T05:15:00Z"));
});

afterEach(() => {
  // Unmount first: the month follows the screen's width, which needs the stubbed matchMedia.
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("MyWorkingHoursPage", () => {
  it("shows this month's figures above a Sunday-first calendar", async () => {
    backend(on("GET", MONTH, novemberMonth()));

    renderPage();

    expect(screen.getByRole("heading", { name: "Working hours" })).toBeInTheDocument();
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
    // The calendar's text is 13 (ticket 25); the small Corrected and Home marks stay 12.
    expect(within(calendar).getByText("Sun")).toHaveClass("text-cal");
    expect(within(calendar).getByText("9:02 AM –").closest(".text-cal")).not.toBeNull();
    expect(within(calendar).getByText("Corrected")).toHaveClass("text-tiny");
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

    // The month is chosen above the calendar, on the line of the Calendar / List switch.
    const stepper = screen.getByRole("group", { name: "Month" });
    expect(stepper).toHaveTextContent("November 2026");
    expect(stepper.parentElement).toContainElement(
      screen.getByRole("group", { name: "Show the month as" }),
    );
    // The month and its arrows sit in the middle of that line, the switch at its right (owner).
    expect(stepper.parentElement).toHaveClass("grid", "grid-cols-[1fr_auto_1fr]");
    expect(stepper).toHaveClass("col-start-2");
    const previous = within(stepper).getByRole("button", { name: "Previous month" });
    await user.click(previous);

    expect(await screen.findByText("Your clock-ins for October 2026.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", "/api/clock/month/?month=2026-10")).toHaveLength(1);
    // The name changes at once and the cursor stays on the arrow (rule 8).
    expect(stepper).toHaveTextContent("October 2026");
    expect(previous).toHaveFocus();
  });

  it("stops at this month: the arrow to the next month is off, and stays where the cursor is", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", MONTH, novemberMonth()),
      on("GET", "/api/clock/month/?month=2026-10", { ...novemberMonth(), month: "2026-10" }),
    );
    renderPage();
    await screen.findByRole("group", { name: "Clock-ins, November 2026" });
    const stepper = screen.getByRole("group", { name: "Month" });
    const next = within(stepper).getByRole("button", { name: "Next month" });

    expect(next).toHaveAttribute("aria-disabled", "true");
    await user.click(next);
    expect(callsTo(fetchFn, "GET", MONTH)).toHaveLength(1);

    await user.click(within(stepper).getByRole("button", { name: "Previous month" }));
    expect(next).toHaveAttribute("aria-disabled", "false");
    await user.click(next);

    expect(stepper).toHaveTextContent("November 2026");
    // Back at this month the arrow is off again, yet still there with the cursor on it.
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveFocus();
  });

  it("gives an Admin a way to everyone's hours", async () => {
    backend(on("GET", MONTH, novemberMonth()));

    renderPage(ADMIN);

    expect(await screen.findByRole("link", { name: "Everyone's hours" })).toHaveAttribute(
      "href",
      "/staff?tab=hours",
    );
    expect(
      await screen.findByRole("group", { name: "Clock-ins, November 2026" }),
    ).toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: "Working hours" })).not.toBeInTheDocument();
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

describe("Working hours: the tabs (UI revamp 16)", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("has Working hours, Work from home and Holidays, opening on my hours", async () => {
    const fetchFn = backend(on("GET", MONTH, novemberMonth()), on("GET", MINE, NO_DATES));

    renderPage();

    const tabs = within(screen.getByRole("tablist", { name: "Show" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Working hours",
      "Work from home",
      "Holidays",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("group", { name: "Clock-ins, November 2026" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Month" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ask for dates" })).toBeNull();
    // My dates are only read when their tab opens.
    expect(callsTo(fetchFn, "GET", MINE)).toHaveLength(0);
    expect(callsTo(fetchFn, "GET", HOLIDAYS)).toHaveLength(0);
  });

  it("switches to Work from home in place: the cursor stays on the tab and the address notes it", async () => {
    const user = userEvent.setup();
    backend(on("GET", MONTH, novemberMonth()), on("GET", MINE, NO_DATES));
    renderPage();
    await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    await user.click(screen.getByRole("tab", { name: "Work from home" }));

    expect(await screen.findByText("No work from home dates yet.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Work from home" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Work from home" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText("Ask for dates to work from home. An Admin approves or declines them."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask for dates" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Month")).toBeNull();
    expect(screen.queryByRole("group", { name: "Clock-ins, November 2026" })).toBeNull();
    expect(window.location.search).toBe("?tab=wfh");

    await user.click(screen.getByRole("tab", { name: "Working hours" }));

    expect(await screen.findByRole("group", { name: "Clock-ins, November 2026" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Working hours" })).toHaveFocus();
    expect(window.location.search).toBe("");
  });

  it("opens on Work from home when the address asks for it (an answer in the bell)", async () => {
    backend(on("GET", MONTH, novemberMonth()), on("GET", MINE, NO_DATES));

    renderPage(COUNSELLOR, "wfh");

    expect(await screen.findByText("No work from home dates yet.")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Work from home" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("follows the address when it changes while the page is open", async () => {
    backend(on("GET", MONTH, novemberMonth()), on("GET", MINE, NO_DATES));
    const { rerender } = renderPage();
    await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    rerender(page(COUNSELLOR, "wfh"));

    expect(await screen.findByText("No work from home dates yet.")).toBeInTheDocument();
  });

  it.each(["holiday", "WFH", "<script>alert(1)</script>", "../staff", ""])(
    "opens on my hours for a tab that isn't one (%j)",
    async (asked) => {
      backend(on("GET", MONTH, novemberMonth()), on("GET", MINE, NO_DATES));

      renderPage(COUNSELLOR, asked);

      expect(await screen.findByRole("group", { name: "Clock-ins, November 2026" })).toBeVisible();
      expect(screen.getByRole("tab", { name: "Working hours" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    },
  );

  it("gives an Admin no Work from home tab, even when the address asks", async () => {
    const fetchFn = backend(on("GET", MONTH, novemberMonth()));

    renderPage(ADMIN, "wfh");

    expect(await screen.findByRole("group", { name: "Clock-ins, November 2026" })).toBeVisible();
    const tabs = within(screen.getByRole("tablist", { name: "Show" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Working hours", "Holidays"]);
    expect(screen.queryByText("Work from home")).toBeNull();
    expect(screen.queryByRole("button", { name: "Ask for dates" })).toBeNull();
    expect(callsTo(fetchFn, "GET", MINE)).toHaveLength(0);
  });
});

describe("Working hours: the month as a Calendar or a List (UI revamp 16)", () => {
  it("shows the Calendar first, with a switch to the List that is remembered on the device", async () => {
    const user = userEvent.setup();
    backend(on("GET", MONTH, novemberMonth()));
    const { unmount } = renderPage();
    await screen.findByRole("group", { name: "Clock-ins, November 2026" });
    const switcher = screen.getByRole("group", { name: "Show the month as" });
    expect(within(switcher).getByRole("button", { name: "Calendar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(within(switcher).getByRole("button", { name: "List" }));

    expect(screen.getByRole("list", { name: "Days of November 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Clock-ins, November 2026" })).toBeNull();
    expect(screen.queryByRole("list", { name: "What the days show" })).toBeNull();
    expect(within(switcher).getByRole("button", { name: "List" })).toHaveFocus();
    expect(within(switcher).getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.localStorage.getItem(CLOCK_VIEW_KEY)).toBe("list");
    // The figures, the corrections and the help line stay with either view.
    expect(screen.getByText("Days worked").parentElement).toHaveTextContent("3");
    expect(screen.getByText(/2 Nov 2026: In 9:02 AM, no clock-out → Out 5:26 PM/)).toBeVisible();
    expect(
      screen.getByText("Forgot to clock out, or missed a clock-in? Ask your Admin to correct it."),
    ).toBeInTheDocument();

    unmount();
    renderPage();

    expect(await screen.findByRole("list", { name: "Days of November 2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Calendar" }));

    expect(screen.getByRole("group", { name: "Clock-ins, November 2026" })).toBeInTheDocument();
    expect(window.localStorage.getItem(CLOCK_VIEW_KEY)).toBe("calendar");
  });

  it.each(["board", "<script>alert(1)</script>", "{}", ""])(
    "shows the Calendar when the device remembers something that is no view (%j)",
    async (stored) => {
      window.localStorage.setItem(CLOCK_VIEW_KEY, stored);
      backend(on("GET", MONTH, novemberMonth()));

      renderPage();

      expect(
        await screen.findByRole("group", { name: "Clock-ins, November 2026" }),
      ).toBeInTheDocument();
    },
  );

  it("lists the days up to today, newest first, each with its times, hours and status in words", async () => {
    window.localStorage.setItem(CLOCK_VIEW_KEY, "list");
    backend(on("GET", MONTH, novemberMonth()));

    renderPage();
    await screen.findByRole("list", { name: "Days of November 2026" });

    // Each row: the day, its times on one line, and its status.
    expect(listRows()).toEqual([
      ["5 Nov 2026 Thursday, today", "", "Not in yet"],
      ["4 Nov 2026 Wednesday", "9:00 AM – Missing", "No clock-out"],
      ["3 Nov 2026 Tuesday", "9:00 AM – 1:00 PM · 4h 00m", "Short day"],
      ["2 Nov 2026 Monday", "9:02 AM – 5:26 PM · 8h 24m", "Full dayCorrected"],
      ["1 Nov 2026 Sunday", "", "Not in"],
    ]);
    expect(screen.getByText("5 days so far in November 2026")).toBeInTheDocument();
    // My own days never open.
    expect(screen.queryByRole("button", { name: /Correct/ })).toBeNull();
    expect(screen.queryByRole("list", { name: "Days that can be corrected" })).toBeNull();
  });

  it("says Still in, Day off, the holiday's name and Home", async () => {
    window.localStorage.setItem(CLOCK_VIEW_KEY, "list");
    const month = novemberMonth(undefined, { 9: "Tihar <b>" }, 10);
    const days = month.days.map((day) => {
      if (day.date === "2026-11-10") {
        return {
          ...day,
          first_in: "2026-11-10T09:10:00+05:45",
          minutes: 65,
          still_in: true,
          home: true,
          sessions: [
            {
              id: uid(20),
              clocked_in_at: "2026-11-10T09:10:00+05:45",
              clocked_out_at: null,
              missing_clock_out: false,
              added_by_correction: false,
              clock_out_by_correction: false,
              work_from_home: true,
            },
          ],
        };
      }
      return day;
    });
    backend(on("GET", MONTH, { ...month, days }));

    renderPage();
    await screen.findByRole("list", { name: "Days of November 2026" });

    const rows = listRows();
    expect(rows[0]).toEqual([
      "10 Nov 2026 Tuesday, today",
      "9:10 AM – Still in · 1h 05m",
      "Still inHome",
    ]);
    // A holiday shows its own name, as text.
    expect(rows[1]).toEqual(["9 Nov 2026 Monday", "", "Tihar <b>"]);
    // 7 Nov 2026 is a Saturday, the office's weekly day off.
    expect(rows[3]).toEqual(["7 Nov 2026 Saturday", "", "Day off"]);
  });

  it("shows the whole month small, in two columns, with no pages (owner, 2026-11-27)", async () => {
    window.localStorage.setItem(CLOCK_VIEW_KEY, "list");
    backend(on("GET", MONTH, novemberMonth(undefined, {}, 25)));
    renderPage();
    const list = await screen.findByRole("list", { name: "Days of November 2026" });

    const rows = listRows();
    expect(rows).toHaveLength(25);
    expect(rows[0]?.[0]).toBe("25 Nov 2026 Wednesday, today");
    expect(rows[24]?.[0]).toBe("1 Nov 2026 Sunday");
    expect(screen.getByText("25 days so far in November 2026")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).toBeNull();
    expect(screen.queryByText(/^Page 1 of/)).toBeNull();
    // Two columns filled downwards from tablet width: the newer 13 days, then the older 12.
    expect(list).toHaveClass("grid", "tablet:grid-cols-2", "tablet:grid-flow-col");
    expect(list).toHaveStyle({ gridTemplateRows: "repeat(13, auto)" });
    const items = within(list).getAllByRole("listitem");
    expect(items[12]).toHaveClass("tablet:border-r");
    expect(items[13]).not.toHaveClass("tablet:border-r");
    // Small rows: the day and its times as small text.
    expect(items[0]?.firstElementChild).toHaveClass("text-small");
  });

  it("shows another month's whole List, and counts a finished month without 'so far'", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(CLOCK_VIEW_KEY, "list");
    const october = {
      ...novemberMonth(),
      month: "2026-10",
      days: novemberMonth().days.map((day) => ({
        ...day,
        date: day.date.replace("2026-11", "2026-10"),
        later: false,
        today: false,
      })),
    };
    backend(
      on("GET", MONTH, novemberMonth(undefined, {}, 25)),
      on("GET", "/api/clock/month/?month=2026-10", october),
    );
    renderPage();
    await screen.findByRole("list", { name: "Days of November 2026" });

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const list = await screen.findByRole("list", { name: "Days of October 2026" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(30);
    expect(screen.getByText("30 days in October 2026")).toBeInTheDocument();
  });

  it("on a phone shows the List only: no Calendar and no switch, whatever the device remembers", async () => {
    onAPhone();
    window.localStorage.setItem(CLOCK_VIEW_KEY, "calendar");
    backend(on("GET", MONTH, novemberMonth()));

    renderPage();

    expect(await screen.findByRole("list", { name: "Days of November 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Clock-ins, November 2026" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Show the month as" })).toBeNull();
    expect(screen.queryByRole("list", { name: "What the days show" })).toBeNull();
    // The remembered view is left alone for the computer.
    expect(window.localStorage.getItem(CLOCK_VIEW_KEY)).toBe("calendar");
  });
});

describe("Working hours: Holidays, for everyone (UI revamp 17)", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  function cards(title: string): string[] {
    return within(screen.getByRole("list", { name: title }))
      .getAllByRole("listitem")
      .map((card) => card.textContent);
  }

  it.each([
    ["a Counsellor", COUNSELLOR],
    ["Front Desk", { ...COUNSELLOR, staff: { ...COUNSELLOR.staff, role: "front_desk" as const } }],
    ["a Teacher", { ...COUNSELLOR, staff: { ...COUNSELLOR.staff, role: "teacher" as const } }],
  ])("shows %s Coming up and Past holidays as whole holidays, read only", async (_who, staff) => {
    const user = userEvent.setup();
    backend(on("GET", MONTH, novemberMonth()), on("GET", HOLIDAYS, OFFICE_HOLIDAYS));
    renderPage(staff);

    await user.click(screen.getByRole("tab", { name: "Holidays" }));

    expect(await screen.findByRole("heading", { name: "Coming up" })).toBeVisible();
    expect(cards("Coming up")).toEqual([
      "Nov8–10, 12Tihar4 days8–10, 12 Nov 2026",
      "Dec25ChristmasFriday25 Dec 2026",
    ]);
    expect(screen.getByText("2 holidays, 5 days")).toBeVisible();
    // Past holidays, the newest first.
    expect(screen.getByRole("heading", { name: "Past holidays" })).toBeVisible();
    expect(cards("Past holidays")).toEqual([
      "Oct21DashainWednesday21 Oct 2026",
      "Sep19Constitution DaySaturday19 Sep 2026",
    ]);
    expect(screen.getByText("2 holidays, 2 days")).toBeVisible();
    expect(
      screen.getByText("Days the whole office is closed. Nobody needs to clock in."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Change holidays" })).toBeNull();
    expect(screen.queryByLabelText("Month")).toBeNull();
    expect(screen.getByRole("tab", { name: "Holidays" })).toHaveFocus();
    expect(window.location.search).toBe("?tab=holidays");
  });

  it("opens on Holidays when the address asks for it", async () => {
    backend(on("GET", HOLIDAYS, OFFICE_HOLIDAYS));

    renderPage(COUNSELLOR, "holidays");

    expect(await screen.findByRole("heading", { name: "Coming up" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Holidays" })).toHaveAttribute("aria-selected", "true");
  });

  it("gives an Admin the same lists with no Remove, and Change holidays to Configuration", async () => {
    backend(on("GET", HOLIDAYS, OFFICE_HOLIDAYS));

    renderPage(ADMIN, "holidays");

    expect(await screen.findByRole("heading", { name: "Past holidays" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Change holidays" })).toHaveAttribute(
      "href",
      "/configuration?section=workingHours",
    );
  });

  it("says so when nothing is coming up, and leaves Past holidays out when there are none", async () => {
    backend(
      on("GET", HOLIDAYS, { holidays: [{ id: uid(41), date: "2026-10-21", name: "Dashain" }] }),
    );
    const { unmount } = renderPage(COUNSELLOR, "holidays");

    expect(await screen.findByText("No holidays coming up.")).toBeVisible();
    expect(cards("Past holidays")).toHaveLength(1);

    unmount();
    backend(
      on("GET", HOLIDAYS, { holidays: [{ id: uid(46), date: "2026-12-25", name: "Christmas" }] }),
    );
    renderPage(COUNSELLOR, "holidays");

    expect(await screen.findByRole("heading", { name: "Coming up" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Past holidays" })).toBeNull();
  });

  it("counts a holiday that ends today as coming up", async () => {
    backend(
      on("GET", HOLIDAYS, {
        holidays: [
          { id: uid(41), date: "2026-11-04", name: "Tihar" },
          { id: uid(42), date: "2026-11-05", name: "Tihar" },
        ],
      }),
    );

    renderPage(COUNSELLOR, "holidays");

    expect(await screen.findByRole("heading", { name: "Coming up" })).toBeVisible();
    expect(cards("Coming up")).toEqual(["Nov4–5Tihar2 days, Wed to Thu4–5 Nov 2026"]);
  });

  it("says when the office has no holidays, and when they can't be loaded", async () => {
    backend(on("GET", HOLIDAYS, { holidays: [] }));
    const { unmount } = renderPage(COUNSELLOR, "holidays");

    expect(await screen.findByText("No office holidays set yet.")).toBeVisible();

    unmount();
    backend();
    renderPage(COUNSELLOR, "holidays");

    expect(
      await screen.findByText("The holidays couldn't be loaded. Try again later."),
    ).toBeVisible();
  });

  it("shows a holiday's name as plain text", async () => {
    backend(
      on("GET", HOLIDAYS, {
        holidays: [{ id: uid(46), date: "2026-12-25", name: "<img src=x onerror=alert(1)>" }],
      }),
    );

    renderPage(COUNSELLOR, "holidays");

    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeVisible();
    expect(document.querySelector("img[src=x]")).toBeNull();
  });
});
