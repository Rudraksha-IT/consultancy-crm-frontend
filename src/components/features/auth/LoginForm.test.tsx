import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/test-helpers";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { LoginForm } from "./LoginForm";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const CONTEXT = {
  staff: {
    id: 1,
    name: "Sita Sharma",
    email: "sita@acme.test",
    role: "counsellor",
    colour_mode: "device",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students"],
  date_display: "AD",
  support_access: null,
};
const STEP_PATH = "/api/auth/login/next/";
const LOGIN_PATH = "/api/auth/login/";

type Answer = () => Promise<Response>;

/** The email step answers `next`; the login answers `login`. */
function backend(
  login: Answer,
  next: Answer = () => Promise.resolve(jsonResponse({ next: "password" })),
) {
  const fetchFn = vi.fn<typeof fetch>((path) => (path === STEP_PATH ? next() : login()));
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

const answer =
  (body: unknown, status = 200): Answer =>
  () =>
    Promise.resolve(jsonResponse(body, status));

async function continueWith(email: string): Promise<void> {
  const user = userEvent.setup();
  if (email !== "") await user.type(screen.getByLabelText("Email"), email);
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
});

describe("LoginForm: the email first (issue 66)", () => {
  it("asks only for the email at first", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  it("asks for an email before calling the server", async () => {
    const fetchFn = backend(answer({}));
    render(<LoginForm />);

    await continueWith("");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("then shows the email above as text, with only the password box", async () => {
    const fetchFn = backend(answer({ context: CONTEXT }));
    render(<LoginForm />);

    await continueWith(" sita@acme.test ");

    expect(await screen.findByLabelText("Password")).toBeVisible();
    expect(screen.getByText("sita@acme.test")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
    expect(fetchFn).toHaveBeenCalledWith(
      STEP_PATH,
      expect.objectContaining({ body: JSON.stringify({ email: "sita@acme.test" }) }),
    );
    expect(screen.getByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
      "href",
      "/forgot-password?email=sita%40acme.test",
    );
  });

  it("goes back to the email with Change, keeping what was typed", async () => {
    backend(answer({}));
    render(<LoginForm />);
    await continueWith("sita@acme.test");

    await userEvent.click(await screen.findByRole("button", { name: "Change email" }));

    expect(screen.getByLabelText("Email")).toHaveValue("sita@acme.test");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("sends someone invited to the Join page with their email", async () => {
    backend(answer({}), answer({ next: "join" }));
    render(<LoginForm />);

    await continueWith("new@acme.test");

    expect(navigate).toHaveBeenCalledWith("/join?email=new%40acme.test&sent=1");
  });

  it("sends a Platform Admin invited to the Platform's Join page", async () => {
    const fetchFn = vi.fn<typeof fetch>(() => Promise.resolve(jsonResponse({ next: "join" })));
    vi.stubGlobal("fetch", fetchFn);
    render(
      <LoginForm
        side="platform"
        homePath="/platform"
        forgotPasswordPath="/platform/forgot-password"
      />,
    );

    await continueWith("rita@platform.test");

    expect(fetchFn.mock.calls[0]?.[0]).toBe("/api/platform/auth/login/next/");
    expect(navigate).toHaveBeenCalledWith("/platform/join?email=rita%40platform.test&sent=1");
  });

  it("says so when the email isn't a valid address, and stays on the email step", async () => {
    backend(answer({}), answer({ email: ["Enter a valid email address."] }, 400));
    render(<LoginForm />);

    await continueWith("not-an-email");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid email, like name@example.com.",
    );
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("not-an-email");
  });

  it("still offers the password when the email step can't be checked", async () => {
    backend(answer({}), () => Promise.reject(new TypeError("offline")));
    render(<LoginForm />);

    await continueWith("sita@acme.test");

    expect(await screen.findByLabelText("Password")).toBeVisible();
  });
});

describe("LoginForm: the password", () => {
  it("logs in and loads the home screen afresh", async () => {
    const fetchFn = backend(answer({ context: CONTEXT }));
    render(<LoginForm />);

    await logInWith("sita@acme.test", "secret");

    expect(navigate).toHaveBeenCalledWith("/");
    expect(fetchFn).toHaveBeenCalledWith(
      LOGIN_PATH,
      expect.objectContaining({
        body: JSON.stringify({ email: "sita@acme.test", password: "secret" }),
      }),
    );
  });

  it("shows an error and stays on the page when the credentials are wrong", async () => {
    backend(answer({ detail: "no" }, 400));
    render(<LoginForm />);

    await logInWith("sita@acme.test", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("says why when the office's Status refuses the login", async () => {
    const detail = "Your office's trial has ended. Ask your Admin to contact the CRM team.";
    backend(answer({ detail, status: "evaluation" }, 403));
    render(<LoginForm />);

    await logInWith("sita@acme.test", "secret");

    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  });

  it("keeps the general error for a refusal that isn't about the Status", async () => {
    backend(answer({ detail: "Forbidden." }, 403));
    render(<LoginForm />);

    await logInWith("sita@acme.test", "secret");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't log you in. Please try again.",
    );
  });

  it("shows a general error when the API can't be reached", async () => {
    backend(() => Promise.reject(new TypeError("offline")));
    render(<LoginForm />);

    await logInWith("sita@acme.test", "secret");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't log you in. Please try again.",
    );
  });

  it("disables the button while logging in", async () => {
    backend(() => new Promise(() => undefined));
    render(<LoginForm />);

    await logInWith("sita@acme.test", "secret");

    expect(screen.getByRole("button", { name: "Logging in…" })).toBeDisabled();
  });
});

describe.each(THEME_CASES)("LoginForm in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("labels both steps", async () => {
    backend(answer({}));
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeVisible();

    await continueWith("sita@acme.test");

    const form = within(screen.getByRole("form", { name: "Log in" }));
    expect(await form.findByLabelText("Password")).toBeVisible();
  });
});
