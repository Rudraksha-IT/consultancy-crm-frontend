import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { FeatureSwitches } from "@/components/features/platform/useSaveFeatures";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { consultancySummary } from "@/test/consultancy";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { PlatformControls } from "./PlatformControls";
import { testHost } from "@/test/hosts";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const VISITOR: StaffContext = {
  staff: { id: uid(0), name: "Ramesh", email: "ramesh@platform.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["students", "batches", "accounts"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: { platformAdminName: "Ramesh", platformHost: testHost("admin") },
};

type Fakes = {
  saveSwitches?: (switches: FeatureSwitches) => Promise<unknown>;
  download?: () => Promise<Blob>;
};

function renderControls({ saveSwitches, download }: Fakes = {}) {
  const saveFile = vi.fn<(file: Blob, name: string) => void>();
  render(
    <StaffContextContext value={VISITOR}>
      <ToastProvider>
        <PlatformControls
          saveSwitches={saveSwitches ?? vi.fn().mockResolvedValue(undefined)}
          download={download ?? (() => Promise.resolve(new Blob(["zip"])))}
          saveFile={saveFile}
        />
      </ToastProvider>
    </StaffContextContext>,
  );
  return { saveFile };
}

beforeEach(() => {
  navigate.mockReset();
});

describe.each(THEME_CASES)("PlatformControls in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the office's features and what only a Platform Admin can do", () => {
    renderControls();

    const section = screen.getByRole("region", { name: "Platform controls" });
    expect(
      within(section).getByText(
        "Only Platform Admins see this. The office's own Admins can't change these.",
      ),
    ).toBeVisible();
    const chips = within(section).getByRole("list", { name: "Features on" });
    expect(
      within(chips)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Test-prep classes", "Accounts"]);
    expect(within(section).getByRole("button", { name: "Change features" })).toBeVisible();
    expect(
      within(section).getByRole("button", { name: "Download all of this office's data" }),
    ).toBeVisible();
    expect(within(section).getByText(/open Employees and choose Manage/)).toBeVisible();
  });
});

describe("PlatformControls", () => {
  it("changes the office's features, then loads the app again with them", async () => {
    const saveSwitches = vi.fn<(switches: FeatureSwitches) => Promise<unknown>>();
    saveSwitches.mockResolvedValue(["students"]);
    renderControls({ saveSwitches });

    await userEvent.click(screen.getByRole("button", { name: "Change features" }));
    const dialog = within(screen.getByRole("dialog", { name: "Features for Acme Education" }));
    await userEvent.click(dialog.getByRole("switch", { name: /Reports/ }));
    await userEvent.click(dialog.getByRole("button", { name: "Save features" }));

    expect(saveSwitches).toHaveBeenCalledWith({
      batches: true,
      communication: false,
      accounts: true,
      reports: true,
      clock_in: false,
    });
    expect(navigate).toHaveBeenCalledWith("/configuration");
  });

  it("keeps the dialog open with a problem when saving fails", async () => {
    const saveSwitches = vi.fn().mockRejectedValue(new Error("offline"));
    renderControls({ saveSwitches });

    await userEvent.click(screen.getByRole("button", { name: "Change features" }));
    await userEvent.click(screen.getByRole("button", { name: "Save features" }));

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("downloads the office's data as a file named after the office", async () => {
    const { saveFile } = renderControls();

    await userEvent.click(
      screen.getByRole("button", { name: "Download all of this office's data" }),
    );

    expect(await screen.findByText("Office data downloaded")).toBeInTheDocument();
    expect(saveFile).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^Acme Education data \d{4}-\d{2}-\d{2}\.zip$/),
    );
  });

  it("says when the download fails", async () => {
    const { saveFile } = renderControls({ download: () => Promise.reject(new Error("403")) });

    await userEvent.click(
      screen.getByRole("button", { name: "Download all of this office's data" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The office's data couldn't be downloaded. Try again.",
    );
    expect(saveFile).not.toHaveBeenCalled();
  });
});
