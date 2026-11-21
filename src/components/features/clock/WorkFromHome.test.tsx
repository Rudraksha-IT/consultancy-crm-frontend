import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { novemberMonth } from "./clockFixtures";
import { MyWorkingHoursPage } from "./MyWorkingHoursPage";
import { PersonWorkFromHome } from "./PersonWorkFromHome";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Bikash Thapa", email: "bikash@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students", "clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};
const ADMIN: StaffContext = {
  ...COUNSELLOR,
  staff: { id: uid(1), name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
};
const MONTH = "/api/clock/month/?month=2026-11";
const MINE = "/api/clock/work-from-home/";
const PERSON = `/api/clock/staff/${uid(3)}/work-from-home/`;

function dates(overrides: Record<string, unknown> = {}) {
  return {
    id: uid(7),
    staff_id: uid(3),
    starts_on: "2026-11-06",
    ends_on: "2026-11-12",
    reason: "Looking after my mother",
    status: "waiting",
    set_directly: false,
    asked_by: "Bikash Thapa",
    asked_at: "2026-11-05T05:15:00Z",
    answered_by: null,
    answered_at: null,
    ...overrides,
  };
}

function bodyOf(init: RequestInit | undefined): unknown {
  return typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
}

function inContext(context: StaffContext, children: React.ReactNode) {
  return (
    <StaffContextContext value={context}>
      <ToastProvider>{children}</ToastProvider>
    </StaffContextContext>
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

describe("My working hours: my Work from home dates", () => {
  it("lists my dates with their status in words", async () => {
    backend(
      on("GET", MONTH, novemberMonth()),
      on("GET", MINE, {
        can_ask: true,
        results: [
          dates(),
          dates({
            id: uid(6),
            starts_on: "2026-10-28",
            ends_on: "2026-10-28",
            status: "approved",
            answered_by: "Maya Shrestha",
            answered_at: "2026-10-27T11:00:00Z",
            reason: "<b>Plumber</b>",
          }),
          dates({ id: uid(5), starts_on: "2026-10-01", ends_on: null, status: "declined" }),
        ],
      }),
    );

    render(inContext(COUNSELLOR, <MyWorkingHoursPage />));

    expect(await screen.findByRole("heading", { name: "Work from home" })).toBeInTheDocument();
    expect(screen.getByText("6 Nov 2026 to 12 Nov 2026")).toBeInTheDocument();
    expect(screen.getByText("28 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("1 Oct 2026 onwards, no end date")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Declined")).toBeInTheDocument();
    expect(screen.getByText("<b>Plumber</b>")).toBeInTheDocument();
    expect(screen.getByText(/Approved by Maya Shrestha/)).toBeInTheDocument();
    expect(
      screen.getByText("On approved dates you can clock in from any network."),
    ).toBeInTheDocument();
    // Only a waiting request can be cancelled, and only by me.
    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("asks for dates, then lists them", async () => {
    const user = userEvent.setup();
    let mine: unknown[] = [];
    const fetchFn = backend(
      on("GET", MONTH, novemberMonth()),
      onEach("GET", MINE, () => ({ can_ask: true, results: mine })),
      (path, init) => {
        if (path !== MINE || init?.method !== "POST") return undefined;
        mine = [dates()];
        return new Response(JSON.stringify(dates()), { status: 201 });
      },
    );
    render(inContext(COUNSELLOR, <MyWorkingHoursPage />));
    expect(await screen.findByText("No work from home dates yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ask for dates" }));
    const dialog = screen.getByRole("dialog", { name: "Ask to work from home" });
    expect(within(dialog).getByLabelText("From")).toHaveFocus();
    await user.clear(within(dialog).getByLabelText("From"));
    await user.type(within(dialog).getByLabelText("From"), "2026-11-06");
    await user.type(within(dialog).getByLabelText(/^To/), "2026-11-12");
    await user.type(within(dialog).getByLabelText("Reason"), "Looking after my mother");
    await user.click(within(dialog).getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("Request sent")).toBeInTheDocument();
    const [, init] = callsTo(fetchFn, "POST", MINE)[0] ?? [];
    expect(bodyOf(init)).toEqual({
      starts_on: "2026-11-06",
      ends_on: "2026-11-12",
      reason: "Looking after my mother",
    });
    expect(await screen.findByText("6 Nov 2026 to 12 Nov 2026")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("checks the form before sending, and shows what the server refused", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", MONTH, novemberMonth()),
      on("GET", MINE, { can_ask: true, results: [] }),
      on("POST", MINE, { starts_on: ["The start can't be before today."] }, 400),
    );
    render(inContext(COUNSELLOR, <MyWorkingHoursPage />));
    await user.click(await screen.findByRole("button", { name: "Ask for dates" }));
    const dialog = screen.getByRole("dialog", { name: "Ask to work from home" });

    await user.type(within(dialog).getByLabelText(/^To/), "2026-11-04");
    await user.click(within(dialog).getByRole("button", { name: "Send request" }));

    expect(within(dialog).getByText("Say why.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("The end date must be on or after the start date."),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", MINE)).toHaveLength(0);

    await user.clear(within(dialog).getByLabelText(/^To/));
    await user.type(within(dialog).getByLabelText("Reason"), "Plumber");
    await user.click(within(dialog).getByRole("button", { name: "Send request" }));

    expect(await within(dialog).findByText("The start can't be before today.")).toBeInTheDocument();
  });

  it("cancels a waiting request after asking to be sure", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", MONTH, novemberMonth()),
      on("GET", MINE, { can_ask: true, results: [dates()] }),
      on("POST", `/api/clock/work-from-home/${uid(7)}/cancel/`, dates({ status: "cancelled" })),
    );
    render(inContext(COUNSELLOR, <MyWorkingHoursPage />));

    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    const confirm = screen.getByRole("dialog", { name: "Cancel this request?" });
    expect(
      within(confirm).getByText("The Admins are no longer asked to approve these dates."),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole("button", { name: "Cancel request" }));

    expect(await screen.findByText("Request cancelled")).toBeInTheDocument();
    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", `/api/clock/work-from-home/${uid(7)}/cancel/`)).toHaveLength(1);
  });

  it("isn't shown to an Admin, who never needs dates", async () => {
    const fetchFn = backend(on("GET", MONTH, novemberMonth()));

    render(inContext(ADMIN, <MyWorkingHoursPage />));

    await screen.findByRole("group", { name: "Clock-ins, November 2026" });
    expect(screen.queryByRole("heading", { name: "Work from home" })).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", MINE)).toHaveLength(0);
  });

  it("refuses an answer that doesn't match", async () => {
    backend(
      on("GET", MONTH, novemberMonth()),
      on("GET", MINE, { can_ask: true, results: [dates({ status: "maybe" })] }),
    );

    render(inContext(COUNSELLOR, <MyWorkingHoursPage />));

    expect(
      await screen.findByText("The work from home dates couldn't be loaded. Try again later."),
    ).toBeInTheDocument();
  });
});

describe("The Home label in the calendar", () => {
  it("marks a day worked on Work from home dates with the word", async () => {
    const month = novemberMonth();
    const third = month.days[2];
    if (third === undefined) throw new Error("no 3 Nov");
    month.days[2] = { ...third, home: true };
    backend(on("GET", MONTH, month), on("GET", MINE, { can_ask: true, results: [] }));

    render(inContext(COUNSELLOR, <MyWorkingHoursPage />));
    const calendar = await screen.findByRole("group", { name: "Clock-ins, November 2026" });

    expect(within(calendar).getByText("Home")).toBeInTheDocument();
    expect(
      within(calendar).getByText(
        "3 Nov 2026: 4 h, short day, in 9:00 AM, out 1:00 PM, worked from home",
      ),
    ).toBeInTheDocument();
  });
});

describe("An employee's Work from home tab (Admins)", () => {
  function renderPerson() {
    render(inContext(ADMIN, <PersonWorkFromHome staffId={uid(3)} />));
  }

  it("lists the dates with Approve and Decline on a waiting request", async () => {
    backend(
      on("GET", PERSON, {
        staff: { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
        needs_dates: true,
        results: [dates()],
      }),
    );

    renderPerson();

    expect(await screen.findByText("6 Nov 2026 to 12 Nov 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'On these dates Bikash can clock in from any network. Those days show "Home" in Working hours. No address is kept.',
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ["Approve", "approve", "approved", "Approved"],
    ["Decline", "decline", "declined", "Declined"],
  ])("%s answers the request", async (button, action, status, word) => {
    const user = userEvent.setup();
    let current = dates();
    const fetchFn = backend(
      onEach("GET", PERSON, () => ({
        staff: { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
        needs_dates: true,
        results: [current],
      })),
      (path, init) => {
        if (path !== `/api/clock/work-from-home/${uid(7)}/${action}/` || init?.method !== "POST") {
          return undefined;
        }
        current = dates({ status, answered_by: "Maya Shrestha" });
        return new Response(JSON.stringify(current), { status: 200 });
      },
    );
    renderPerson();

    await user.click(await screen.findByRole("button", { name: button }));

    expect(await screen.findAllByText(word)).not.toHaveLength(0);
    expect(callsTo(fetchFn, "POST", `/api/clock/work-from-home/${uid(7)}/${action}/`)).toHaveLength(
      1,
    );
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("ends approved dates after asking to be sure", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", PERSON, {
        staff: { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
        needs_dates: true,
        results: [dates({ status: "approved", starts_on: "2026-11-01", ends_on: null })],
      }),
      on(
        "POST",
        `/api/clock/work-from-home/${uid(7)}/end/`,
        dates({ status: "approved", starts_on: "2026-11-01", ends_on: "2026-11-05" }),
      ),
    );
    renderPerson();

    await user.click(await screen.findByRole("button", { name: "End it" }));
    const confirm = screen.getByRole("dialog", { name: "End these work from home dates today?" });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(confirm).getByRole("button", { name: "End it" }));

    expect(await screen.findByText("Ends today")).toBeInTheDocument();
    expect(await screen.findByText("1 Nov 2026 to 5 Nov 2026")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", `/api/clock/work-from-home/${uid(7)}/end/`)).toHaveLength(1);
  });

  it("sets dates directly", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", PERSON, {
        staff: { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
        needs_dates: true,
        results: [],
      }),
      on("POST", PERSON, dates({ status: "approved", set_directly: true }), 201),
    );
    renderPerson();

    await user.click(await screen.findByRole("button", { name: "Set dates" }));
    const dialog = screen.getByRole("dialog", { name: "Work from home for Bikash Thapa" });
    expect(
      within(dialog).getByText("Set by you, so no approval is needed. They are told."),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Reason"), "Works from Pokhara");
    await user.click(within(dialog).getByRole("button", { name: "Save dates" }));

    expect(await screen.findByText("Dates saved")).toBeInTheDocument();
    const [, init] = callsTo(fetchFn, "POST", PERSON)[0] ?? [];
    expect(bodyOf(init)).toEqual({
      starts_on: "2026-11-05",
      ends_on: null,
      reason: "Works from Pokhara",
    });
  });

  it("says an Admin never needs dates", async () => {
    backend(
      on("GET", PERSON, {
        staff: { id: uid(3), name: "Bikash Thapa", job_title: "Admin", has_left: false },
        needs_dates: false,
        results: [],
      }),
    );

    renderPerson();

    expect(
      await screen.findByText(
        "Admins can clock in from any network, so they never need Work from home dates.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set dates" })).not.toBeInTheDocument();
  });

  it("shows a conflict's reason", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", PERSON, {
        staff: { id: uid(3), name: "Bikash Thapa", job_title: "Counsellor", has_left: false },
        needs_dates: true,
        results: [dates()],
      }),
      on(
        "POST",
        `/api/clock/work-from-home/${uid(7)}/approve/`,
        { detail: "These dates are no longer waiting for an answer." },
        409,
      ),
    );
    renderPerson();

    await user.click(await screen.findByRole("button", { name: "Approve" }));

    expect(
      await screen.findByText("These dates are no longer waiting for an answer."),
    ).toBeInTheDocument();
  });
});
