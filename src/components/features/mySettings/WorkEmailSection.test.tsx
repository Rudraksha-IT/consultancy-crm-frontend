import { uid } from "@/test/ids";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SetMyNameContext } from "@/components/features/shell/myName";
import { StaffContextContext } from "@/components/features/shell/staffContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import type { StaffContext } from "@/lib/api";
import { backend, callsTo, on } from "@/test/backend";
import { consultancySummary } from "@/test/consultancy";

import { MySettingsPage } from "./MySettingsPage";

const COUNSELLOR: StaffContext = {
  staff: { id: uid(3), name: "Sita Sharma", email: "sita@office.com", role: "counsellor" },
  consultancy: consultancySummary(),
  modules: ["students"],
  dateDisplay: "AD",
  colourMode: "light",
  supportAccess: null,
};

const ME = {
  name: "Sita Sharma",
  mobile: "9812345670",
  email: "sita@office.com",
  job_title: "Senior Counsellor",
  role: "counsellor",
  joined_on: "2026-11-01",
  colour_mode: "light",
  page_swipe: false,
  notifications: { task_given: true, task_due_tomorrow: true, morning_summary: false },
};

const TWO_FACTOR_OFF = {
  required: false,
  set_up: false,
  recovery_codes_left: 0,
  can_switch_off: false,
};
const TWO_FACTOR_ON = {
  required: true,
  set_up: true,
  recovery_codes_left: 8,
  can_switch_off: true,
};

const ME_PATH = "/api/me/";
const TWO_FACTOR_PATH = "/api/me/two-factor/";
const ASK_PATH = "/api/me/email/";
const CONFIRM_PATH = "/api/me/email/confirm/";
const NEW_EMAIL = "sita.sharma@office.com";
const SENT = { detail: "We've sent a 6-digit code to your new email." };
const CODE_REFUSED =
  "That code isn't right or has run out. Check the email, or send yourself a new one.";

function renderPage() {
  render(
    <StaffContextContext value={COUNSELLOR}>
      <SetMyNameContext value={vi.fn()}>
        <ToastProvider>
          <MySettingsPage />
        </ToastProvider>
      </SetMyNameContext>
    </StaffContextContext>,
  );
}

function sentBody(fetchFn: ReturnType<typeof backend>, path: string, index = 0): unknown {
  const body = callsTo(fetchFn, "POST", path)[index]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "");
}

async function openWorkEmail() {
  const menu = screen.getByRole("navigation", { name: "Settings" });
  await userEvent.click(within(menu).getByRole("button", { name: "Email" }));
  return screen.getByRole("region", { name: "Email" });
}

async function startChange(section: HTMLElement) {
  await userEvent.click(await within(section).findByRole("button", { name: "Change" }));
}

async function fillDetails(section: HTMLElement, email = NEW_EMAIL, password = "my-password") {
  if (email !== "") {
    await userEvent.type(within(section).getByLabelText("New email"), email);
  }
  if (password !== "") {
    await userEvent.type(within(section).getByLabelText("Current password"), password);
  }
}

async function sendCode(section: HTMLElement) {
  await userEvent.click(within(section).getByRole("button", { name: "Send the code" }));
}

async function enterCode(section: HTMLElement, code = "123456") {
  await userEvent.type(await within(section).findByLabelText("Code"), code);
  await userEvent.click(within(section).getByRole("button", { name: "Change email" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("My settings → Email", () => {
  it("comes after My Details in the menu and shows my email with Change", async () => {
    backend(on("GET", ME_PATH, ME), on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF));
    renderPage();

    const menu = screen.getByRole("navigation", { name: "Settings" });
    const items = within(menu)
      .getAllByRole("button")
      .map((item) => item.textContent);
    expect(items.slice(0, 3)).toEqual(["My Details", "Email", "Password"]);

    const section = await openWorkEmail();
    expect(await within(section).findByText("sita@office.com")).toBeVisible();
    expect(within(section).getByRole("button", { name: "Change" })).toBeVisible();
  });

  it("changes the email in two steps and keeps me logged in", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on("POST", ASK_PATH, SENT, 202),
      on("POST", CONFIRM_PATH, { email: NEW_EMAIL }),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);

    expect(within(section).getByLabelText("New email")).toHaveFocus();
    expect(within(section).queryByLabelText("6-digit number")).not.toBeInTheDocument();
    await fillDetails(section);
    await sendCode(section);

    expect(sentBody(fetchFn, ASK_PATH)).toEqual({ email: NEW_EMAIL, password: "my-password" });
    expect(
      await within(section).findByText(/We sent a 6-digit code to sita\.sharma@office\.com/),
    ).toBeVisible();
    expect(within(section).getByLabelText("Code")).toHaveFocus();

    await enterCode(section);

    expect(sentBody(fetchFn, CONFIRM_PATH)).toEqual({ email: NEW_EMAIL, code: "123456" });
    expect(
      await screen.findByText("Email changed. Other devices have been signed out."),
    ).toBeInTheDocument();
    expect(within(section).getByText(NEW_EMAIL)).toBeVisible();
    expect(within(section).getByRole("button", { name: "Change" })).toHaveFocus();
  });

  it("asks for the number from my app when two-step login is on", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_ON),
      on("POST", ASK_PATH, SENT, 202),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);

    await fillDetails(section);
    await userEvent.type(await within(section).findByLabelText("6-digit number"), "654321");
    await sendCode(section);

    await waitFor(() => {
      expect(sentBody(fetchFn, ASK_PATH)).toEqual({
        email: NEW_EMAIL,
        password: "my-password",
        code: "654321",
      });
    });
  });

  it("takes a recovery code in place of the number", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_ON),
      on("POST", ASK_PATH, SENT, 202),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await userEvent.click(
      await within(section).findByRole("button", { name: "Use a recovery code instead" }),
    );
    await userEvent.type(within(section).getByLabelText("Recovery code"), "abcd-efgh-jkmn");
    await sendCode(section);

    await waitFor(() => {
      expect(sentBody(fetchFn, ASK_PATH)).toEqual({
        email: NEW_EMAIL,
        password: "my-password",
        recovery_code: "abcd-efgh-jkmn",
      });
    });
  });

  it("checks the form before asking the server", async () => {
    const fetchFn = backend(on("GET", ME_PATH, ME), on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF));
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);

    await fillDetails(section, "not-an-email", "");
    await sendCode(section);

    expect(
      within(section).getByText("Enter a whole email address, such as name@office.com."),
    ).toBeVisible();
    expect(within(section).getByText("Enter your current password.")).toBeVisible();
    expect(within(section).getByLabelText("New email")).toHaveFocus();
    expect(callsTo(fetchFn, "POST", ASK_PATH)).toHaveLength(0);
  });

  it("refuses my own email without asking the server", async () => {
    const fetchFn = backend(on("GET", ME_PATH, ME), on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF));
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);

    await fillDetails(section, "SITA@office.com");
    await sendCode(section);

    expect(within(section).getByText("That's already your email.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", ASK_PATH)).toHaveLength(0);
  });

  it.each([
    [{ password: ["That isn't your current password."] }, "Current password"],
    [{ email: ["Someone here already uses this email."] }, "New email"],
  ])("shows the server's refusal under its field: %j", async (body, label) => {
    backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on("POST", ASK_PATH, body, 400),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await sendCode(section);

    const field = within(section).getByLabelText(label);
    const words = Object.values(body)[0]?.[0] ?? "";
    expect(await within(section).findByText(words)).toBeVisible();
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveFocus();
  });

  it("shows the number field when the server asks for it", async () => {
    backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on(
        "POST",
        ASK_PATH,
        { code: ["Enter the 6-digit number from your authenticator app."] },
        400,
      ),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await sendCode(section);

    expect(await within(section).findByLabelText("6-digit number")).toBeVisible();
    expect(
      within(section).getByText("Enter the 6-digit number from your authenticator app."),
    ).toBeVisible();
  });

  it.each([
    [429, "Too many codes were sent. Wait an hour, then ask for a new one."],
    [503, "The email couldn't be sent. Try again in a moment."],
  ])("shows a %i refusal across the form", async (status, words) => {
    backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on("POST", ASK_PATH, { detail: words }, status),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await sendCode(section);

    expect(await within(section).findByText(words)).toBeVisible();
    expect(within(section).getByLabelText("New email")).toBeInTheDocument();
  });

  it("shows a refused Code under the code field and keeps the email", async () => {
    backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on("POST", ASK_PATH, SENT, 202),
      on("POST", CONFIRM_PATH, { detail: CODE_REFUSED }, 400),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await sendCode(section);
    await enterCode(section, "111111");

    expect(await within(section).findByText(CODE_REFUSED)).toBeVisible();
    expect(within(section).getByLabelText("Code")).toHaveAttribute("aria-invalid", "true");
    expect(within(section).getByText("sita@office.com")).toBeVisible();
  });

  it("asks for a short code before calling the server", async () => {
    const fetchFn = backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on("POST", ASK_PATH, SENT, 202),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await sendCode(section);
    await enterCode(section, "123");

    expect(within(section).getByText("Enter the 6-digit code.")).toBeVisible();
    expect(callsTo(fetchFn, "POST", CONFIRM_PATH)).toHaveLength(0);
  });

  it("Send a new code goes back to the first step with the email kept", async () => {
    backend(
      on("GET", ME_PATH, ME),
      on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF),
      on("POST", ASK_PATH, SENT, 202),
    );
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);
    await sendCode(section);

    await userEvent.click(await within(section).findByRole("button", { name: "Send a new code" }));

    expect(within(section).getByLabelText("New email")).toHaveValue(NEW_EMAIL);
    expect(within(section).getByLabelText("Current password")).toHaveValue("");
    expect(within(section).getByLabelText("Current password")).toHaveFocus();
    expect(within(section).getByText("Enter your password again to get a new code.")).toBeVisible();
  });

  it("Cancel closes the form and puts focus back on Change", async () => {
    const fetchFn = backend(on("GET", ME_PATH, ME), on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF));
    renderPage();
    const section = await openWorkEmail();
    await startChange(section);
    await fillDetails(section);

    await userEvent.click(within(section).getByRole("button", { name: "Cancel" }));

    expect(within(section).queryByLabelText("New email")).not.toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Change" })).toHaveFocus();
    expect(callsTo(fetchFn, "POST", ASK_PATH)).toHaveLength(0);
  });

  it("My Details now says where to change the email", async () => {
    backend(on("GET", ME_PATH, ME), on("GET", TWO_FACTOR_PATH, TWO_FACTOR_OFF));
    renderPage();
    const details = await screen.findByRole("region", { name: "My Details" });
    await userEvent.click(await within(details).findByRole("button", { name: "Edit details" }));

    expect(
      within(details).getByText(
        "sita@office.com. Job title and role are set by an Admin. Change your email under Email.",
      ),
    ).toBeVisible();
  });
});
