import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { formatAdDateTime } from "@/lib/dates";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { WorkingDaySettings } from "./WorkingDaySettings";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Maya Shrestha", email: "maya@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["clock_in"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};
const PATH = "/api/clock/working-day/";
const DAYS_OFF_PATH = "/api/clock/days-off/";
const AT = "2026-11-05T05:15:00Z";

function renderSection() {
  render(
    <StaffContextContext value={ADMIN}>
      <ToastProvider>
        <WorkingDaySettings />
      </ToastProvider>
    </StaffContextContext>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WorkingDaySettings", () => {
  it("is a box to type the hours in, not a list (asked 2026-11-17)", async () => {
    backend(on("GET", PATH, { minutes: 450, weekly_off: "saturday", changes: [] }));

    renderSection();

    const hours = await screen.findByRole("textbox", { name: "Hours in a working day" });
    expect(hours).toHaveValue("7.5");
    expect(hours).toHaveAttribute("inputmode", "decimal");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Between 4 and 12, in half hours.")).toBeInTheDocument();
  });

  it.each(["3.5", "12.5", "7.25", "eight", "", "-8", "8h"])(
    "refuses %j before sending anything",
    async (typed) => {
      const user = userEvent.setup();
      const fetchFn = backend(
        on("GET", PATH, { minutes: 480, weekly_off: "saturday", changes: [] }),
      );
      renderSection();
      const hours = await screen.findByRole("textbox", { name: "Hours in a working day" });

      await user.clear(hours);
      if (typed !== "") await user.type(hours, typed);
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(
        await screen.findByText("Enter between 4 and 12 hours, in half hours."),
      ).toBeInTheDocument();
      expect(callsTo(fetchFn, "PUT", PATH)).toHaveLength(0);
    },
  );

  it("saves a new one, says so and shows who changed it", async () => {
    const user = userEvent.setup();
    let answer: { minutes: number; weekly_off: string; changes: unknown[] } = {
      minutes: 480,
      weekly_off: "saturday",
      changes: [],
    };
    const change = { id: uid(1), old_minutes: 480, new_minutes: 450, by: "Maya Shrestha", at: AT };
    const fetchFn = backend(
      onEach("GET", PATH, () => answer),
      onEach("PUT", PATH, () => {
        answer = { minutes: 450, weekly_off: "saturday", changes: [change] };
        return answer;
      }),
    );
    renderSection();

    const hours = await screen.findByRole("textbox", { name: "Hours in a working day" });
    await user.clear(hours);
    await user.type(hours, "7.5");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("The working day is now 7.5 h")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", PATH)[0]?.[1]?.body).toBe('{"minutes":450}');
    expect(
      await screen.findByText(
        `Changed the working day from 8 h to 7.5 h. Maya Shrestha, ${formatAdDateTime(AT)}`,
      ),
    ).toBeInTheDocument();
  });

  it("shows the server's refusal", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", PATH, { minutes: 480, weekly_off: "saturday", changes: [] }),
      on("PUT", PATH, { minutes: ["Enter between 4 and 12 hours, in half hours."] }, 400),
    );
    renderSection();

    await screen.findByLabelText("Hours in a working day");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Enter between 4 and 12 hours, in half hours."),
    ).toBeInTheDocument();
  });

  it("says when it can't be loaded or saved", async () => {
    const user = userEvent.setup();
    backend(on("GET", PATH, { minutes: 480, weekly_off: "saturday", changes: [] }));
    renderSection();

    await screen.findByLabelText("Hours in a working day");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("The working day couldn't be saved. Try again."),
    ).toBeInTheDocument();
  });

  it("says when it can't be loaded", async () => {
    backend();

    renderSection();

    expect(
      await screen.findByText("The working day couldn't be loaded. Try again later."),
    ).toBeInTheDocument();
  });

  it("puts Saturday and Sunday beside the hours, in the same box, Saturday closed at first", async () => {
    backend(on("GET", PATH, { minutes: 480, weekly_off: "saturday", changes: [] }));

    renderSection();

    const daysOff = await screen.findByRole("group", { name: "Weekly days off" });
    const days = within(daysOff).getAllByRole("button");
    expect(days.map((day) => day.getAttribute("aria-label"))).toEqual(["Saturday", "Sunday"]);
    expect(days[0]).toHaveAttribute("aria-pressed", "true");
    expect(days[1]).toHaveAttribute("aria-pressed", "false");
    expect(days[0]).toHaveTextContent("Closed");
    expect(days[1]).toHaveTextContent("Open");
    expect(screen.getByText(/never count as not in or a short day/)).toBeInTheDocument();
    const hours = screen.getByRole("textbox", { name: "Hours in a working day" });
    expect(hours.closest("[data-panel]")).toContainElement(daysOff);
    expect(document.querySelectorAll("[data-panel]")).toHaveLength(1);
  });

  it.each([
    {
      from: "saturday",
      tap: "Sunday",
      sent: "both",
      toast: "Days off are now Saturday and Sunday",
    },
    { from: "both", tap: "Saturday", sent: "sunday", toast: "Days off are now Sunday" },
    { from: "sunday", tap: "Sunday", sent: "none", toast: "No weekly days off now" },
    { from: "none", tap: "Saturday", sent: "saturday", toast: "Days off are now Saturday" },
  ])("from $from, tapping $tap saves $sent at once", async ({ from, tap, sent, toast }) => {
    const user = userEvent.setup();
    const fetchFn = backend(
      on("GET", PATH, { minutes: 480, weekly_off: from, changes: [] }),
      on("PUT", DAYS_OFF_PATH, { minutes: 480, weekly_off: sent, changes: [] }),
    );
    renderSection();
    const daysOff = await screen.findByRole("group", { name: "Weekly days off" });

    await user.click(within(daysOff).getByRole("button", { name: tap }));

    expect(await screen.findByText(toast)).toBeInTheDocument();
    expect(callsTo(fetchFn, "PUT", DAYS_OFF_PATH)[0]?.[1]?.body).toBe(
      JSON.stringify({ weekly_off: sent }),
    );
  });

  it("puts the days back and says so when they can't be saved", async () => {
    const user = userEvent.setup();
    backend(
      on("GET", PATH, { minutes: 480, weekly_off: "saturday", changes: [] }),
      on("PUT", DAYS_OFF_PATH, { detail: "Server error." }, 500),
    );
    renderSection();
    const daysOff = await screen.findByRole("group", { name: "Weekly days off" });

    await user.click(within(daysOff).getByRole("button", { name: "Saturday" }));

    expect(
      await screen.findByText("The days off couldn't be saved. Try again."),
    ).toBeInTheDocument();
    expect(within(daysOff).getByRole("button", { name: "Saturday" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
