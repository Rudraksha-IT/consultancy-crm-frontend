import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SetDateDisplayContext } from "@/components/features/shell/dateDisplay";
import { SetPageSwipeContext } from "@/components/features/shell/pageSwipe";
import { SetOfficeDetailsContext } from "@/components/features/shell/officeDetails";
import { SetOfficeLogoContext } from "@/components/features/shell/officeLogo";
import { ShellThemeContext } from "@/components/features/shell/shellTheme";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";
import { backend, callsTo, on } from "@/test/backend";

import { ConfigurationPage } from "./ConfigurationPage";
import { consultancySummary } from "@/test/consultancy";

const SETTINGS_PATH = "/api/communication/settings/";
const TEST_SMS_PATH = "/api/communication/settings/test-sms/";
const TYPES_PATH = "/api/configuration/document-types/";

const ADMIN: StaffContext = {
  staff: { id: 1, name: "Sita Sharma", email: "sita@acme.test", role: "admin" },
  consultancy: consultancySummary(),
  modules: ["configuration", "communication"],
  dateDisplay: "AD",
  colourMode: "device",
  supportAccess: null,
  theme: DEFAULT_THEME,
};

const EMPTY = {
  sms_provider: "",
  sms_sender: "",
  sms_token_saved: false,
  email_host: "",
  email_port: 587,
  email_username: "",
  email_password_saved: false,
  email_from: "",
  sms_ready: false,
  email_ready: false,
};

const SAVED = {
  ...EMPTY,
  sms_provider: "sparrow",
  sms_sender: "ACME",
  sms_token_saved: true,
  sms_ready: true,
};

function renderPage(context: StaffContext = ADMIN) {
  render(
    <StaffContextContext value={context}>
      <SetDateDisplayContext value={vi.fn()}>
        <ShellThemeContext value={{ theme: context.theme, setTheme: vi.fn() }}>
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
}

/** Opens Email and SMS from Configuration's section menu. */
async function findSection() {
  const menu = screen.getByRole("navigation", { name: "Configuration" });
  const item = within(menu).getByRole("button", { name: "Email and SMS" });
  if (item.getAttribute("aria-current") !== "true") await userEvent.setup().click(item);
  return screen.findByRole("region", { name: "Email and SMS" });
}

function sentBody(fetchFn: ReturnType<typeof backend>, verb: string, path: string): unknown {
  const body = callsTo(fetchFn, verb, path)[0]?.[1]?.body;
  return typeof body === "string" ? JSON.parse(body) : null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Email and SMS settings", () => {
  it("isn't shown while the Communication Module is off", () => {
    const fetchFn = backend(on("GET", TYPES_PATH, { results: [] }));
    renderPage({ ...ADMIN, modules: ["configuration"] });

    expect(screen.queryByRole("region", { name: "Email and SMS" })).not.toBeInTheDocument();
    expect(callsTo(fetchFn, "GET", SETTINGS_PATH)).toHaveLength(0);
  });

  it("shows the empty form with both channels not set up", async () => {
    backend(on("GET", TYPES_PATH, { results: [] }), on("GET", SETTINGS_PATH, EMPTY));
    renderPage();

    const section = await findSection();
    expect(
      within(section).getByText("Email and SMS go out from the office's own accounts."),
    ).toBeInTheDocument();
    expect(section).not.toHaveTextContent(/Messages/);
    expect(await within(section).findByLabelText("SMS company")).toHaveValue("");
    expect(within(section).getByText("SMS is not set up")).toBeInTheDocument();
    expect(within(section).getByText("Email is not set up")).toBeInTheDocument();
    expect(within(section).getByLabelText("API token (optional)")).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      within(section).queryByRole("button", { name: "Send me a test SMS" }),
    ).not.toBeInTheDocument();
  });

  it("puts the email fields and chip above the SMS ones", async () => {
    backend(on("GET", TYPES_PATH, { results: [] }), on("GET", SETTINGS_PATH, EMPTY));
    renderPage();

    const section = await findSection();
    const smsCompany = await within(section).findByLabelText("SMS company");
    for (const label of [
      "Email server (optional)",
      "Email username (optional)",
      "Send from (optional)",
    ]) {
      const field = within(section).getByLabelText(label);
      expect(
        field.compareDocumentPosition(smsCompany) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    const emailChip = within(section).getByText("Email is not set up");
    const smsChip = within(section).getByText("SMS is not set up");
    expect(
      emailChip.compareDocumentPosition(smsChip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("never shows a saved secret, and says it's kept", async () => {
    backend(on("GET", TYPES_PATH, { results: [] }), on("GET", SETTINGS_PATH, SAVED));
    renderPage();

    const section = await findSection();
    const token = await within(section).findByLabelText("API token (optional)");
    expect(token).toHaveValue("");
    expect(section).toHaveTextContent(
      "Saved and kept secret. Leave it empty to keep it, or paste a new one.",
    );
    expect(within(section).getByText("SMS is set up")).toBeInTheDocument();
  });

  it("saves what was typed, leaving out an empty secret, and confirms", async () => {
    const fetchFn = backend(
      on("GET", TYPES_PATH, { results: [] }),
      on("GET", SETTINGS_PATH, SAVED),
      on("PUT", SETTINGS_PATH, { ...SAVED, sms_sender: "ACMENEW" }),
    );
    renderPage();
    const section = await findSection();
    const sender = await within(section).findByLabelText("Sender name (optional)");

    await userEvent.clear(sender);
    await userEvent.type(sender, "ACMENEW");
    await userEvent.click(within(section).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Email and SMS settings saved")).toBeInTheDocument();
    expect(sentBody(fetchFn, "PUT", SETTINGS_PATH)).toEqual({
      sms_provider: "sparrow",
      sms_sender: "ACMENEW",
      email_host: "",
      email_port: 587,
      email_username: "",
      email_from: "",
    });
  });

  it("shows a refused field under it", async () => {
    backend(
      on("GET", TYPES_PATH, { results: [] }),
      on("GET", SETTINGS_PATH, EMPTY),
      on("PUT", SETTINGS_PATH, { sms_token: ["Enter the API token from your SMS company."] }, 400),
    );
    renderPage();
    const section = await findSection();

    await userEvent.selectOptions(
      await within(section).findByLabelText("SMS company"),
      "Aakash SMS",
    );
    await userEvent.click(within(section).getByRole("button", { name: "Save" }));

    expect(
      await within(section).findByText("Enter the API token from your SMS company."),
    ).toBeInTheDocument();
    const token = within(section).getByLabelText("API token (optional)");
    expect(token).toHaveAttribute("aria-invalid", "true");
  });

  it("sends a test SMS and says where it went", async () => {
    backend(
      on("GET", TYPES_PATH, { results: [] }),
      on("GET", SETTINGS_PATH, SAVED),
      on("POST", TEST_SMS_PATH, { status: "sent", error: "", sent_to: "9851000009" }),
    );
    renderPage();
    const section = await findSection();

    await userEvent.click(
      await within(section).findByRole("button", { name: "Send me a test SMS" }),
    );

    expect(await screen.findByText("Test SMS sent to 9851000009")).toBeInTheDocument();
  });

  it.each([
    [
      "a failed test with the company's reason",
      { status: "failed", error: "Couldn't reach the SMS company.", sent_to: "9851000009" },
      200,
      "Test SMS failed: Couldn't reach the SMS company.",
    ],
    [
      "the API's refusal",
      { detail: "Add your Nepali mobile number in your Settings first." },
      400,
      "Add your Nepali mobile number in your Settings first.",
    ],
    ["a server failure", {}, 500, "The test SMS couldn't be sent. Try again."],
  ])("tells %s", async (_, answer, status, said) => {
    backend(
      on("GET", TYPES_PATH, { results: [] }),
      on("GET", SETTINGS_PATH, SAVED),
      on("POST", TEST_SMS_PATH, answer, status),
    );
    renderPage();
    const section = await findSection();

    await userEvent.click(
      await within(section).findByRole("button", { name: "Send me a test SMS" }),
    );

    expect(await screen.findByText(said)).toBeInTheDocument();
  });

  it("says when the settings can't be loaded", async () => {
    backend(on("GET", TYPES_PATH, { results: [] }), on("GET", SETTINGS_PATH, {}, 500));
    renderPage();

    const section = await findSection();
    expect(
      await within(section).findByText("The Email and SMS settings couldn't be loaded. Try again."),
    ).toBeInTheDocument();
  });
});
