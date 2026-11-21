import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SetDateDisplayContext } from "@/components/features/shell/dateDisplay";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { DateDisplay } from "@/constants/dates";
import type { StaffContext } from "@/lib/api";
import { formatAdDate, formatBsDate, todayIso } from "@/lib/dates";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, on } from "@/test/backend";

import { DatesSettings } from "./DatesSettings";
import { consultancySummary } from "@/test/consultancy";

const ADMIN: StaffContext = {
  staff: { id: uid(1), name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const DATES_PATH = "/api/configuration/dates/";

/** The section inside a shell whose date setting really changes, as the AppShell's does. */
function Shell({ onSet }: { onSet: (display: DateDisplay) => void }) {
  const [dateDisplay, setDateDisplay] = useState<DateDisplay>("AD");
  return (
    <StaffContextContext value={{ ...ADMIN, dateDisplay }}>
      <SetDateDisplayContext
        value={(display) => {
          setDateDisplay(display);
          onSet(display);
        }}
      >
        <ToastProvider>
          <DatesSettings />
        </ToastProvider>
      </SetDateDisplayContext>
    </StaffContextContext>
  );
}

function renderSection() {
  const onSet = vi.fn<(display: DateDisplay) => void>();
  render(<Shell onSet={onSet} />);
  return { onSet, section: screen.getByRole("region", { name: "Dates" }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DatesSettings", () => {
  it("explains the setting and shows AD chosen, with today's date as it shows", () => {
    backend();
    const { section } = renderSection();

    expect(
      within(section).getByText("The calendar used across the app. Intakes always stay in AD."),
    ).toBeInTheDocument();
    const choice = within(section).getByRole("group", { name: "Date display" });
    expect(within(choice).getByRole("button", { name: "AD (English)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(choice).getByRole("button", { name: "BS (Nepali)" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(section).toHaveTextContent(`Today shows as ${formatAdDate(todayIso())}.`);
  });

  it("saves BS at once, switches the whole app and confirms", async () => {
    const fetchFn = backend(on("PUT", DATES_PATH, { date_display: "BS" }));
    const { onSet, section } = renderSection();

    await userEvent.click(within(section).getByRole("button", { name: "BS (Nepali)" }));

    expect(fetchFn).toHaveBeenCalledWith(
      DATES_PATH,
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ date_display: "BS" }) }),
    );
    expect(onSet).toHaveBeenCalledWith("BS");
    expect(await screen.findByText("Dates now shown in BS")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "BS (Nepali)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(section).toHaveTextContent(`Today shows as ${formatBsDate(todayIso())}.`);
  });

  it("does nothing when the chosen calendar is chosen again", async () => {
    const fetchFn = backend();
    const { onSet, section } = renderSection();

    await userEvent.click(within(section).getByRole("button", { name: "AD (English)" }));

    expect(fetchFn).not.toHaveBeenCalled();
    expect(onSet).not.toHaveBeenCalled();
  });

  it("keeps the old calendar and says so when saving fails", async () => {
    backend(on("PUT", DATES_PATH, { detail: "Only an Admin can change the Configuration." }, 403));
    const { onSet, section } = renderSection();

    await userEvent.click(within(section).getByRole("button", { name: "BS (Nepali)" }));

    expect(await within(section).findByRole("alert")).toHaveTextContent(
      "The date setting couldn't be saved. Check your connection and try again.",
    );
    expect(onSet).not.toHaveBeenCalled();
    expect(within(section).getByRole("button", { name: "AD (English)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("refuses an answer that isn't AD or BS", async () => {
    backend(on("PUT", DATES_PATH, { date_display: "<script>" }));
    const { onSet, section } = renderSection();

    await userEvent.click(within(section).getByRole("button", { name: "BS (Nepali)" }));

    expect(await within(section).findByRole("alert")).toBeInTheDocument();
    expect(onSet).not.toHaveBeenCalled();
  });
});
