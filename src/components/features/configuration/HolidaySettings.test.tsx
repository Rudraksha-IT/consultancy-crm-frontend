import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
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
const TIHAR = { id: uid(5), date: "2026-11-09", name: "Tihar" };

const TODAY = "2026-10-15";
const HolidayBody = z.object({ date: z.string(), name: z.string() });

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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T06:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("HolidaySettings (asked 2026-11-16)", () => {
  it("lists the holidays by day with their names", async () => {
    backend(on("GET", PATH, { holidays: [DASHAIN, TIHAR] }));

    renderSection();

    const list = await screen.findByRole("list", { name: "Holidays" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Dashain");
    expect(rows[0]).toHaveTextContent(formatAdDate("2026-10-21"));
    expect(rows[1]).toHaveTextContent("Tihar");
    expect(
      screen.getByText(/never count as a short day or as not in/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("says when there are none", async () => {
    backend(on("GET", PATH, { holidays: [] }));

    renderSection();

    expect(await screen.findByText("No holidays yet.")).toBeInTheDocument();
  });

  it("adds one with a day and a name, says so and lists it", async () => {
    const user = userEvent.setup();
    let holidays: unknown[] = [];
    const fetchFn = backend(
      onEach("GET", PATH, () => ({ holidays })),
      onEach("POST", PATH, () => {
        holidays = [DASHAIN];
        return DASHAIN;
      }),
    );
    renderSection();
    await screen.findByText("No holidays yet.");

    await user.click(day("2026-10-21"));
    expect(day("2026-10-21")).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText("Name"), "Dashain");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(await screen.findByText("Dashain added")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PATH)[0]?.[1]?.body).toBe(
      '{"date":"2026-10-21","name":"Dashain"}',
    );
    expect(await screen.findByRole("list", { name: "Holidays" })).toHaveTextContent("Dashain");
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("asks for the day and the name before sending anything", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(on("GET", PATH, { holidays: [] }));
    renderSection();
    await screen.findByText("No holidays yet.");

    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(screen.getByText("Choose the days on the calendar.")).toBeInTheDocument();
    expect(screen.getByText("Give the holiday a name.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PATH)).toHaveLength(0);
  });

  it("shows the server's refusal on its field", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", PATH, { holidays: [DASHAIN] }),
      on("POST", PATH, { date: ["There is already a holiday on that day."] }, 400),
    );
    renderSection();
    await screen.findByRole("list", { name: "Holidays" });

    await user.click(day("2026-10-22"));
    await user.type(screen.getByLabelText("Name"), "Ghatasthapana");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(await screen.findByText("There is already a holiday on that day.")).toBeInTheDocument();
  });

  it("shows this month as a calendar with no dropdowns, the holidays marked, and moves by month", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { holidays: [DASHAIN, TIHAR] }));
    renderSection();
    await screen.findByRole("list", { name: "Holidays" });

    expect(within(calendar()).getByText("October 2026")).toBeVisible();
    expect(within(calendar()).queryByRole("combobox")).toBeNull();
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
  });

  it("adds several days with one name, e.g. all of Dashain, and a second tap un-chooses a day", async () => {
    const user = userEvent.setup();
    let holidays: unknown[] = [];
    const fetchFn = backend(
      onEach("GET", PATH, () => ({ holidays })),
      (path, init) => {
        if (path !== PATH || init?.method !== "POST") return undefined;
        const sent = HolidayBody.parse(
          JSON.parse(typeof init.body === "string" ? init.body : "{}"),
        );
        const made = { id: uid(holidays.length + 10), ...sent };
        holidays = [...holidays, made];
        return jsonResponse(made, 201);
      },
    );
    renderSection();
    await screen.findByText("No holidays yet.");

    await user.click(day("2026-10-22"));
    await user.click(day("2026-10-23"));
    await user.click(day("2026-10-24"));
    await user.click(day("2026-10-24"));
    expect(day("2026-10-24")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("2 days chosen")).toBeVisible();
    await user.type(screen.getByLabelText("Name"), "Dashain");
    await user.click(screen.getByRole("button", { name: "Add holiday" }));

    expect(await screen.findByText("Dashain added on 2 days")).toBeInTheDocument();
    expect(callsTo(fetchFn, "POST", PATH).map((call) => call[1]?.body)).toEqual([
      '{"date":"2026-10-22","name":"Dashain"}',
      '{"date":"2026-10-23","name":"Dashain"}',
    ]);
    expect(await screen.findAllByText("Dashain")).toHaveLength(2);
    expect(day("2026-10-22")).toBeDisabled();
  });

  it("chooses every day from one tap to the next in From – to, across months, skipping holidays", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { holidays: [DASHAIN] }));
    renderSection();
    await screen.findByRole("list", { name: "Holidays" });

    await user.click(
      within(screen.getByRole("group", { name: "How to choose" })).getByRole("button", {
        name: "From – to",
      }),
    );
    expect(screen.getByText("Tap the first day.")).toBeVisible();
    await user.click(day("2026-10-19"));
    expect(screen.getByText("Now tap the last day.")).toBeVisible();
    await user.click(within(calendar()).getByRole("button", { name: "Next month" }));
    await user.click(day("2026-11-02"));

    // 19 Oct to 2 Nov is 15 days; 21 Oct is already Dashain.
    expect(screen.getByText("14 days chosen")).toBeVisible();
    expect(day("2026-11-01")).toHaveAttribute("aria-pressed", "true");
    await user.click(within(calendar()).getByRole("button", { name: "Previous month" }));
    expect(day("2026-10-19")).toHaveAttribute("aria-pressed", "true");
    expect(day("2026-10-18")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Tap the first day.")).toBeVisible();
  });

  it("takes From – to either way round", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { holidays: [] }));
    renderSection();
    await screen.findByText("No holidays yet.");

    await user.click(screen.getByRole("button", { name: "From – to" }));
    await user.click(day("2026-10-12"));
    await user.click(day("2026-10-10"));

    expect(screen.getByText("3 days chosen")).toBeVisible();
  });

  it("shows the office's calendar: BS months when the office uses BS", async () => {
    backend(on("GET", PATH, { holidays: [] }));
    renderSection({ ...ADMIN, dateDisplay: "BS" });
    await screen.findByText("No holidays yet.");

    const month = monthOf(TODAY, "BS");
    const title = month === null ? "" : (monthGrid(month, "BS")?.title ?? "");
    expect(title).not.toBe("");
    expect(within(calendar()).getByText(title)).toBeVisible();
  });

  it("removes one only after the shared confirm popup", async () => {
    const user = userEvent.setup();
    let holidays: unknown[] = [DASHAIN];
    const fetchFn = backend(
      onEach("GET", PATH, () => ({ holidays })),
      onEach("DELETE", `${PATH}${uid(4)}/`, () => {
        holidays = [];
        return null;
      }),
    );
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Remove Dashain" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Dashain?" });
    expect(dialog).toHaveTextContent(
      `${formatAdDate("2026-10-21")} will count as an ordinary working day again.`,
    );
    expect(callsTo(fetchFn, "DELETE", `${PATH}${uid(4)}/`)).toHaveLength(0);
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Dashain removed")).toBeInTheDocument();
    expect(callsTo(fetchFn, "DELETE", `${PATH}${uid(4)}/`)).toHaveLength(1);
    expect(await screen.findByText("No holidays yet.")).toBeInTheDocument();
  });

  it("says when the list can't be loaded", async () => {
    backend();

    renderSection();

    expect(
      await screen.findByText("The holidays couldn't be loaded. Try again later."),
    ).toBeInTheDocument();
  });
});
