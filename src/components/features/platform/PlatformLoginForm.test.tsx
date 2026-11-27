import { uid } from "@/test/ids";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { PlatformLoginForm } from "./PlatformLoginForm";

const query = vi.hoisted(() => ({ current: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.current) }));
const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const ADMIN = { id: uid(1), name: "Platform Ops", email: "ops@platform.test" };

async function continueWith(email: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function logInWith(email: string, password: string): Promise<void> {
  await continueWith(email);
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

beforeEach(() => {
  navigate.mockReset();
  query.current = "";
});

describe("PlatformLoginForm", () => {
  it("links to the Platform's own forgot password (issue 63)", async () => {
    backend();
    render(<PlatformLoginForm />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await continueWith("ops@platform.test");

    expect(await screen.findByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
      "href",
      "/platform/forgot-password?email=ops%40platform.test",
    );
  });

  it("says the password was changed after a reset", () => {
    query.current = "password=changed";
    render(<PlatformLoginForm />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your password was changed. Log in with your new password.",
    );
  });

  it("says the password is set after joining (issue 65)", () => {
    query.current = "password=set";
    render(<PlatformLoginForm />);

    expect(screen.getByRole("status")).toHaveTextContent("Your password is set. Log in with it.");
  });

  it("ignores any other value in the address", () => {
    query.current = "password=<script>alert(1)</script>";
    render(<PlatformLoginForm />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("logs in as a Platform Admin and loads the Consultancy list afresh", async () => {
    const fetchFn = backend(
      on("POST", "/api/platform/auth/login/next/", { next: "password" }),
      on("POST", "/api/platform/auth/login/", { platform_admin: ADMIN }),
    );
    render(<PlatformLoginForm />);

    await logInWith("ops@platform.test", "secret");

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/platform/auth/login/",
      expect.objectContaining({ method: "POST" }),
    );
    expect(navigate).toHaveBeenCalledWith("/platform");
  });

  it("shows an error when the credentials are wrong", async () => {
    backend(on("POST", "/api/platform/auth/login/", { detail: "no" }, 400));
    render(<PlatformLoginForm />);

    await logInWith("ops@platform.test", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("asks for the number from the app before opening the Platform", async () => {
    const fetchFn = backend(
      on("POST", "/api/platform/auth/login/", { two_factor: "verify" }),
      on("POST", "/api/platform/auth/two-factor/verify/", { platform_admin: ADMIN }),
    );
    render(<PlatformLoginForm />);
    const user = userEvent.setup();

    await logInWith("ops@platform.test", "secret");
    expect(navigate).not.toHaveBeenCalled();
    await user.type(await screen.findByLabelText("6-digit number"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/platform");
    });
    expect(callsTo(fetchFn, "POST", "/api/platform/auth/two-factor/verify/")).toHaveLength(1);
  });

  it("forces setup when two-step login is on but not set up yet", async () => {
    backend(
      on("POST", "/api/platform/auth/login/", { two_factor: "setup" }),
      on("POST", "/api/platform/auth/two-factor/setup/", {
        uri: "otpauth://totp/Consultancy%20CRM:ops%40platform.test?secret=JBSWY3DPEHPK3PXP",
      }),
    );
    render(<PlatformLoginForm />);

    await logInWith("ops@platform.test", "secret");

    expect(await screen.findByRole("heading", { name: "Set up two-step login" })).toBeVisible();
    expect(await screen.findByRole("img", { name: /QR code/ })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("goes back to the password when the login has timed out", async () => {
    backend(
      on("POST", "/api/platform/auth/login/", { two_factor: "verify" }),
      on(
        "POST",
        "/api/platform/auth/two-factor/verify/",
        { detail: "Log in again.", start_again: true },
        400,
      ),
    );
    render(<PlatformLoginForm />);
    const user = userEvent.setup();

    await logInWith("ops@platform.test", "secret");
    await user.type(await screen.findByLabelText("6-digit number"), "123456");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Back to log in" }));

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe.each(THEME_CASES)("PlatformLoginForm in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });
  afterEach(resetTheme);

  it("shows the notice, the labelled fields and the forgot-password link", async () => {
    query.current = "password=changed";
    backend();
    render(<PlatformLoginForm />);

    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    await continueWith("ops@platform.test");
    expect(await screen.findByLabelText("Password")).toBeVisible();
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
  });

  describe("after the login ended (ticket 14)", () => {
    it("says the Platform Admin was logged out", () => {
      query.current = "session=ended&next=%2Fplatform%2Fadmins";
      backend();

      render(<PlatformLoginForm />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "You've been logged out. Please log in again.",
      );
    });

    it("brings them back to the page they were on", async () => {
      query.current = "session=ended&next=%2Fplatform%2Fadmins";
      backend(
        on("POST", "/api/platform/auth/login/next/", { next: "password" }),
        on("POST", "/api/platform/auth/login/", { platform_admin: ADMIN }),
      );
      render(<PlatformLoginForm />);

      await logInWith("ops@platform.test", "Kathmandu!2026");

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/platform/admins");
      });
    });

    it("opens the Platform's list for a page that isn't on this site", async () => {
      query.current = "session=ended&next=%2F%2Fevil.example";
      backend(
        on("POST", "/api/platform/auth/login/next/", { next: "password" }),
        on("POST", "/api/platform/auth/login/", { platform_admin: ADMIN }),
      );
      render(<PlatformLoginForm />);

      await logInWith("ops@platform.test", "Kathmandu!2026");

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/platform");
      });
    });
  });
});
