import { uid } from "@/test/ids";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider } from "@/components/ui/ToastProvider";
import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { QrCode } from "./QrCode";
import { RecoveryCodes } from "./RecoveryCodes";
import { TwoFactorSetup } from "./TwoFactorSetup";
import { TwoFactorVerifyForm } from "./TwoFactorVerifyForm";

const SETUP = "/api/platform/auth/two-factor/setup/";
const CONFIRM = "/api/platform/auth/two-factor/confirm/";
const VERIFY = "/api/platform/auth/two-factor/verify/";
const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const URI = `otpauth://totp/Consultancy%20CRM:ops%40platform.test?secret=${SECRET}&issuer=Consultancy%20CRM`;
const CODES = [
  "abcd-efgh-jkmn",
  ...Array.from({ length: 9 }, (_, n) => `wxyz-wxyz-wx${"23456789a"[n] ?? "b"}m`),
];
const ADMIN = { id: uid(1), name: "Platform Ops", email: "ops@platform.test" };

function sentBody(fetchFn: ReturnType<typeof backend>, path: string): unknown {
  const body = callsTo(fetchFn, "POST", path)[0]?.[1]?.body;
  return JSON.parse(typeof body === "string" ? body : "");
}

function renderVerify() {
  const onPassed = vi.fn<() => void>();
  const onStartAgain = vi.fn<() => void>();
  render(<TwoFactorVerifyForm onPassed={onPassed} onStartAgain={onStartAgain} />);
  return { onPassed, onStartAgain };
}

function renderSetup() {
  const onDone = vi.fn<() => void>();
  const onStartAgain = vi.fn<() => void>();
  render(
    <ToastProvider>
      <TwoFactorSetup onDone={onDone} onStartAgain={onStartAgain} />
    </ToastProvider>,
  );
  return { onDone, onStartAgain };
}

describe("TwoFactorVerifyForm", () => {
  it("asks for the 6-digit number with the number keypad and one-time-code autofill", () => {
    renderVerify();

    expect(
      screen.getByRole("heading", { name: "Enter the number from your authenticator app" }),
    ).toBeInTheDocument();
    const field = screen.getByLabelText("6-digit number");
    expect(field).toHaveAttribute("inputmode", "numeric");
    expect(field).toHaveAttribute("autocomplete", "one-time-code");
  });

  it("sends the number, spaces taken out, and goes on once it passes", async () => {
    const fetchFn = backend(on("POST", VERIFY, { platform_admin: ADMIN }));
    const { onPassed } = renderVerify();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("6-digit number"), "123 456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(onPassed).toHaveBeenCalled();
    });
    expect(sentBody(fetchFn, VERIFY)).toEqual({ code: "123456" });
  });

  it("checks the number's shape before asking the server", async () => {
    const fetchFn = backend();
    renderVerify();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("6-digit number"), "12a45");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Enter the 6-digit number from your app.")).toBeInTheDocument();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says a wrong number is wrong, under the field", async () => {
    backend(on("POST", VERIFY, { code: ["No."] }, 400));
    renderVerify();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("6-digit number"), "000000");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("That number isn't right. Enter the newest number from your app."),
    ).toBeInTheDocument();
  });

  it("takes a recovery code instead", async () => {
    const fetchFn = backend(on("POST", VERIFY, { platform_admin: ADMIN }));
    const { onPassed } = renderVerify();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Use a recovery code instead" }));
    await user.type(screen.getByLabelText("Recovery code"), "ABCD-EFGH-JKMN");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(onPassed).toHaveBeenCalled();
    });
    expect(sentBody(fetchFn, VERIFY)).toEqual({ recovery_code: "abcd-efgh-jkmn" });
    expect(
      screen.getByRole("button", { name: "Use the number from your app instead" }),
    ).toBeVisible();
  });

  it("explains too many tries", async () => {
    backend(on("POST", VERIFY, { detail: "Wait." }, 429));
    renderVerify();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("6-digit number"), "000000");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Wait 15 minutes/);
  });

  it("offers the way back to the password when the sign-in has timed out", async () => {
    backend(on("POST", VERIFY, { detail: "Log in again.", start_again: true }, 400));
    const { onStartAgain } = renderVerify();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("6-digit number"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Back to log in" }));

    expect(onStartAgain).toHaveBeenCalled();
  });
});

describe("TwoFactorSetup", () => {
  it("shows the QR code drawn here and the key, then the recovery codes once", async () => {
    const fetchFn = backend(
      on("POST", SETUP, { uri: URI }),
      on("POST", CONFIRM, { platform_admin: ADMIN, recovery_codes: CODES }),
    );
    const { onDone } = renderSetup();
    const user = userEvent.setup();

    expect(
      await screen.findByRole("img", { name: "QR code to scan with your authenticator app" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Setup key")).toHaveTextContent("JBSW Y3DP EHPK 3PXP");
    await user.type(screen.getByLabelText("Then enter the 6-digit number the app shows"), "654321");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("heading", { name: "Save your recovery codes" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Your recovery codes" })).toHaveTextContent(
      "abcd-efgh-jkmn",
    );
    expect(sentBody(fetchFn, CONFIRM)).toEqual({ code: "654321" });
    expect(callsTo(fetchFn, "POST", SETUP)).toHaveLength(1);
    // Only once the codes are saved can the person go on.
    const goOn = screen.getByRole("button", { name: "Continue to the Platform" });
    expect(goOn).toBeDisabled();
    await user.click(screen.getByLabelText("I've saved my recovery codes"));
    await user.click(goOn);
    expect(onDone).toHaveBeenCalled();
  });

  it("never sends the setup URI anywhere but its own API", async () => {
    const fetchFn = backend(on("POST", SETUP, { uri: URI }));
    renderSetup();

    await screen.findByRole("img", { name: /QR code/ });

    expect(fetchFn.mock.calls.every(([path]) => path === SETUP)).toBe(true);
    expect(document.querySelector("img")).toBeNull();
  });

  it("says a wrong number is wrong and keeps the QR code", async () => {
    backend(on("POST", SETUP, { uri: URI }), on("POST", CONFIRM, { code: ["No."] }, 400));
    renderSetup();
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("Then enter the 6-digit number the app shows"),
      "000000",
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText(/That number isn't right/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /QR code/ })).toBeInTheDocument();
  });

  it("sends the person back to the password when the sign-in has timed out", async () => {
    backend(on("POST", SETUP, { detail: "Log in again.", start_again: true }, 400));
    const { onStartAgain } = renderSetup();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Back to log in" }));

    expect(onStartAgain).toHaveBeenCalled();
  });

  it("refuses an answer that isn't a setup URI", async () => {
    backend(on("POST", SETUP, { uri: "https://evil.example/?secret=ABC" }));
    renderSetup();

    expect(await screen.findByText("We couldn't start the setup. Please try again.")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("RecoveryCodes", () => {
  it("copies the codes, one per line", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(
      <ToastProvider>
        <RecoveryCodes codes={CODES} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Copy codes" }));

    expect(writeText).toHaveBeenCalledWith(CODES.join("\n"));
    expect(await screen.findByText("Recovery codes copied")).toBeInTheDocument();
  });

  it("downloads the codes as a text file", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:codes");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(
      <ToastProvider>
        <RecoveryCodes codes={CODES} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Download codes" }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});

describe("QrCode", () => {
  it("is always black on white, whatever the Theme", () => {
    render(<QrCode value={URI} label="QR" />);

    const svg = screen.getByRole("img", { name: "QR" });
    expect(svg).toHaveClass("bg-qr-light", "text-qr-dark", "w-full", "max-w-qr");
    expect(svg.querySelector("path")?.getAttribute("d")).toMatch(/^M\d+ \d+h1v1h-1z/);
  });
});

describe.each(THEME_CASES)("Two-step login in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("renders the number step with a labelled field", () => {
    renderVerify();

    expect(screen.getByLabelText("6-digit number")).toBeInTheDocument();
  });

  it("renders setup with the QR code", async () => {
    backend(on("POST", SETUP, { uri: URI }));
    renderSetup();

    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
  });
});

describe("Staff two-step login on the office's address (issue 62)", () => {
  const STAFF_SETUP = "/api/auth/two-factor/setup/";
  const STAFF_CONFIRM = "/api/auth/two-factor/confirm/";
  const STAFF_VERIFY = "/api/auth/two-factor/verify/";

  it("sets up through the office's own addresses and goes on with Continue", async () => {
    const fetchFn = backend(
      on("POST", STAFF_SETUP, { uri: URI }),
      on("POST", STAFF_CONFIRM, { context: {}, recovery_codes: CODES }),
    );
    const onDone = vi.fn<() => void>();
    render(
      <ToastProvider>
        <TwoFactorSetup side="staff" onDone={onDone} onStartAgain={vi.fn()} />
      </ToastProvider>,
    );
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/6-digit number/), "123456");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await user.click(await screen.findByLabelText("I've saved my recovery codes"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(onDone).toHaveBeenCalled();
    expect(callsTo(fetchFn, "POST", SETUP)).toHaveLength(0);
    expect(sentBody(fetchFn, STAFF_CONFIRM)).toEqual({ code: "123456" });
  });

  it("verifies through the office's own address", async () => {
    const fetchFn = backend(on("POST", STAFF_VERIFY, { context: {} }));
    const onPassed = vi.fn<() => void>();
    render(<TwoFactorVerifyForm side="staff" onPassed={onPassed} onStartAgain={vi.fn()} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("6-digit number"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(onPassed).toHaveBeenCalled();
    });
    expect(callsTo(fetchFn, "POST", VERIFY)).toHaveLength(0);
  });
});

describe.each(THEME_CASES)("Staff two-step login in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("renders the staff number step", () => {
    render(<TwoFactorVerifyForm side="staff" onPassed={vi.fn()} onStartAgain={vi.fn()} />);

    expect(screen.getByLabelText("6-digit number")).toBeInTheDocument();
  });
});
