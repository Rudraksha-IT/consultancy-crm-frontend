import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SetPageSwipeContext } from "@/components/features/shell/pageSwipe";
import { SetDateDisplayContext } from "@/components/features/shell/dateDisplay";
import { SetOfficeDetailsContext } from "@/components/features/shell/officeDetails";
import { SetOfficeLogoContext } from "@/components/features/shell/officeLogo";
import { ShellThemeContext } from "@/components/features/shell/shellTheme";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME, type ThemeConfig } from "@/lib/theme";
import { backend, on } from "@/test/backend";

import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { fakeMatchMedia } from "@/test/matchMedia";

import { ConfigurationPage } from "./ConfigurationPage";
import { consultancySummary } from "@/test/consultancy";
import { testHost } from "@/test/hosts";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

function renderPage(context: StaffContext, setTheme = vi.fn<(theme: ThemeConfig) => void>()) {
  render(
    <StaffContextContext value={context}>
      <SetDateDisplayContext value={vi.fn()}>
        <ShellThemeContext value={{ theme: context.theme, setTheme }}>
          <SetOfficeLogoContext value={vi.fn()}>
            <SetOfficeDetailsContext value={vi.fn()}>
              <SetPageSwipeContext value={vi.fn()}>
                <ToastProvider>
                  <ConfigurationPage />
                </ToastProvider>
              </SetPageSwipeContext>
            </SetOfficeDetailsContext>
          </SetOfficeLogoContext>
        </ShellThemeContext>
      </SetDateDisplayContext>
    </StaffContextContext>,
  );
  return setTheme;
}

const TYPES_PATH = "/api/configuration/document-types/";
const UNUSED = { countries: 0, courses: 0, students: 0, documents: 0 };
const NO_TYPES = { results: [] };

afterEach(() => {
  vi.unstubAllGlobals();
});

function menuItems(): (string | null)[] {
  const menu = screen.getByRole("navigation", { name: "Configuration" });
  return within(menu)
    .getAllByRole("button")
    .map((item) => item.textContent);
}

async function open(section: string): Promise<HTMLElement> {
  const menu = screen.getByRole("navigation", { name: "Configuration" });
  await userEvent.setup().click(within(menu).getByRole("button", { name: section }));
  return screen.getByRole("region", { name: section });
}

function partTitles(section: HTMLElement): (string | null)[] {
  return within(section)
    .getAllByRole("heading", { level: 3 })
    .map((title) => title.textContent);
}

const ALL_MODULES: StaffContext["modules"] = ["configuration", "communication", "clock_in"];

describe("ConfigurationPage", () => {
  it("has a menu of General, Documents, Fees and Exports, and opens on General", () => {
    backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage(ADMIN);

    expect(menuItems()).toEqual(["General", "Documents", "Fees", "Exports"]);
    const general = screen.getByRole("region", { name: "General" });
    expect(partTitles(general)).toEqual(["Office logo", "Office details", "Dates"]);
    expect(screen.queryByRole("region", { name: "Documents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save colours" })).not.toBeInTheDocument();
    const dates = screen.getByRole("region", { name: "Dates" });
    expect(within(dates).getByRole("group", { name: "Date display" })).toBeInTheDocument();
  });

  it("puts Working hours in its place while its Module is on, and has no email settings", () => {
    backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage({ ...ADMIN, modules: ALL_MODULES });

    expect(menuItems()).toEqual(["General", "Documents", "Fees", "Working hours", "Exports"]);
  });

  it("shows the Documents section with its lists", async () => {
    backend(
      on("GET", TYPES_PATH, {
        results: [
          {
            id: 1,
            name: "Passport",
            needed_by_everyone: true,
            usual_group: "applying",
            used_by: UNUSED,
          },
        ],
      }),
    );
    renderPage(ADMIN);

    const documents = await open("Documents");
    expect(await within(documents).findByText("Passport")).toBeVisible();
    expect(
      within(within(documents).getByRole("group", { name: "Documents" })).getByRole("button", {
        name: "Always needed",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("region", { name: "General" })).not.toBeInTheDocument();
  });

  it("puts the Fee Types under Fees", async () => {
    backend(
      on("GET", "/api/fee-types/", {
        results: [{ id: 7, name: "Other", hidden: false, other: true, uses: null }],
      }),
    );
    renderPage(ADMIN);

    const fees = await open("Fees");
    expect(await within(fees).findByRole("list", { name: "Fee Types" })).toBeVisible();
  });

  it("puts the Working day, Holidays and the Office network under Working hours", async () => {
    backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage({ ...ADMIN, modules: ["configuration", "clock_in"] });

    const hours = await open("Working hours");
    expect(partTitles(hours)).toEqual(["Working day", "Holidays", "Office network"]);
  });

  it("has no Working hours section while Clock-in is off", () => {
    const fetchFn = backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage(ADMIN);

    expect(menuItems()).not.toContain("Working hours");
    expect(screen.queryByRole("region", { name: "Office network" })).not.toBeInTheDocument();
    expect(fetchFn.mock.calls.some(([path]) => path.startsWith("/api/office-networks/"))).toBe(
      false,
    );
    expect(fetchFn.mock.calls.some(([path]) => path.startsWith("/api/clock/"))).toBe(false);
  });

  it("starts at the list of sections at phone width", async () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY,
      ).matchMedia,
    );
    backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage(ADMIN);

    expect(menuItems()).toEqual(["General", "Documents", "Fees", "Exports"]);
    expect(screen.queryByRole("region", { name: "General" })).not.toBeInTheDocument();

    await open("Exports");
    expect(screen.getByRole("button", { name: "All of Configuration" })).toBeVisible();
  });

  it.each(["counsellor", "front_desk", "teacher"] as const)("is not available to a %s", (role) => {
    const fetchFn = backend();
    renderPage({ ...ADMIN, staff: { ...ADMIN.staff, role } });

    expect(screen.getByText("This page isn't available to you.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Configuration" })).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("ConfigurationPage Platform controls", () => {
  it("adds them last for a Platform Admin inside the office", async () => {
    backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage({
      ...ADMIN,
      modules: ALL_MODULES,
      supportAccess: { platformAdminName: "Ramesh", platformHost: testHost("admin") },
    });

    expect(menuItems().at(-1)).toBe("Platform controls");
    expect(await open("Platform controls")).toBeVisible();
  });

  it("never shows them to the office's own Admin", () => {
    backend(on("GET", TYPES_PATH, NO_TYPES));
    renderPage(ADMIN);

    expect(menuItems()).not.toContain("Platform controls");
  });
});
