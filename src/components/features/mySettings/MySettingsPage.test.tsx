import { uid } from "@/test/ids";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SetMyNameContext } from "@/components/features/shell/myName";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { reportServerAnswer, type StaffContext } from "@/lib/api";
import { formatAdDate } from "@/lib/dates";
import { jsonResponse } from "@/lib/api/core/test-helpers";
import { PHONE_QUERY } from "@/components/ui/usePhoneWidth";
import { copyrightLine, yearInNepal } from "@/lib/brand/copyright";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { fakeMatchMedia } from "@/test/matchMedia";

import { MySettingsPage } from "./MySettingsPage";
import { consultancySummary } from "@/test/consultancy";
import { testHost } from "@/test/hosts";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Sita Sharma", email: "sita@acme.test", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const ME = {
  name: "Sita Sharma",
  mobile: "9812345670",
  email: "sita@acme.test",
  job_title: "Senior Counsellor",
  role: "counsellor",
  joined_on: "2026-11-01",
  colour_mode: "light",
  page_swipe: false,
  notifications: { task_given: true, task_due_tomorrow: true, morning_summary: false },
};

const DEVICES = [
  {
    name: "Chrome on Windows",
    signed_in_at: "2026-11-01T03:15:00Z",
    last_used_at: "2026-11-03T04:15:00Z",
    logged_out_at: null,
    is_current: true,
  },
  {
    name: "Safari on iOS",
    signed_in_at: "2026-10-30T03:15:00Z",
    last_used_at: "2026-11-02T04:15:00Z",
    logged_out_at: null,
    is_current: false,
  },
];
const LOGGED_OUT_PHONE = { ...DEVICES[1], logged_out_at: "2026-11-12T06:00:00Z" };

const ME_PATH = "/api/me/";
const PASSWORD_PATH = "/api/me/password/";
const DEVICES_PATH = "/api/me/devices/";
const SIGN_OUT_PATH = "/api/me/devices/sign-out-others/";
const NEW_PASSWORD = "Kathmandu!2027";

function renderPage(setMyName = vi.fn<(name: string) => void>()) {
  render(
    <StaffContextContext value={COUNSELLOR}>
      <SetMyNameContext value={setMyName}>
        <ToastProvider>
          <MySettingsPage />
        </ToastProvider>
      </SetMyNameContext>
    </StaffContextContext>,
  );
  return { setMyName };
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const call = callsTo(fetchFn, verb, path)[0];
  const body = call?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "");
}

async function openSection(name: string) {
  const menu = screen.getByRole("navigation", { name: "Settings" });
  await userEvent.click(within(menu).getByRole("button", { name }));
  return screen.getByRole("region", { name });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("MySettingsPage", () => {
  it("shows the menu with My Details open first", async () => {
    backend(on("GET", ME_PATH, ME));
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    const menu = screen.getByRole("navigation", { name: "Settings" });
    const items = within(menu).getAllByRole("button");
    expect(items.map((item) => item.textContent)).toEqual([
      "My Details",
      "Email",
      "Password",
      "Two-step login",
      "Notifications",
      "Preferences",
      "Signed-in devices",
    ]);
    expect(items[0]).toHaveAttribute("aria-current", "true");
    expect(items[1]).toHaveAttribute("aria-current", "false");

    const details = await screen.findByRole("region", { name: "My Details" });
    expect(within(details).getByText("How you appear to the rest of the office.")).toBeVisible();
    expect(await within(details).findByText("Senior Counsellor")).toBeInTheDocument();
  });

  it("starts at the list of sections at phone width, with a way back from each", async () => {
    vi.stubGlobal(
      "matchMedia",
      fakeMatchMedia(
        () => false,
        (query) => query === PHONE_QUERY,
      ).matchMedia,
    );
    backend(on("GET", ME_PATH, ME));
    renderPage();

    expect(screen.queryByRole("region", { name: "My Details" })).not.toBeInTheDocument();
    expect(await openSection("Password")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "All of Settings" }));
    expect(screen.getByRole("navigation", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Password" })).not.toBeInTheDocument();
  });

  it("ends with the copyright line for this year (owner)", () => {
    backend(on("GET", ME_PATH, ME));
    renderPage();

    expect(screen.getByText(copyrightLine(yearInNepal(new Date())))).toBeInTheDocument();
  });

  it("links to My progress (issue 84)", () => {
    backend(on("GET", ME_PATH, ME));
    renderPage();

    expect(screen.getByRole("link", { name: "My progress" })).toHaveAttribute(
      "href",
      "/settings/progress",
    );
  });

  it("shows My Details with Title Case labels, the Role as a chip and the joining date", async () => {
    backend(on("GET", ME_PATH, ME));
    renderPage();
    const details = await screen.findByRole("region", { name: "My Details" });
    await within(details).findByText("Senior Counsellor");

    for (const label of ["Mobile Number", "Email", "Joined On"]) {
      expect(within(details).getByText(label)).toBeInTheDocument();
    }
    expect(within(details).getByText("9812345670")).toBeInTheDocument();
    expect(within(details).getByText("sita@acme.test")).toBeInTheDocument();
    expect(within(details).getByText(formatAdDate("2026-11-01"))).toBeInTheDocument();
    expect(within(details).getByText("Counsellor")).toBeInTheDocument();
  });

  it("moves Edit details under the name on a narrow screen, never squeezing the name (issue 91)", async () => {
    backend(on("GET", ME_PATH, ME));
    renderPage();
    const details = await screen.findByRole("region", { name: "My Details" });
    const role = await within(details).findByText("Senior Counsellor");

    // The words keep room for a short line; Edit details wraps under them when space runs out.
    const words = role.closest("div");
    expect(words).toHaveClass("basis-48", "flex-1", "min-w-0");
  });

  it("edits only the name and mobile; the rest is set by an Admin", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("PATCH", ME_PATH, { ...ME, name: "Sita Kumari Sharma", mobile: "9812345671" }),
    );
    const { setMyName } = renderPage();
    const details = await screen.findByRole("region", { name: "My Details" });
    await userEvent.click(await within(details).findByRole("button", { name: "Edit details" }));

    expect(
      within(details)
        .getAllByRole("textbox")
        .map((box) => box.getAttribute("name")),
    ).toEqual(["name", "mobile"]);
    expect(
      within(details).getByText(
        "sita@acme.test. Job title and role are set by an Admin. Change your email under Email.",
      ),
    ).toBeInTheDocument();

    const name = within(details).getByRole("textbox", { name: "Full Name" });
    await userEvent.clear(name);
    await userEvent.type(name, "sita kumari sharma");
    const mobile = within(details).getByRole("textbox", { name: /^Mobile Number/ });
    await userEvent.clear(mobile);
    await userEvent.type(mobile, "981-234-5671");
    await userEvent.click(within(details).getByRole("button", { name: "Save details" }));

    expect(await screen.findByText("Details saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PATCH", ME_PATH)).toEqual({
      name: "sita kumari sharma",
      mobile: "981-234-5671",
    });
    expect(within(details).getByText("Sita Kumari Sharma")).toBeInTheDocument();
    expect(setMyName).toHaveBeenCalledWith("Sita Kumari Sharma");
  });

  it("asks for a name before saving, and shows what the server refused", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("PATCH", ME_PATH, { mobile: ["Enter a mobile number of 7 to 15 digits."] }, 400),
    );
    renderPage();
    const details = await screen.findByRole("region", { name: "My Details" });
    await userEvent.click(await within(details).findByRole("button", { name: "Edit details" }));

    await userEvent.clear(within(details).getByRole("textbox", { name: "Full Name" }));
    await userEvent.click(within(details).getByRole("button", { name: "Save details" }));
    expect(within(details).getByText("Enter your name.")).toBeInTheDocument();
    expect(callsTo(fetchFn, "PATCH", ME_PATH)).toHaveLength(0);

    await userEvent.type(within(details).getByRole("textbox", { name: "Full Name" }), "Sita");
    await userEvent.click(within(details).getByRole("button", { name: "Save details" }));
    expect(
      await within(details).findByText("Enter a mobile number of 7 to 15 digits."),
    ).toBeInTheDocument();
  });

  it("cancels an edit without saving", async () => {
    const fetchFn = backend(on("GET", ME_PATH, ME));
    renderPage();
    const details = await screen.findByRole("region", { name: "My Details" });
    await userEvent.click(await within(details).findByRole("button", { name: "Edit details" }));

    await userEvent.click(within(details).getByRole("button", { name: "Cancel" }));

    expect(within(details).getByRole("button", { name: "Edit details" })).toBeInTheDocument();
    expect(callsTo(fetchFn, "PATCH", ME_PATH)).toHaveLength(0);
  });

  it("says so when the details can't be loaded", async () => {
    backend(on("GET", ME_PATH, {}, 500));
    renderPage();

    expect(
      await screen.findByText("Your settings couldn't be loaded. Try again in a moment."),
    ).toBeInTheDocument();
  });

  describe("Password", () => {
    async function fillPassword(current: string, next: string, confirmation = next) {
      const section = await openSection("Password");
      if (current !== "") {
        await userEvent.type(within(section).getByLabelText("Current password"), current);
      }
      await userEvent.type(within(section).getByLabelText("New password"), next);
      await userEvent.type(within(section).getByLabelText("Confirm new password"), confirmation);
      await userEvent.click(within(section).getByRole("button", { name: "Change password" }));
      return section;
    }

    it("changes it and says other devices were signed out", async () => {
      const fetchFn = backend(on("GET", ME_PATH, ME), on("POST", PASSWORD_PATH, {}));
      renderPage();

      const section = await fillPassword("Old!pass1", NEW_PASSWORD);

      expect(
        await screen.findByText("Password changed. Other devices have been signed out."),
      ).toBeInTheDocument();
      expect(sentBody(fetchFn, "POST", PASSWORD_PATH)).toEqual({
        current_password: "Old!pass1",
        new_password: NEW_PASSWORD,
      });
      expect(within(section).getByLabelText("Current password")).toHaveValue("");
    });

    it("shows the rules as one line and how to get a code if forgotten", async () => {
      backend(on("GET", ME_PATH, ME));
      renderPage();

      const section = await openSection("Password");

      expect(
        within(section).getByText(/at least 8 characters, with a capital letter/i),
      ).toBeInTheDocument();
      expect(within(section).getByText(/Forgot it\? Log out and choose/)).toBeInTheDocument();
    });

    it("checks the rules, the match and the current password before sending", async () => {
      const fetchFn = backend(on("GET", ME_PATH, ME));
      renderPage();

      const section = await fillPassword("", NEW_PASSWORD);
      expect(within(section).getByText("Enter your current password.")).toBeInTheDocument();

      await userEvent.clear(within(section).getByLabelText("Current password"));
      await userEvent.type(within(section).getByLabelText("Current password"), "Old!pass1");
      await userEvent.clear(within(section).getByLabelText("New password"));
      await userEvent.type(within(section).getByLabelText("New password"), "weakpass");
      await userEvent.click(within(section).getByRole("button", { name: "Change password" }));
      expect(within(section).getByRole("alert")).toHaveTextContent(/still needs/);

      expect(callsTo(fetchFn, "POST", PASSWORD_PATH)).toHaveLength(0);
    });

    it("says when the current password is wrong", async () => {
      backend(
        on("GET", ME_PATH, ME),
        on("POST", PASSWORD_PATH, { current_password: ["That isn't your current password."] }, 400),
      );
      renderPage();

      const section = await fillPassword("nope", NEW_PASSWORD);

      expect(await within(section).findByRole("alert")).toHaveTextContent(
        "That isn't your current password.",
      );
    });

    it("lists what the server says the new password still needs", async () => {
      backend(
        on("GET", ME_PATH, ME),
        on("POST", PASSWORD_PATH, { detail: "No.", unmet_rules: ["symbol"] }, 400),
      );
      renderPage();

      const section = await fillPassword("Old!pass1", NEW_PASSWORD);

      expect(await within(section).findByRole("alert")).toHaveTextContent(/a symbol/);
    });
  });

  describe("Notifications", () => {
    it("shows each email choice and saves a change at once", async () => {
      const fetchFn = backend(
        on("GET", ME_PATH, ME),
        on("PATCH", ME_PATH, {
          ...ME,
          notifications: { ...ME.notifications, morning_summary: true },
        }),
      );
      renderPage();
      await screen.findByText("Senior Counsellor");

      const section = await openSection("Notifications");
      expect(within(section).getByText("Which emails the app sends you.")).toBeInTheDocument();
      const given = within(section).getByRole("checkbox", {
        name: "Email me when someone gives me a task",
      });
      const summary = within(section).getByRole("checkbox", {
        name: "Send me a short summary every morning",
      });
      expect(given).toBeChecked();
      expect(summary).not.toBeChecked();

      await userEvent.click(summary);

      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(summary).toBeChecked();
      expect(sentBody(fetchFn, "PATCH", ME_PATH)).toEqual({
        notifications: { morning_summary: true },
      });
    });

    it("puts a choice back when saving fails", async () => {
      backend(on("GET", ME_PATH, ME), on("PATCH", ME_PATH, {}, 500));
      renderPage();
      await screen.findByText("Senior Counsellor");
      const section = await openSection("Notifications");
      const given = within(section).getByRole("checkbox", {
        name: "Email me when someone gives me a task",
      });

      await userEvent.click(given);

      expect(
        await within(section).findByText("That didn't save. Try again in a moment."),
      ).toBeInTheDocument();
      expect(given).toBeChecked();
    });
  });

  describe("Signed-in devices", () => {
    it("names each device by browser and system, this browser first", async () => {
      backend(on("GET", ME_PATH, ME), on("GET", DEVICES_PATH, DEVICES));
      renderPage();

      const section = await openSection("Signed-in devices");

      const [first] = await within(section).findAllByRole("listitem");
      const rows = within(section).getAllByRole("listitem");
      if (first === undefined) throw new Error("no devices listed");
      expect(first).toHaveTextContent("Chrome on Windows");
      expect(first).toHaveTextContent("This browser");
      expect(within(first).getByText("You're here")).toBeInTheDocument();
      expect(rows[1]).toHaveTextContent("Safari on iOS");
      expect(rows[1]).toHaveTextContent(/Logged in .*, last used /);
      expect(within(section).queryByText("Another device")).not.toBeInTheDocument();
    });

    it("marks a logged-out device with the day it logged out", async () => {
      backend(on("GET", ME_PATH, ME), on("GET", DEVICES_PATH, [DEVICES[0], LOGGED_OUT_PHONE]));
      renderPage();

      const section = await openSection("Signed-in devices");

      const phone = (await within(section).findByText("Safari on iOS")).closest("li");
      expect(phone).toHaveTextContent("Logged out on 12 Nov 2026");
      expect(phone).not.toHaveTextContent("You're here");
      expect(within(section).getByText("You aren't logged in anywhere else.")).toBeInTheDocument();
    });

    it("shows a device name as plain text, never as markup", async () => {
      const odd = { ...DEVICES[1], name: "<b>Unknown browser</b> on Unknown system" };
      backend(on("GET", ME_PATH, ME), on("GET", DEVICES_PATH, [DEVICES[0], odd]));
      renderPage();

      const section = await openSection("Signed-in devices");

      expect(
        await within(section).findByText("<b>Unknown browser</b> on Unknown system"),
      ).toBeInTheDocument();
      expect(section.querySelector("li b b")).toBeNull();
    });

    it("signs out of other devices, which then show as logged out", async () => {
      let hasSignedOut = false;
      backend(
        on("GET", ME_PATH, ME),
        onEach("GET", DEVICES_PATH, () =>
          hasSignedOut ? [DEVICES[0], LOGGED_OUT_PHONE] : DEVICES,
        ),
        (path, init) => {
          if (path !== SIGN_OUT_PATH || init?.method !== "POST") return undefined;
          hasSignedOut = true;
          return jsonResponse({});
        },
      );
      renderPage();
      const section = await openSection("Signed-in devices");
      await within(section).findByText(/Logged in 30 Oct 2026/);

      await userEvent.click(
        within(section).getByRole("button", { name: "Sign out of other devices" }),
      );

      expect(await screen.findByText("Signed out of every other device")).toBeInTheDocument();
      expect(await within(section).findByText(/Logged out on 12 Nov 2026/)).toBeInTheDocument();
      expect(within(section).getByText("You aren't logged in anywhere else.")).toBeInTheDocument();
    });
  });

  describe("when the server fails", () => {
    it("says so when saving details fails for another reason", async () => {
      backend(on("GET", ME_PATH, ME), on("PATCH", ME_PATH, {}, 500));
      renderPage();
      const details = await screen.findByRole("region", { name: "My Details" });
      await userEvent.click(await within(details).findByRole("button", { name: "Edit details" }));

      await userEvent.click(within(details).getByRole("button", { name: "Save details" }));

      expect(await within(details).findByRole("alert")).toHaveTextContent(
        "That didn't save. Try again in a moment.",
      );
    });

    it("says the app is being updated, keeping what was typed and the focus (ticket 14)", async () => {
      backend(
        on("GET", ME_PATH, ME),
        on(
          "PATCH",
          ME_PATH,
          { detail: "The app is being updated. Please try again in a moment.", code: "updating" },
          503,
        ),
      );
      renderPage();
      const details = await screen.findByRole("region", { name: "My Details" });
      await userEvent.click(await within(details).findByRole("button", { name: "Edit details" }));
      const name = within(details).getByLabelText("Full Name");
      await userEvent.clear(name);
      await userEvent.type(name, "Sita Rai");
      const save = within(details).getByRole("button", { name: "Save details" });

      await userEvent.click(save);

      expect(
        await within(details).findByText("The app is being updated. Please try again in a moment."),
      ).toBeInTheDocument();
      expect(within(details).queryByText("That didn't save. Try again in a moment.")).toBeNull();
      expect(within(details).queryByRole("alert")).toBeNull();
      expect(within(details).getByLabelText("Full Name")).toHaveValue("Sita Rai");
      expect(save).toHaveFocus();
      reportServerAnswer(false);
    });

    it("says so when changing the password fails for another reason", async () => {
      backend(on("GET", ME_PATH, ME), on("POST", PASSWORD_PATH, {}, 500));
      renderPage();
      const section = await openSection("Password");
      await userEvent.type(within(section).getByLabelText("Current password"), "Old!pass1");
      await userEvent.type(within(section).getByLabelText("New password"), NEW_PASSWORD);
      await userEvent.type(within(section).getByLabelText("Confirm new password"), "Different!1");
      await userEvent.click(within(section).getByRole("button", { name: "Change password" }));
      expect(within(section).getByRole("alert")).toHaveTextContent(
        "The two passwords don't match.",
      );

      await userEvent.clear(within(section).getByLabelText("Confirm new password"));
      await userEvent.type(within(section).getByLabelText("Confirm new password"), NEW_PASSWORD);
      await userEvent.click(within(section).getByRole("button", { name: "Change password" }));

      expect(await within(section).findByRole("alert")).toHaveTextContent(
        "That didn't save. Try again in a moment.",
      );
    });

    it("says so when the devices can't be loaded", async () => {
      backend(on("GET", ME_PATH, ME), on("GET", DEVICES_PATH, {}, 500));
      renderPage();

      await openSection("Signed-in devices");

      expect(
        await screen.findByText("Your settings couldn't be loaded. Try again in a moment."),
      ).toBeInTheDocument();
    });

    it("says so when signing out of other devices fails", async () => {
      backend(
        on("GET", ME_PATH, ME),
        on("GET", DEVICES_PATH, DEVICES),
        on("POST", SIGN_OUT_PATH, {}, 500),
      );
      renderPage();
      const section = await openSection("Signed-in devices");
      await within(section).findByText("Safari on iOS");

      await userEvent.click(
        within(section).getByRole("button", { name: "Sign out of other devices" }),
      );

      expect(await within(section).findByRole("alert")).toHaveTextContent(
        "That didn't save. Try again in a moment.",
      );
      expect(within(section).getByText("Safari on iOS")).toBeInTheDocument();
    });
  });
});

describe("MySettingsPage: Two-step login (issue 62)", () => {
  const MINE = "/api/me/two-factor/";
  const OFF = { required: false, set_up: false, recovery_codes_left: 0, can_switch_off: false };
  const REQUIRED = { required: true, set_up: true, recovery_codes_left: 8, can_switch_off: false };
  const CHOSEN = { ...REQUIRED, can_switch_off: true };

  it("is a section of its own in the menu, explaining what it does", async () => {
    backend(on("GET", ME_PATH, ME), on("GET", MINE, OFF));
    renderPage();

    const section = await openSection("Two-step login");

    expect(within(section).getByText(/a stolen password alone/)).toBeInTheDocument();
    expect(await within(section).findByText("Off")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Switch on" })).toBeInTheDocument();
  });

  it("switches it on after a warning, then sets up the app here", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("GET", MINE, OFF),
      on("POST", MINE, { two_factor: "setup" }),
      on("POST", "/api/auth/two-factor/setup/", {
        uri: "otpauth://totp/Consultancy%20CRM:sita?secret=JBSWY3DPEHPK3PXP&issuer=x",
      }),
    );
    renderPage();
    const section = await openSection("Two-step login");

    await userEvent.click(await within(section).findByRole("button", { name: "Switch on" }));
    const confirm = screen.getByRole("dialog", { name: "Switch on two-step login?" });
    expect(within(confirm).getByText(/signed out everywhere/)).toBeInTheDocument();
    await userEvent.click(within(confirm).getByRole("button", { name: "Switch on and set up" }));

    expect(await screen.findByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", MINE)).toEqual({ action: "on" });
  });

  it("offers no Switch off when an Admin requires it, and says why", async () => {
    backend(on("GET", ME_PATH, ME), on("GET", MINE, REQUIRED));
    renderPage();

    const section = await openSection("Two-step login");

    expect(await within(section).findByText("On")).toBeInTheDocument();
    expect(within(section).getByText("8 recovery codes left")).toBeInTheDocument();
    expect(within(section).getByText(/Your Admin requires two-step login/)).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Switch off" })).toBeNull();
    expect(within(section).getByRole("button", { name: "Make new recovery codes" })).toBeVisible();
  });

  it("switches it off with the password and a number when they chose it themselves", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("GET", MINE, CHOSEN),
      on("POST", MINE, { two_factor: OFF }),
    );
    renderPage();
    const section = await openSection("Two-step login");

    await userEvent.click(await within(section).findByRole("button", { name: "Switch off" }));
    const dialog = screen.getByRole("dialog", { name: "Switch off two-step login" });
    await userEvent.type(within(dialog).getByLabelText("Password"), "Kathmandu!2026");
    await userEvent.type(within(dialog).getByLabelText("6-digit number"), "123456");
    await userEvent.click(within(dialog).getByRole("button", { name: "Switch off" }));

    expect(await within(section).findByText("Off")).toBeInTheDocument();
    expect(sentBody(fetchFn, "POST", MINE)).toEqual({
      action: "off",
      password: "Kathmandu!2026",
      code: "123456",
    });
  });

  it("says so when it can't be loaded", async () => {
    backend(on("GET", ME_PATH, ME), on("GET", MINE, { required: "yes" }));
    renderPage();

    const section = await openSection("Two-step login");

    expect(await within(section).findByRole("alert")).toBeInTheDocument();
  });
});

describe("MySettingsPage for a Platform Admin inside the office", () => {
  it("shows who they are and that there is no account here to change", () => {
    const fetchFn = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchFn);
    render(
      <StaffContextContext
        value={{
          ...COUNSELLOR,
          staff: { id: uid(0), name: "Ramesh", email: "ramesh@platform.test", role: "admin" },
          supportAccess: { platformAdminName: "Ramesh", platformHost: testHost("admin") },
        }}
      >
        <SetMyNameContext value={vi.fn()}>
          <ToastProvider>
            <MySettingsPage />
          </ToastProvider>
        </SetMyNameContext>
      </StaffContextContext>,
    );

    expect(screen.getByRole("heading", { name: "Ramesh" })).toBeVisible();
    expect(screen.getByText("Platform Admin")).toBeVisible();
    expect(screen.getByText(/there is no account in this office to change/)).toBeVisible();
    expect(screen.queryByRole("navigation", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My progress" })).not.toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
