import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { backend, callsTo, on } from "@/test/backend";

import { OfficeLoginForm } from "./OfficeLoginForm";

const query = vi.hoisted(() => ({ current: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.current) }));
const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

async function logIn(): Promise<void> {
  await userEvent.type(screen.getByLabelText("Email"), "sita@acme.test");
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  await userEvent.type(await screen.findByLabelText("Password"), "Kathmandu!2026");
  await userEvent.click(screen.getByRole("button", { name: "Log in" }));
}

describe("OfficeLoginForm", () => {
  it("fills the email from a Central login link", () => {
    query.current = "email=sita%40example.com";

    render(<OfficeLoginForm />);

    expect(screen.getByLabelText("Email")).toHaveValue("sita@example.com");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it.each(["", "email=", "email=not-an-email", "email=%3Cscript%3E%40x.com"])(
    "leaves the field empty for %j",
    (search) => {
      query.current = search;

      render(<OfficeLoginForm />);

      expect(screen.getByLabelText("Email")).toHaveValue("");
    },
  );

  it("never fills the password from the address", async () => {
    query.current = "email=sita%40example.com&password=secret";
    backend(on("POST", "/api/auth/login/next/", { next: "password" }));

    render(<OfficeLoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByLabelText("Password")).toHaveValue("");
    expect(screen.getByText("sita@example.com")).toBeVisible();
  });

  describe("two-step login (issue 62)", () => {
    beforeEach(() => {
      query.current = "";
      navigate.mockClear();
    });

    it("asks for the number after the password, then opens Home", async () => {
      const fetchFn = backend(
        on("POST", "/api/auth/login/", { two_factor: "verify" }),
        on("POST", "/api/auth/two-factor/verify/", { context: {} }),
      );
      render(<OfficeLoginForm />);

      await logIn();
      expect(
        await screen.findByRole("heading", {
          name: "Enter the number from your authenticator app",
        }),
      ).toBeInTheDocument();
      expect(navigate).not.toHaveBeenCalled();
      await userEvent.type(screen.getByLabelText("6-digit number"), "123456");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/");
      });
      expect(callsTo(fetchFn, "POST", "/api/auth/two-factor/verify/")).toHaveLength(1);
    });

    it("sets up the app first when it isn't set up yet", async () => {
      backend(
        on("POST", "/api/auth/login/", { two_factor: "setup" }),
        on("POST", "/api/auth/two-factor/setup/", {
          uri: "otpauth://totp/Consultancy%20CRM:sita?secret=JBSWY3DPEHPK3PXP&issuer=x",
        }),
      );
      render(<OfficeLoginForm />);

      await logIn();

      expect(
        await screen.findByRole("heading", { name: "Set up two-step login" }),
      ).toBeInTheDocument();
      expect(await screen.findByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    });

    it("goes back to the password when the sign-in has to start again", async () => {
      backend(
        on("POST", "/api/auth/login/", { two_factor: "verify" }),
        on(
          "POST",
          "/api/auth/two-factor/verify/",
          { detail: "Log in again.", start_again: true },
          400,
        ),
      );
      render(<OfficeLoginForm />);
      await logIn();
      await userEvent.type(await screen.findByLabelText("6-digit number"), "123456");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      await userEvent.click(await screen.findByRole("button", { name: "Back to log in" }));

      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });
});
