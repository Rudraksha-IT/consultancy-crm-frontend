import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmployeesPage } from "@/components/features/staff/EmployeesPage";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { novemberMonth } from "./clockFixtures";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const NOW_PATH = "/api/clock/team/now/";
const TEAM_PATH = "/api/clock/team/?month=2026-11";
const BIKASH_MONTH = `/api/clock/month/?month=2026-11&staff=${uid(3)}`;
const TEAM_NOW = {
  now: "2026-11-05T05:15:00Z",
  office_network: "on",
  clocked_in_count: 1,
  people: [
    {
      id: uid(3),
      name: "Bikash Thapa",
      job_title: "Counsellor",
      state: "in",
      since: "2026-11-05T03:17:00Z",
      left_at: null,
    },
    {
      id: uid(4),
      name: "Asha Rai",
      job_title: "Front desk",
      state: "left",
      since: null,
      left_at: "2026-11-05T05:00:00Z",
    },
    {
      id: uid(1),
      name: "Maya Shrestha",
      job_title: "",
      state: "not_in",
      since: null,
      left_at: null,
    },
  ],
};
const FIGURES = {
  days_worked: 3,
  minutes: 744,
  short_days: 1,
  missing_clock_outs: 1,
  corrected: 1,
};
const TEAM = {
  month: "2026-11",
  working_day_minutes: 480,
  rows: [
    {
      staff: { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
      ...FIGURES,
    },
    {
      staff: { id: uid(8), name: "Hari Karki", job_title: "Teacher", has_left: true },
      days_worked: 0,
      minutes: 0,
      short_days: 0,
      missing_clock_outs: 0,
      corrected: 0,
    },
  ],
};
const SAVED = {
  id: uid(10),
  day: "2026-11-04",
  before: "In 9:00 AM, no clock-out",
  after: "Out 5:00 PM",
  reason: "Left at five.",
  by: "Maya Shrestha",
  at: "2026-11-05T05:15:00Z",
};

function renderPage(context: StaffContext = ADMIN) {
  render(
    <StaffContextContext value={context}>
      <ToastProvider>
        <EmployeesPage initialTab="hours" />
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

/** Each person's month opens from "See days" in Hours by month. */
async function openBikashsMonth(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Bikash Thapa, Month" }));
  return screen.findByRole("dialog", { name: "Bikash Thapa, November 2026" });
}

describe("Employees → Working hours", () => {
  it("is a tab beside the people, opening on who's in now", async () => {
    backend(on("GET", NOW_PATH, TEAM_NOW), on("GET", TEAM_PATH, TEAM));

    renderPage();

    expect(
      screen.getByRole("button", { name: "Working hours", pressed: true }),
    ).toBeInTheDocument();
    expect(await screen.findByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("are clocked in now", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("On the office network")).toBeInTheDocument();
  });

  it("puts everyone in one of three groups, each person with a time and no button", async () => {
    backend(on("GET", NOW_PATH, TEAM_NOW), on("GET", TEAM_PATH, TEAM));
    renderPage();
    const now = await screen.findByRole("region", { name: "Who's in now" });

    const inNow = await within(now).findByRole("list", { name: "In now, 1" });
    const left = within(now).getByRole("list", { name: "Left today, 1" });
    const notIn = within(now).getByRole("list", { name: "Not in today, 1" });
    expect(inNow).toHaveTextContent("Bikash Thapa");
    expect(inNow).toHaveTextContent("since 9:02 AM");
    expect(left).toHaveTextContent("Asha Rai");
    expect(left).toHaveTextContent("at 10:45 AM");
    expect(notIn).toHaveTextContent("Maya Shrestha");
    expect(within(now).queryAllByRole("button")).toHaveLength(0);
  });

  it("says when a group is empty", async () => {
    backend(
      on("GET", NOW_PATH, { ...TEAM_NOW, clocked_in_count: 0, people: [TEAM_NOW.people[2]] }),
      on("GET", TEAM_PATH, TEAM),
    );
    renderPage();
    const now = await screen.findByRole("region", { name: "Who's in now" });

    expect(await within(now).findAllByText("No one")).toHaveLength(2);
  });

  it("shows who's in now and everyone's month on one page, with no switch between them", async () => {
    backend(on("GET", NOW_PATH, TEAM_NOW), on("GET", TEAM_PATH, TEAM));
    renderPage();

    const now = await screen.findByRole("region", { name: "Who's in now" });
    expect(await within(now).findByText("1 of 3")).toBeInTheDocument();
    const month = screen.getByRole("region", { name: "Hours by month" });
    expect(await within(month).findByRole("table", { name: "Clock-in" })).toBeInTheDocument();
    expect(within(month).getByRole("combobox", { name: "Month" })).toBeInTheDocument();
    expect(within(month).getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Who's in now" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "By month" })).not.toBeInTheDocument();
  });

  it("has no Working hours tab while Clock-in is off", () => {
    backend(on("GET", "/api/staff/", []));

    render(
      <StaffContextContext value={{ ...ADMIN, modules: ["students"] }}>
        <ToastProvider>
          <EmployeesPage initialTab="hours" />
        </ToastProvider>
      </StaffContextContext>,
    );

    expect(screen.queryByRole("button", { name: "Working hours" })).not.toBeInTheDocument();
  });

  it("shows everyone's month, with who has left, and exports it", async () => {
    const user = userEvent.setup();
    backend(on("GET", NOW_PATH, TEAM_NOW), on("GET", TEAM_PATH, TEAM));
    renderPage();

    const table = await screen.findByRole("table", { name: "Clock-in" });
    const bikash = within(table).getByText("Bikash Thapa").closest("tr");
    expect(bikash).toHaveTextContent("12.4 h");
    expect(bikash).toHaveTextContent("4 h 8 min");
    expect(within(table).getByText("(left)")).toBeInTheDocument();
    expect(
      screen.getByText(
        "November 2026. The working day is 8 h. Days split at midnight, Nepal time.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Export" }));
    const dialog = await screen.findByRole("dialog", { name: "Export clock-in" });
    expect(within(dialog).getByText("Month: November 2026")).toBeInTheDocument();
    expect(within(dialog).getByText(/Employee, Job title, Days worked/)).toBeInTheDocument();
  });

  it("opens a person's month where only days that can be corrected open", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", NOW_PATH, TEAM_NOW),
      on("GET", TEAM_PATH, TEAM),
      on("GET", BIKASH_MONTH, novemberMonth()),
    );
    renderPage();

    const dialog = await openBikashsMonth(user);

    await within(dialog).findByRole("group", { name: "Clock-ins, November 2026" });
    const openable = within(dialog).getAllByRole("button", { name: /Open to correct/ });
    // 1 Nov (not in), 3 Nov (short) and 4 Nov (no clock-out); 2 Nov was a full day.
    expect(openable).toHaveLength(3);
    expect(
      within(dialog).getByText(/Only days that are short of the 8 h working day/),
    ).toBeInTheDocument();
    // On phones the same days are listed as full-size rows under the calendar.
    const list = within(dialog).getByRole("list", { name: "Days that can be corrected" });
    expect(within(list).getByRole("button", { name: "Correct 4 Nov 2026" })).toBeInTheDocument();
    expect(within(list).getByText("No clock-out")).toBeInTheDocument();
    expect(within(list).getByText("Short day, 4 h")).toBeInTheDocument();
    await user.click(within(list).getByRole("button", { name: "Correct 1 Nov 2026" }));
    expect(
      await screen.findByRole("dialog", { name: "Bikash Thapa, 1 Nov 2026" }),
    ).toBeInTheDocument();
  });

  it("sets a forgotten clock-out with a reason, and the month is read again", async () => {
    const user = userEvent.setup();
    let month = novemberMonth();
    const fetchFn = backend(
      on("GET", NOW_PATH, TEAM_NOW),
      on("GET", TEAM_PATH, TEAM),
      onEach("GET", BIKASH_MONTH, () => month),
      on("POST", `/api/clock/sessions/${uid(3)}/clock-out/`, SAVED, 201),
    );
    renderPage();
    const dialog = await openBikashsMonth(user);
    await user.click(
      await within(dialog).findByRole("button", { name: /4 Nov 2026.*Open to correct/ }),
    );

    const day = await screen.findByRole("dialog", { name: "Bikash Thapa, 4 Nov 2026" });
    expect(within(day).getByText("A clock-out is missing.")).toBeInTheDocument();
    expect(within(day).queryByRole("button", { name: "Add missed time" })).not.toBeInTheDocument();
    await user.click(within(day).getByRole("button", { name: "Set clock-out" }));

    const form = await screen.findByRole("dialog", { name: "Set the clock-out for Bikash Thapa" });
    expect(within(form).getByText("9:00 AM, recorded by the clock")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Save correction" }));
    expect(within(form).getByText("Enter the time.")).toBeInTheDocument();
    expect(within(form).getByText("Say why you're correcting it.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", `/api/clock/sessions/${uid(3)}/clock-out/`)).toHaveLength(0);

    await user.type(within(form).getByLabelText("Clocked out"), "17:00");
    month = { ...month, corrections: [...month.corrections, SAVED] };
    // Ctrl + Enter in the reason saves, as the button does; the box is described by the keys.
    const why = within(form).getByLabelText("Why are you correcting it?");
    expect(within(form).getByText("Ctrl + Enter to save")).toBeInTheDocument();
    expect(why).toHaveAccessibleDescription(/Ctrl \+ Enter to save$/);
    await user.type(why, "Left at five.{Control>}{Enter}{/Control}");

    expect(await screen.findByText("Correction saved")).toBeInTheDocument();
    const [, init] = callsTo(fetchFn, "POST", `/api/clock/sessions/${uid(3)}/clock-out/`)[0] ?? [];
    expect(init?.body).toBe('{"clocked_out_at":"17:00","reason":"Left at five."}');
    expect(
      await screen.findByRole("dialog", { name: "Bikash Thapa, November 2026" }),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", BIKASH_MONTH).length).toBeGreaterThan(1);
  });

  it("adds missed time to a short day, and shows a rule the server refuses with", async () => {
    const user = userEvent.setup();
    const detail =
      "That makes the day 8 h 30 min, 30 min longer than the 8 h working day. Only missing time can be added.";
    const fetchFn = backend(
      on("GET", NOW_PATH, TEAM_NOW),
      on("GET", TEAM_PATH, TEAM),
      on("GET", BIKASH_MONTH, novemberMonth()),
      on("POST", `/api/clock/staff/${uid(3)}/missed-time/`, { detail }, 400),
    );
    renderPage();
    const dialog = await openBikashsMonth(user);
    await user.click(
      await within(dialog).findByRole("button", { name: /3 Nov 2026.*Open to correct/ }),
    );
    const day = await screen.findByRole("dialog", { name: "Bikash Thapa, 3 Nov 2026" });
    expect(within(day).getByText("Worked 4 h of the 8 h working day.")).toBeInTheDocument();
    expect(within(day).getByText("Up to 4 h, so the day reaches 8 h.")).toBeInTheDocument();
    expect(within(day).getByText("Recorded by the clock")).toBeInTheDocument();
    await user.click(within(day).getByRole("button", { name: "Add missed time" }));

    const form = await screen.findByRole("dialog", { name: "Add missed time for Bikash Thapa" });
    await user.type(within(form).getByLabelText("From"), "13:00");
    await user.type(within(form).getByLabelText("To"), "17:30");
    await user.type(within(form).getByLabelText("Why are you correcting it?"), "Client visit.");
    await user.click(within(form).getByRole("button", { name: "Save correction" }));

    expect(await within(form).findByText(detail)).toBeInTheDocument();
    const [, init] = callsTo(fetchFn, "POST", `/api/clock/staff/${uid(3)}/missed-time/`)[0] ?? [];
    expect(init?.body).toBe(
      '{"day":"2026-11-03","from":"13:00","to":"17:30","reason":"Client visit."}',
    );
    await user.click(within(form).getByRole("button", { name: "Back" }));
    expect(
      await screen.findByRole("dialog", { name: "Bikash Thapa, 3 Nov 2026" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to the month" }));
    expect(
      await screen.findByRole("dialog", { name: "Bikash Thapa, November 2026" }),
    ).toBeInTheDocument();
  });

  it("shows the server's reason on a field", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", NOW_PATH, TEAM_NOW),
      on("GET", TEAM_PATH, TEAM),
      on("GET", BIKASH_MONTH, novemberMonth()),
      on(
        "POST",
        `/api/clock/staff/${uid(3)}/missed-time/`,
        { from: ["Enter a time such as 17:30."] },
        400,
      ),
    );
    renderPage();
    const dialog = await openBikashsMonth(user);
    await user.click(await within(dialog).findByRole("button", { name: /1 Nov 2026.*Open/ }));
    await user.click(await screen.findByRole("button", { name: "Add missed time" }));
    const form = await screen.findByRole("dialog", { name: "Add missed time for Bikash Thapa" });
    await user.type(within(form).getByLabelText("From"), "09:00");
    await user.type(within(form).getByLabelText("To"), "10:00");
    await user.type(within(form).getByLabelText("Why are you correcting it?"), "x");

    await user.click(within(form).getByRole("button", { name: "Save correction" }));

    expect(await within(form).findByText("Enter a time such as 17:30.")).toBeInTheDocument();
  });

  it("says when the lists can't be loaded", async () => {
    backend();
    renderPage();

    expect(
      await within(await screen.findByRole("region", { name: "Who's in now" })).findByText(
        "The month couldn't be loaded. Try again later.",
      ),
    ).toBeInTheDocument();
    expect(
      await within(screen.getByRole("region", { name: "Hours by month" })).findByText(
        "The month couldn't be loaded. Try again later.",
      ),
    ).toBeInTheDocument();
  });
});
