import { uid } from "@/test/ids";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { backend, callsTo, on } from "@/test/backend";

import { OfficeLoginForm } from "./OfficeLoginForm";

const query = vi.hoisted(() => ({ current: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.current) }));
const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const CONTEXT = {
  staff: {
    id: uid(1),
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "counsellor",
    colour_mode: "light",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students"],
  date_display: "AD",
  support_access: null,
};

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

  describe("after the login ended (ticket 14)", () => {
    beforeEach(() => {
      navigate.mockClear();
    });

    it("says the person was logged out, as an info banner", () => {
      query.current = "session=ended&next=%2Fstudents%2F12";

      render(<OfficeLoginForm />);

      expect(screen.getByRole("status")).toHaveTextContent(
        "You've been logged out. Please log in again.",
      );
    });

    it("says nothing when the person logged out themselves", () => {
      query.current = "next=%2Fstudents%2F12";

      render(<OfficeLoginForm />);

      expect(screen.queryByText(/logged out/)).not.toBeInTheDocument();
    });

    it("brings the person back to the page they were on", async () => {
      query.current = "session=ended&next=%2Fstudents%2F12%3Fptab%3Ddocs";
      backend(
        on("POST", "/api/auth/login/next/", { next: "password" }),
        on("POST", "/api/auth/login/", { context: CONTEXT }),
      );
      render(<OfficeLoginForm />);

      await logIn();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/students/12?ptab=docs");
      });
    });

    it("brings them back after two-step login too", async () => {
      query.current = "session=ended&next=%2Ftasks";
      backend(
        on("POST", "/api/auth/login/next/", { next: "password" }),
        on("POST", "/api/auth/login/", { two_factor: "verify" }),
        on("POST", "/api/auth/two-factor/verify/", { context: {} }),
      );
      render(<OfficeLoginForm />);
      await logIn();

      await userEvent.type(await screen.findByLabelText("6-digit number"), "123456");
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/tasks");
      });
    });

    it.each([
      "next=%2F%2Fevil.example",
      "next=https%3A%2F%2Fevil.example%2F",
      "next=javascript%3Aalert(1)",
      "next=%2F%252F%252Fevil.example",
      "next=%2F%5Cevil.example",
    ])("drops a page that isn't on this site (%s) and opens Home", async (search) => {
      query.current = `session=ended&${search}`;
      backend(
        on("POST", "/api/auth/login/next/", { next: "password" }),
        on("POST", "/api/auth/login/", { context: CONTEXT }),
      );
      render(<OfficeLoginForm />);

      await logIn();

      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("/");
      });
    });
  });
});
