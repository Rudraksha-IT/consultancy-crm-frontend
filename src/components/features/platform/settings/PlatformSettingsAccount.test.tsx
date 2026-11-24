import { uid } from "@/test/ids";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import type { PlatformAdmin } from "@/lib/api";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { backend, callsTo, on } from "@/test/backend";
import { fakeMatchMedia } from "@/test/matchMedia";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { PlatformAdminContext } from "../platformAdminContext";
import { PlatformSettingsPage } from "./PlatformSettingsPage";

const ADMIN: PlatformAdmin = { id: uid(1), name: "Platform Ops", email: "ops@platform.test" };
const ME_PATH = "/api/platform/me/";
const PASSWORD_PATH = "/api/platform/me/password/";
const CURRENT = "Now-Pass-2026!";
const NEW_PASSWORD = "Kathmandu!2027";

function renderPage(admin: PlatformAdmin = ADMIN) {
  const setAdmin = vi.fn<(admin: PlatformAdmin) => void>();
  render(
    <PlatformAdminContext value={{ admin, setAdmin }}>
      <ToastProvider>
        <PlatformSettingsPage />
      </ToastProvider>
    </PlatformAdminContext>,
  );
  return { setAdmin };
}

/** Opens a section from Settings' section menu, one section shown at a time (list tidy-ups 04). */
function openSection(name: string): HTMLElement {
  const menu = screen.getByRole("navigation", { name: "Settings" });
  const item = within(menu).getByRole("button", { name });
  if (item.getAttribute("aria-current") !== "true") fireEvent.click(item);
  return screen.getByRole("region", { name });
}

function detailsSection(): HTMLElement {
  return openSection("My details");
}

function passwordSection(): HTMLElement {
  return openSection("Password");
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const body = callsTo(fetchFn, verb, path)[0]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "");
}

async function saveName(name: string): Promise<void> {
  const user = userEvent.setup();
  const section = within(detailsSection());
  await user.clear(section.getByLabelText("Name"));
  if (name !== "") await user.type(section.getByLabelText("Name"), name);
  await user.click(section.getByRole("button", { name: "Save details" }));
}

async function fillPassword(current: string, next: string, again = next): Promise<void> {
  const user = userEvent.setup();
  const section = within(passwordSection());
  if (current !== "") await user.type(section.getByLabelText("Current password"), current);
  await user.type(section.getByLabelText("New password"), next);
  await user.type(section.getByLabelText("Confirm new password"), again);
  await user.click(section.getByRole("button", { name: "Change password" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Platform Settings: my account", () => {
  it("keeps My details, Password and Security in Settings, after the product's parts", () => {
    backend();
    renderPage();

    const menu = screen.getByRole("navigation", { name: "Settings" });
    expect(
      within(menu)
        .getAllByRole("button")
        .map((item) => item.textContent)
        .slice(-3),
    ).toEqual(["My details", "Password", "Security"]);
    expect(screen.queryByRole("region", { name: "My details" })).not.toBeInTheDocument();
    expect(detailsSection()).toBeVisible();
  });

  it("starts at the list of sections at phone width", () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY,
      ).matchMedia,
    );
    backend();
    renderPage();

    expect(screen.queryByRole("region", { name: "My details" })).not.toBeInTheDocument();
    expect(passwordSection()).toBeVisible();
    expect(screen.getByRole("button", { name: "All of Settings" })).toBeVisible();
  });

  it("shows my name ready to change and my email as text that can't be changed", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    const section = within(detailsSection());
    expect(section.getByLabelText("Name")).toHaveValue("Platform Ops");
    expect(section.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
    expect(section.getByText("ops@platform.test")).toBeInTheDocument();
    expect(section.getByText("Your email can't be changed here.")).toBeInTheDocument();
    expect(section.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("saves a new name without a password and shows it everywhere", async () => {
    const saved = { ...ADMIN, name: "Ramesh" };
    const fetchFn = backend(on("PATCH", ME_PATH, { platform_admin: saved }));
    const { setAdmin } = renderPage();

    await saveName("Ramesh");

    expect(sentBody(fetchFn, "PATCH", ME_PATH)).toEqual({ name: "Ramesh" });
    expect(await screen.findByText("Details saved")).toBeInTheDocument();
    expect(setAdmin).toHaveBeenCalledWith(saved);
  });

  it("asks for a name before calling the server", async () => {
    const fetchFn = backend();
    renderPage();

    await saveName("");

    expect(within(detailsSection()).getByText("Enter your name.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PATCH", ME_PATH)).toHaveLength(0);
  });

  it("doesn't call the server when the name is unchanged", async () => {
    const fetchFn = backend();
    renderPage();

    await saveName("Platform Ops");

    expect(
      within(detailsSection()).getByText("Nothing to save: your name is as it was."),
    ).toBeInTheDocument();
    expect(callsTo(fetchFn, "PATCH", ME_PATH)).toHaveLength(0);
  });

  it("shows the server's reason under the name", async () => {
    backend(on("PATCH", ME_PATH, { name: ["Enter a name of 1 to 200 letters."] }, 400));
    renderPage();

    await saveName("Ramesh");

    expect(
      await within(detailsSection()).findByText("Enter a name of 1 to 200 letters."),
    ).toBeInTheDocument();
    expect(within(detailsSection()).getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });

  it("says when the name couldn't be saved", async () => {
    backend(on("PATCH", ME_PATH, { detail: "Server error" }, 500));
    renderPage();

    await saveName("Ramesh");

    expect(
      await within(detailsSection()).findByText("We couldn't save that. Please try again."),
    ).toBeInTheDocument();
  });

  it("changes the password and says other sessions were signed out", async () => {
    const fetchFn = backend(on("POST", PASSWORD_PATH, {}));
    renderPage();

    await fillPassword(CURRENT, NEW_PASSWORD);

    expect(sentBody(fetchFn, "POST", PASSWORD_PATH)).toEqual({
      current_password: CURRENT,
      new_password: NEW_PASSWORD,
    });
    expect(
      await screen.findByText("Password changed. Your other sessions have been signed out."),
    ).toBeInTheDocument();
  });

  it.each([
    [CURRENT, "weakpass", "weakpass", /The password still needs/],
    [CURRENT, NEW_PASSWORD, "Kathmandu!2028", /The two passwords don't match/],
    ["", NEW_PASSWORD, NEW_PASSWORD, /Enter your current password/],
  ])(
    "checks the password form before calling the server (%s, %s, %s)",
    async (current, next, again, message) => {
      const fetchFn = backend();
      renderPage();

      await fillPassword(current, next, again);

      expect(within(passwordSection()).getByRole("alert")).toHaveTextContent(message);
      expect(callsTo(fetchFn, "POST", PASSWORD_PATH)).toHaveLength(0);
    },
  );

  it.each([
    [{ current_password: ["No."] }, 400, "That isn't your current password."],
    [
      { new_password: ["Choose a password different from your current one."] },
      400,
      "Choose a password different from your current one.",
    ],
    [{ detail: "Too many." }, 429, "Too many wrong passwords. Wait 15 minutes, then try again."],
    [{ detail: "Server error" }, 500, "We couldn't save that. Please try again."],
  ])("explains a refused password change (%j, %i)", async (body, status, message) => {
    backend(on("POST", PASSWORD_PATH, body, status));
    renderPage();

    await fillPassword(CURRENT, NEW_PASSWORD);

    expect(await within(passwordSection()).findByText(message)).toBeInTheDocument();
  });

  it("explains rules the server says are unmet", async () => {
    backend(on("POST", PASSWORD_PATH, { detail: "Rules", unmet_rules: ["symbol"] }, 400));
    renderPage();

    await fillPassword(CURRENT, NEW_PASSWORD);

    expect(await within(passwordSection()).findByText(/a symbol/)).toBeInTheDocument();
  });
});

const TWO_FACTOR_PATH = "/api/platform/me/two-factor/";
const OFF = { required: false, set_up: false, recovery_codes_left: 0 };
const ON = { required: true, set_up: true, recovery_codes_left: 10 };
const NEW_CODES = Array.from({ length: 10 }, (_, n) => `abcd-efgh-jk${"mnpqrstuvw"[n] ?? "x"}m`);

function securitySection(): HTMLElement {
  return openSection("Security");
}

describe("Platform Settings: my account: two-step login (issue 61)", () => {
  it("shows that two-step login is off, as a word", async () => {
    backend(on("GET", TWO_FACTOR_PATH, OFF));
    renderPage();

    expect(await within(securitySection()).findByText("Off")).toBeInTheDocument();
    expect(within(securitySection()).getByRole("button", { name: "Switch on" })).toBeVisible();
    expect(within(detailsSection()).queryByLabelText(/authenticator app/)).not.toBeInTheDocument();
  });

  it("switches on after a warning, then sets up straight away", async () => {
    const fetchFn = backend(
      on("GET", TWO_FACTOR_PATH, OFF),
      on("POST", TWO_FACTOR_PATH, { two_factor: "setup" }),
      on("POST", "/api/platform/auth/two-factor/setup/", {
        uri: "otpauth://totp/Consultancy%20CRM:ops%40platform.test?secret=JBSWY3DPEHPK3PXP",
      }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await within(securitySection()).findByRole("button", { name: "Switch on" }));
    const warning = screen.getByRole("dialog", { name: "Switch on two-step login?" });
    await user.click(within(warning).getByRole("button", { name: "Switch on and set up" }));

    const setup = await screen.findByRole("dialog", { name: "Set up two-step login" });
    expect(await within(setup).findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", TWO_FACTOR_PATH)).toEqual({ action: "on" });
  });

  it("never asks for the number to change the name", async () => {
    backend(on("GET", TWO_FACTOR_PATH, ON));
    renderPage();

    expect(await within(securitySection()).findByText("On")).toBeInTheDocument();
    expect(
      within(detailsSection()).queryByLabelText("Number from your authenticator app"),
    ).not.toBeInTheDocument();
  });

  it("switches off with the password and a number", async () => {
    const fetchFn = backend(
      on("GET", TWO_FACTOR_PATH, ON),
      on("POST", TWO_FACTOR_PATH, { two_factor: OFF }),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(await within(securitySection()).findByRole("button", { name: "Switch off" }));
    const dialog = screen.getByRole("dialog", { name: "Switch off two-step login" });
    await user.type(within(dialog).getByLabelText("Password"), CURRENT);
    await user.type(within(dialog).getByLabelText("6-digit number"), "123456");
    await user.click(within(dialog).getByRole("button", { name: "Switch off" }));

    expect(await within(securitySection()).findByText("Off")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", TWO_FACTOR_PATH)).toEqual({
      action: "off",
      password: CURRENT,
      code: "123456",
    });
  });

  it("won't switch off without the password and a number", async () => {
    const fetchFn = backend(on("GET", TWO_FACTOR_PATH, ON));
    renderPage();
    const user = userEvent.setup();

    await user.click(await within(securitySection()).findByRole("button", { name: "Switch off" }));
    const dialog = screen.getByRole("dialog", { name: "Switch off two-step login" });
    await user.click(within(dialog).getByRole("button", { name: "Switch off" }));

    expect(await within(dialog).findByText("Enter your password.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter the 6-digit number from your app.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", TWO_FACTOR_PATH)).toHaveLength(0);
  });

  it("makes new recovery codes with a number and shows them once", async () => {
    backend(
      on("GET", TWO_FACTOR_PATH, { ...ON, recovery_codes_left: 2 }),
      on("POST", TWO_FACTOR_PATH, { recovery_codes: NEW_CODES }),
    );
    renderPage();
    const user = userEvent.setup();

    expect(await within(securitySection()).findByText("2 recovery codes left")).toBeVisible();
    await user.click(
      within(securitySection()).getByRole("button", { name: "Make new recovery codes" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Make new recovery codes" });
    await user.type(within(dialog).getByLabelText("6-digit number"), "123456");
    await user.click(within(dialog).getByRole("button", { name: "Make new codes" }));

    const codes = await screen.findByRole("list", { name: "Your recovery codes" });
    expect(codes).toHaveTextContent(NEW_CODES[0] ?? "");
    expect(within(securitySection()).getByText("10 recovery codes left")).toBeVisible();
  });

  it("closes the switch-off dialog with Escape", async () => {
    backend(on("GET", TWO_FACTOR_PATH, ON));
    renderPage();
    const user = userEvent.setup();

    await user.click(await within(securitySection()).findByRole("button", { name: "Switch off" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe.each(THEME_CASES)(
  "Platform Settings: my account in the $name Theme",
  ({ config, mode }) => {
    beforeEach(() => {
      applyThemeCase(config, mode);
    });
    afterEach(resetTheme);

    it("renders both sections with labelled fields", async () => {
      backend(on("GET", TWO_FACTOR_PATH, ON));
      renderPage();

      expect(await within(securitySection()).findByText("On")).toBeInTheDocument();
      expect(detailsSection()).toBeInTheDocument();
      expect(passwordSection()).toBeInTheDocument();
      expect(within(passwordSection()).getByLabelText("Current password")).toBeInTheDocument();
    });
  },
);
