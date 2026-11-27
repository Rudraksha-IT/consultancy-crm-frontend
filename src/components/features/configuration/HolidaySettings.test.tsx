import { uid } from "@/test/ids";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { formatAdDate, monthGrid, monthOf } from "@/lib/dates";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { HolidaySettings } from "./HolidaySettings";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};
const PATH = "/api/clock/holidays/";
const DASHAIN = { id: uid(4), date: "2026-10-21", name: "Dashain" };
const TIHAR = [
  { id: uid(5), date: "2026-11-08", name: "Tihar" },
  { id: uid(6), date: "2026-11-09", name: "Tihar" },
  { id: uid(7), date: "2026-11-10", name: "Tihar" },
];
const PAST = { id: uid(3), date: "2026-09-19", name: "Constitution Day" };

const TODAY = "2026-10-15";
const HolidayBody = z.object({ name: z.string(), dates: z.array(z.string()) });

function renderSection(staff: StaffContext = ADMIN) {
  render(
    <StaffContextContext value={staff}>
      <ToastProvider>
        <HolidaySettings />
      </ToastProvider>
    </StaffContextContext>,
  );
}

function calendar(): HTMLElement {
  return screen.getByRole("group", { name: /^Choose the days/ });
}

function day(iso: string): HTMLElement {
  return within(calendar()).getByRole("button", { name: new RegExp(`^${formatAdDate(iso)}`) });
}

function cards(): string[] {
  return within(screen.getByRole("list", { name: "Coming up" }))
    .getAllByRole("listitem")
    .map((card) => card.textContent);
}

/** A backend that keeps the holidays: POST adds every day sent, DELETE removes every id sent. */
function holidayBackend(start: readonly { id: string; date: string; name: string }[]) {
  let holidays = [...start];
  return backend(
    onEach("GET", PATH, () => ({ holidays })),
    (path, init) => {
      if (path !== PATH || init?.method !== "POST") return undefined;
      const sent = HolidayBody.parse(JSON.parse(typeof init.body === "string" ? init.body : "{}"));
      const added = sent.dates.map((date, index) => ({
        id: uid(50 + holidays.length + index),
        date,
        name: sent.name,
      }));
      holidays = [...holidays, ...added];
      return jsonResponse({ holidays: added }, 201);
    },
    (path, init) => {
      if (path !== PATH || init?.method !== "DELETE") return undefined;
      const sent = z
        .object({ ids: z.array(z.string()) })
        .parse(JSON.parse(typeof init.body === "string" ? init.body : "{}"));
      holidays = holidays.filter((holiday) => !sent.ids.includes(holiday.id));
      return new Response(null, { status: 204 });
    },
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T06:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("HolidaySettings (asked 2026-11-16; UI revamp 17)", () => {
  it("shows the coming holidays as whole holidays, and no past ones", async () => {
    backend(on("GET", PATH, { holidays: [PAST, DASHAIN, ...TIHAR] }));

    renderSection();

    expect(await screen.findByRole("heading", { name: "Coming up" })).toBeVisible();
    expect(cards()).toEqual([
      "Oct21DashainWednesday21 Oct 2026Remove",
      "Nov8–10Tihar3 days, Sun to Tue8–10 Nov 2026Remove",
    ]);
    expect(screen.getByText("2 holidays, 4 days")).toBeVisible();
    expect(screen.queryByText("Constitution Day")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Past holidays" })).toBeNull();
    expect(
      screen.getByText(/They count as days off, like the weekly days off/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("says when there are none, and when none is coming up", async () => {
    backend(on("GET", PATH, { holidays: [] }));
    renderSection();

    expect(
      await screen.findByText(
        "No holidays yet. Add the days the office closes, like Dashain and Tihar.",
      ),
    ).toBeInTheDocument();

    cleanup();
    backend(on("GET", PATH, { holidays: [PAST] }));
    renderSection();

    expect(await screen.findByText("No holidays coming up.")).toBeInTheDocument();
    expect(screen.queryByText("Constitution Day")).toBeNull();
  });

  it("adds a holiday by tapping its days, in one call, and shows it as one holiday", async () => {
    const user = userEvent.setup();
    const fetchFn = holidayBackend([]);
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    await user.type(screen.getByLabelText("Name"), "Dashain");
    await user.click(day("2026-10-22"));
    await user.click(day("2026-10-23"));
    await user.click(day("2026-10-26"));
    expect(day("2026-10-23")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("3 days chosen.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(await screen.findByText("Dashain added for 3 days")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PATH).map((call) => call[1]?.body)).toEqual([
      '{"name":"Dashain","dates":["2026-10-22","2026-10-23","2026-10-26"]}',
    ]);
    expect(cards()).toEqual(["Oct22–23, 26Dashain3 days22–23, 26 Oct 2026Remove"]);
    // Shown from the answer: the list is not read again, so the page never reloads.
    expect(callsTo(fetchFn, "GET", PATH)).toHaveLength(1);
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(day("2026-10-22")).toBeDisabled();
    expect(screen.queryByText(/chosen\.$/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add holiday" })).toHaveFocus();
  });

  it("adds one day and says so without counting days", async () => {
    const user = userEvent.setup();
    holidayBackend([]);
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    await user.click(day("2026-10-21"));
    expect(screen.getByText("1 day chosen.")).toBeVisible();
    await user.type(screen.getByLabelText("Name"), "  Dashain ");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(await screen.findByText("Dashain added")).toBeInTheDocument();
    expect(cards()).toEqual(["Oct21DashainWednesday21 Oct 2026Remove"]);
  });

  it("a second tap takes a day off, and days are sent in order whatever the taps", async () => {
    const user = userEvent.setup();
    const fetchFn = holidayBackend([]);
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    await user.click(day("2026-10-24"));
    await user.click(day("2026-10-22"));
    await user.click(day("2026-10-23"));
    await user.click(day("2026-10-24"));
    expect(day("2026-10-24")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("2 days chosen.")).toBeVisible();
    await user.type(screen.getByLabelText("Name"), "Dashain");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    await screen.findByText("Dashain added for 2 days");
    expect(callsTo(fetchFn, "POST", PATH)[0]?.[1]?.body).toBe(
      '{"name":"Dashain","dates":["2026-10-22","2026-10-23"]}',
    );
  });

  it("chooses days across months for one holiday", async () => {
    const user = userEvent.setup();
    const fetchFn = holidayBackend([]);
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    await user.click(day("2026-10-31"));
    await user.click(within(calendar()).getByRole("button", { name: "Next month" }));
    await user.click(day("2026-11-01"));
    expect(screen.getByText("2 days chosen.")).toBeVisible();
    await user.type(screen.getByLabelText("Name"), "Winter break");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    await screen.findByText("Winter break added for 2 days");
    expect(callsTo(fetchFn, "POST", PATH)).toHaveLength(1);
    expect(cards()).toEqual(["Oct–Nov31–1Winter break2 days, Sat to Sun31 Oct–1 Nov 2026Remove"]);
  });

  it("has no Days / From – to choice", async () => {
    backend(on("GET", PATH, { holidays: [] }));
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    expect(screen.queryByRole("group", { name: "How to choose" })).toBeNull();
    expect(screen.queryByRole("button", { name: "From – to" })).toBeNull();
    expect(
      screen.getByText("Tap each day the office is closed. Tap again to take one off."),
    ).toBeVisible();
  });

  it("asks for the days and the name before sending anything", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(on("GET", PATH, { holidays: [] }));
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(screen.getByText("Choose the days on the calendar.")).toBeInTheDocument();
    expect(screen.getByText("Give the holiday a name.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PATH)).toHaveLength(0);
  });

  it("sends no more than 31 days at once", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(on("GET", PATH, { holidays: [] }));
    renderSection();
    await screen.findByText(/^No holidays yet\./);

    for (let date = 1; date <= 31; date += 1) {
      await user.click(day(`2026-10-${String(date).padStart(2, "0")}`));
    }
    await user.click(within(calendar()).getByRole("button", { name: "Next month" }));
    await user.click(day("2026-11-01"));
    await user.type(screen.getByLabelText("Name"), "Long break");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(screen.getByText("Choose at most 31 days at once.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PATH)).toHaveLength(0);
  });

  it("shows the server's refusal under the calendar and keeps the days and the name", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", PATH, { holidays: [DASHAIN] }),
      on("POST", PATH, { dates: ["There is already a holiday on 22 Oct 2026."] }, 400),
    );
    renderSection();
    await screen.findByRole("list", { name: "Coming up" });

    await user.click(day("2026-10-22"));
    await user.click(day("2026-10-23"));
    await user.type(screen.getByLabelText("Name"), "Ghatasthapana");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(
      await screen.findByText("There is already a holiday on 22 Oct 2026."),
    ).toBeInTheDocument();
    expect(day("2026-10-22")).toHaveAttribute("aria-pressed", "true");
    expect(day("2026-10-23")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Name")).toHaveValue("Ghatasthapana");
    expect(cards()).toHaveLength(1);
  });

  it("shows the server's refusal of the name, and a failure that isn't about a field", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", PATH, { holidays: [] }),
      on("POST", PATH, { name: ["Use letters, numbers and punctuation only."] }, 400),
    );
    renderSection();
    await screen.findByText(/^No holidays yet\./);
    await user.click(day("2026-10-22"));
    await user.type(screen.getByLabelText("Name"), "Dashain");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(
      await screen.findByText("Use letters, numbers and punctuation only."),
    ).toBeInTheDocument();

    backend(on("GET", PATH, { holidays: [] }));
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(
      await screen.findByText("The holiday couldn't be saved. Try again later."),
    ).toBeInTheDocument();
    expect(day("2026-10-22")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows this month as a calendar with no dropdowns, the holidays marked, and moves by month", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { holidays: [DASHAIN, ...TIHAR] }));
    renderSection();
    await screen.findByRole("list", { name: "Coming up" });

    expect(within(calendar()).getByText("October 2026")).toBeVisible();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(within(calendar()).getAllByRole("button", { pressed: false }).length).toBeGreaterThan(
      28,
    );
    const dashain = day("2026-10-21");
    expect(dashain).toHaveAccessibleName(`${formatAdDate("2026-10-21")}, Dashain`);
    expect(dashain).toBeDisabled();

    await user.click(within(calendar()).getByRole("button", { name: "Next month" }));
    expect(within(calendar()).getByText("November 2026")).toBeVisible();
    expect(day("2026-11-09")).toBeDisabled();
    await user.click(within(calendar()).getByRole("button", { name: "Previous month" }));
    await user.click(within(calendar()).getByRole("button", { name: "Previous month" }));
    expect(within(calendar()).getByText("September 2026")).toBeVisible();
    // A past holiday is not listed here, but its day is still taken.
  });

  it("marks a past holiday's day as taken though it is not listed", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { holidays: [PAST, DASHAIN] }));
    renderSection();
    await screen.findByRole("list", { name: "Coming up" });

    await user.click(within(calendar()).getByRole("button", { name: "Previous month" }));

    expect(day("2026-09-19")).toBeDisabled();
  });

  it("shows the office's calendar: BS months when the office uses BS", async () => {
    backend(on("GET", PATH, { holidays: [] }));
    renderSection({ ...ADMIN, dateDisplay: "BS" });
    await screen.findByText(/^No holidays yet\./);

    const month = monthOf(TODAY, "BS");
    const title = month === null ? "" : (monthGrid(month, "BS")?.title ?? "");
    expect(title).not.toBe("");
    expect(within(calendar()).getByText(title)).toBeVisible();
  });

  it("removes a whole holiday in one call, only after the shared confirm popup", async () => {
    const user = userEvent.setup();
    const fetchFn = holidayBackend([DASHAIN, ...TIHAR]);
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Remove Tihar, 8–10 Nov 2026" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Tihar?" });
    expect(dialog).toHaveTextContent("Its 3 days will count as ordinary working days again.");
    expect(callsTo(fetchFn, "DELETE", PATH)).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Tihar removed")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", PATH).map((call) => call[1]?.body)).toEqual([
      JSON.stringify({ ids: [uid(5), uid(6), uid(7)] }),
    ]);
    expect(cards()).toEqual(["Oct21DashainWednesday21 Oct 2026Remove"]);
    expect(callsTo(fetchFn, "GET", PATH)).toHaveLength(1);
  });

  it("names the day when a one-day holiday is removed, and Cancel removes nothing", async () => {
    const user = userEvent.setup();
    const fetchFn = holidayBackend([DASHAIN]);
    renderSection();

    const remove = await screen.findByRole("button", { name: "Remove Dashain, 21 Oct 2026" });
    await user.click(remove);
    const dialog = screen.getByRole("dialog", { name: "Remove Dashain?" });
    expect(dialog).toHaveTextContent(
      `${formatAdDate("2026-10-21")} will count as an ordinary working day again.`,
    );
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(callsTo(fetchFn, "DELETE", PATH)).toHaveLength(0);
    expect(cards()).toHaveLength(1);
    expect(remove).toHaveFocus();
  });

  it("puts the cursor on the next Remove after a removal, or on the name when none is left", async () => {
    const user = userEvent.setup();
    holidayBackend([DASHAIN, ...TIHAR]);
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Remove Dashain, 21 Oct 2026" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    await screen.findByText("Dashain removed");

    const tihar = screen.getByRole("button", { name: "Remove Tihar, 8–10 Nov 2026" });
    await waitFor(() => {
      expect(tihar).toHaveFocus();
    });

    await user.click(tihar);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));
    await screen.findByText("Tihar removed");

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveFocus();
    });
  });

  it("keeps the holiday and says so when removing fails", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { holidays: [DASHAIN] }));
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Remove Dashain, 21 Oct 2026" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Dashain?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(
      await within(dialog).findByText("The holiday couldn't be removed. Try again later."),
    ).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });

  it("says when the list can't be loaded", async () => {
    backend();

    renderSection();

    expect(
      await screen.findByText("The holidays couldn't be loaded. Try again later."),
    ).toBeInTheDocument();
  });
});
