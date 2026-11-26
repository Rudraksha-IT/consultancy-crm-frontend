import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { SetPageSwipeContext } from "@/components/features/shell/pageSwipe";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { PreferencesSection } from "./PreferencesSection";

const TEACHER: StaffContext = {
  staff: { id: uid(1), name: "Sita Sharma", email: "sita@acme.test", role: "teacher" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};
const PATH = "/api/me/";
const ME = {
  name: "Sita Sharma",
  mobile: "",
  email: "sita@acme.test",
  job_title: "Teacher",
  role: "teacher",
  joined_on: "2026-11-01",
  colour_mode: "light",
  page_swipe: false,
  notifications: { task_given: true, task_due_tomorrow: true, morning_summary: false },
};

/** The section inside a shell whose switch really changes, as the AppShell's does. */
function Shell({ isOnAtFirst, onSet }: { isOnAtFirst: boolean; onSet: (isOn: boolean) => void }) {
  const [pageSwipe, setPageSwipe] = useState(isOnAtFirst);
  return (
    <StaffContextContext value={{ ...TEACHER, pageSwipe }}>
      <SetPageSwipeContext
        value={(isOn) => {
          setPageSwipe(isOn);
          onSet(isOn);
        }}
      >
        <ToastProvider>
          <PreferencesSection />
        </ToastProvider>
      </SetPageSwipeContext>
    </StaffContextContext>
  );
}

function renderSection(isOnAtFirst = false) {
  const onSet = vi.fn<(isOn: boolean) => void>();
  render(<Shell isOnAtFirst={isOnAtFirst} onSet={onSet} />);
  return { onSet, section: screen.getByRole("group", { name: "Swipe between pages" }) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Settings → Preferences: Swipe between pages, each person's own (asked 2026-11-17)", () => {
  it("explains the setting and shows it off by default", () => {
    backend();

    const { section } = renderSection();

    expect(within(section).getByRole("switch", { name: "Swipe between pages" })).not.toBeChecked();
    expect(within(section).getByText(/an ordinary scroll never changes the page/)).toBeVisible();
    expect(within(section).getByText("Only for you, on every device you use.")).toBeVisible();
    const help = within(section).getByText(/an ordinary scroll never changes the page/);
    expect(help.closest("[data-panel]")).toContainElement(
      within(section).getByRole("switch", { name: "Swipe between pages" }),
    );
    expect(help).toHaveClass("text-small");
  });

  it("switches it on for me only, the open app follows at once, and says so", async () => {
    const user = userEvent.setup();
    const fetchFn = backend(on("PATCH", PATH, { ...ME, page_swipe: true }));
    const { onSet, section } = renderSection();

    await user.click(within(section).getByRole("switch", { name: "Swipe between pages" }));

    expect(await screen.findByText("Swipe between pages is on")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PATCH", PATH)[0]?.[1]?.body).toBe('{"page_swipe":true}');
    expect(onSet).toHaveBeenCalledWith(true);
    expect(within(section).getByRole("switch", { name: "Swipe between pages" })).toBeChecked();
  });

  it("switches it off again", async () => {
    const user = userEvent.setup();
    backend(on("PATCH", PATH, ME));
    const { onSet, section } = renderSection(true);

    await user.click(within(section).getByRole("switch", { name: "Swipe between pages" }));

    expect(await screen.findByText("Swipe between pages is off")).toBeInTheDocument();
    expect(onSet).toHaveBeenCalledWith(false);
  });

  it("says when it can't be saved and leaves the app as it was", async () => {
    const user = userEvent.setup();
    backend(on("PATCH", PATH, { detail: "Server error." }, 500));
    const { onSet, section } = renderSection();

    await user.click(within(section).getByRole("switch", { name: "Swipe between pages" }));

    expect(
      await screen.findByText("The setting couldn't be saved. Try again later."),
    ).toBeInTheDocument();
    expect(onSet).not.toHaveBeenCalled();
    expect(within(section).getByRole("switch", { name: "Swipe between pages" })).not.toBeChecked();
  });

  it("refuses an answer it can't read", async () => {
    const user = userEvent.setup();
    backend(on("PATCH", PATH, { ...ME, page_swipe: "yes" }));
    const { onSet, section } = renderSection();

    await user.click(within(section).getByRole("switch", { name: "Swipe between pages" }));

    expect(
      await screen.findByText("The setting couldn't be saved. Try again later."),
    ).toBeInTheDocument();
    expect(onSet).not.toHaveBeenCalled();
  });
});
