import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { backend, callsTo, on, onEach } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { PlatformEmailSettings } from "./PlatformEmailSettings";

const STATUS_PATH = "/api/platform/email/";
const TEST_PATH = "/api/platform/email/test/";
const ME = "admin@platform.com";
const REFERENCE = "5f0c2a7e-1b2d-4c3e-9f4a-7b6c5d4e3f2a";
const TESTED_AT = "2026-11-19T04:30:00Z";

function answer(state: string, reference: string | null = null, testedAt: string | null = null) {
  return {
    email: { state, tested_at: testedAt, reference },
    from_address: "no-reply@crm.example",
    product_name: "Rudraksha CRM",
    sent_to: ME,
  };
}

function renderIt() {
  render(
    <ToastProvider>
      <PlatformEmailSettings />
    </ToastProvider>,
  );
}

function sendButton(): HTMLElement {
  return screen.getByRole("button", { name: "Send a test email" });
}

describe("PlatformEmailSettings: is email working? (spec 2026-11-18 stories 3-4)", () => {
  it("says it hasn't been tested yet and where emails come from", async () => {
    backend(on("GET", STATUS_PATH, answer("untested")));
    renderIt();

    expect(await screen.findByText("Not tested yet")).toBeVisible();
    expect(screen.getByText("Email")).toBeVisible();
    expect(screen.getByText("Rudraksha CRM <no-reply@crm.example>")).toBeVisible();
    expect(
      screen.getByText(
        "The office's name <no-reply@crm.example>, with Reply-To the office's contact email",
      ),
    ).toBeVisible();
    expect(screen.getByText(`It goes to you, at ${ME}.`)).toBeVisible();
    expect(sendButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a working email with a word and an icon, and when it was last sent", async () => {
    backend(on("GET", STATUS_PATH, answer("working", null, TESTED_AT)));
    renderIt();

    expect(await screen.findByText("Working")).toBeVisible();
    expect(screen.getByText(/^Last test sent /)).toBeVisible();
  });

  it("shows a failed test with its reference, never anything else", async () => {
    backend(on("GET", STATUS_PATH, answer("failed", REFERENCE, TESTED_AT)));
    renderIt();

    expect(await screen.findByText("Last test failed")).toBeVisible();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      `The test email couldn't be sent. Check the email values in the deploy. If you ask for help, quote reference ${REFERENCE}.`,
    );
    expect(screen.getByText(/^Tried /)).toBeVisible();
  });

  it("sends a test email, shows it working and keeps focus on the button", async () => {
    let sent = false;
    const fetchFn = backend(
      onEach("GET", STATUS_PATH, () => answer(sent ? "working" : "untested")),
      (path, init) => {
        if (path !== TEST_PATH || init?.method !== "POST") return undefined;
        sent = true;
        return new Response(JSON.stringify(answer("working", null, TESTED_AT)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    );
    renderIt();
    await screen.findByText("Not tested yet");

    await userEvent.click(sendButton());

    expect(await screen.findByText(`Test email sent to ${ME}`)).toBeVisible();
    expect(screen.getByText("Working")).toBeVisible();
    expect(callsTo(fetchFn, "POST", TEST_PATH)).toHaveLength(1);
    await waitFor(() => {
      expect(sendButton()).toHaveFocus();
    });
  });

  it("shows a failed send with its reference", async () => {
    backend(
      on("GET", STATUS_PATH, answer("untested")),
      on("POST", TEST_PATH, {
        ...answer("failed", REFERENCE, TESTED_AT),
        detail: "The test email couldn't be sent. Check the email values in the deploy.",
      }),
    );
    renderIt();
    await screen.findByText("Not tested yet");

    await userEvent.click(sendButton());

    expect(await screen.findByText("The test email failed")).toBeVisible();
    expect(screen.getByText("Last test failed")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(`quote reference ${REFERENCE}`);
  });

  it("says when too many were sent, and nothing changes", async () => {
    backend(
      on("GET", STATUS_PATH, answer("working", null, TESTED_AT)),
      on("POST", TEST_PATH, { detail: "Too many test emails. Try again in an hour." }, 429),
    );
    renderIt();
    await screen.findByText("Working");

    await userEvent.click(sendButton());

    expect(await screen.findByText("Too many test emails. Try again in an hour.")).toBeVisible();
    expect(screen.getByText("Working")).toBeVisible();
  });

  it("says when the test couldn't be started at all", async () => {
    backend(on("GET", STATUS_PATH, answer("untested")));
    renderIt();
    await screen.findByText("Not tested yet");

    await userEvent.click(sendButton());

    expect(
      await screen.findByText("The test email couldn't be sent. Try again in a few minutes."),
    ).toBeVisible();
  });

  it("says when the status can't be loaded, and still offers the test", async () => {
    backend();
    renderIt();

    expect(await screen.findByText("The email status couldn't be loaded.")).toBeVisible();
    expect(sendButton()).toBeEnabled();
  });

  it("ignores an answer it doesn't understand", async () => {
    backend(
      on("GET", STATUS_PATH, { ...answer("untested"), from_address: "<script>alert(1)</script>" }),
    );
    renderIt();

    expect(await screen.findByText("The email status couldn't be loaded.")).toBeVisible();
    expect(document.body.innerHTML).not.toContain("<script>");
  });
});

describe.each(THEME_CASES)("PlatformEmailSettings in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });
  afterEach(resetTheme);

  it("shows each status with a word, and labels the button", async () => {
    backend(on("GET", STATUS_PATH, answer("failed", REFERENCE, TESTED_AT)));
    renderIt();

    const section = await screen.findByRole("region", { name: "Email" });
    expect(await within(section).findByText("Last test failed")).toBeVisible();
    expect(within(section).getByRole("alert")).toBeVisible();
    expect(sendButton()).toBeVisible();
  });
});
