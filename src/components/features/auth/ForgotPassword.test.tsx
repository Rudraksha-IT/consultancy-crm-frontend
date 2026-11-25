import { uid } from "@/test/ids";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { ForgotPassword } from "./ForgotPassword";

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
const SENT = { detail: "If that email belongs to someone here, we've sent them a 6-digit code." };
const CODE_REFUSED = { detail: "That code isn't right or has run out." };
const GOOD_PASSWORD = "Kathmandu!2026";

type Route = Record<string, Response | (() => Response)>;

/** Answer each API path with its response; anything else is a 404. */
function backend(routes: Route) {
  // The API client always calls fetch with a path string.
  const fetchFn = vi.fn((path: string, init?: RequestInit) => {
    const answer = init === undefined ? undefined : routes[path];
    const response = typeof answer === "function" ? answer() : answer;
    return Promise.resolve(response?.clone() ?? jsonResponse({}, 404));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function happyBackend() {
  return backend({
    "/api/auth/password-reset/": jsonResponse(SENT, 202),
    "/api/auth/password-reset/code/": jsonResponse({ detail: "That code is right." }),
    "/api/auth/password-reset/complete/": jsonResponse({ context: CONTEXT }),
  });
}

function bodiesSentTo(fetchFn: ReturnType<typeof backend>, path: string): unknown[] {
  return fetchFn.mock.calls
    .filter(([sentTo]) => sentTo === path)
    .map(([, init]) => parseBody(init));
}

function parseBody(init: RequestInit | undefined): unknown {
  const body = init?.body;
  if (typeof body !== "string") throw new Error("expected a JSON body");
  return JSON.parse(body);
}

function currentStep(): string {
  const steps = screen.getByRole("list", { name: "Steps" });
  const current = within(steps)
    .getAllByRole("listitem")
    .find((item) => item.getAttribute("aria-current") === "step");
  return current?.textContent ?? "";
}

async function sendCodeTo(email: string): Promise<void> {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Send the code" }));
  await screen.findByRole("heading", { name: "Check your email" });
}

async function enterCode(code: string): Promise<void> {
  await userEvent.type(screen.getByLabelText("Code"), code);
  await userEvent.click(screen.getByRole("button", { name: "Check the code" }));
}

async function choose(password: string, confirmation = password): Promise<void> {
  await userEvent.type(screen.getByLabelText("New password"), password);
  await userEvent.type(screen.getByLabelText("Confirm new password"), confirmation);
  await userEvent.click(screen.getByRole("button", { name: "Save password and log in" }));
}

beforeEach(() => {
  navigate.mockReset();
});

describe("ForgotPassword", () => {
  it("starts on the email step with the three steps shown", () => {
    render(<ForgotPassword />);

    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    expect(screen.getByText("We'll email you a 6-digit code.")).toBeVisible();
    const steps = within(screen.getByRole("list", { name: "Steps" })).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      "1Your email",
      "2Enter your code",
      "3Choose a password",
    ]);
    expect(currentStep()).toBe("1Your email");
    expect(screen.getByRole("link", { name: "Back to log in" })).toHaveAttribute("href", "/login");
  });

  it("goes from email to code to password and logs the person in", async () => {
    const fetchFn = happyBackend();
    render(<ForgotPassword />);

    await sendCodeTo("sita@acme.test");
    expect(currentStep()).toBe("2Enter your code");
    await enterCode("123 456");
    await screen.findByRole("heading", { name: "Choose your password" });
    expect(currentStep()).toBe("3Choose a password");
    expect(screen.getByText("You'll use it with sita@acme.test to log in.")).toBeVisible();
    await choose(GOOD_PASSWORD);

    expect(navigate).toHaveBeenCalledWith("/");
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/")).toEqual([
      { email: "sita@acme.test" },
    ]);
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/code/")).toEqual([
      { email: "sita@acme.test", code: "123456" },
    ]);
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/complete/")).toEqual([
      { email: "sita@acme.test", code: "123456", password: GOOD_PASSWORD },
    ]);
  });

  it("never says whether the email belongs to anyone", async () => {
    happyBackend();
    render(<ForgotPassword />);

    await sendCodeTo("nobody@acme.test");

    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          element.textContent ===
            "If nobody@acme.test belongs to someone here, we've sent it a 6-digit code. It works for 30 minutes.",
      ),
    ).toBeVisible();
  });

  it("asks for an email before sending anything", async () => {
    const fetchFn = happyBackend();
    render(<ForgotPassword />);

    await userEvent.click(screen.getByRole("button", { name: "Send the code" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("says when the code couldn't be sent", async () => {
    backend({ "/api/auth/password-reset/": jsonResponse({}, 502) });
    render(<ForgotPassword />);

    await userEvent.type(screen.getByLabelText("Email"), "sita@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Send the code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(currentStep()).toBe("1Your email");
  });

  it("refuses a code that isn't six digits without asking the server", async () => {
    const fetchFn = happyBackend();
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");

    await enterCode("12345");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter the 6-digit code.");
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/code/")).toEqual([]);
  });

  it("explains a wrong code and stays on the code step", async () => {
    backend({
      "/api/auth/password-reset/": jsonResponse(SENT, 202),
      "/api/auth/password-reset/code/": jsonResponse(CODE_REFUSED, 400),
    });
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");

    await enterCode("000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code isn't right or has run out. Check the email, or send yourself a new one.",
    );
    expect(currentStep()).toBe("2Enter your code");
  });

  it("sends a new code on request and says so", async () => {
    const fetchFn = happyBackend();
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");

    await userEvent.click(screen.getByRole("button", { name: "Send me a new code" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "A new code is on its way. It works for 30 minutes.",
    );
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/")).toHaveLength(2);
  });

  it("says what the password still needs, without asking the server", async () => {
    const fetchFn = happyBackend();
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose("kathmandu");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The password still needs a capital letter, a number and a symbol.",
    );
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/complete/")).toEqual([]);
  });

  it("says when the two passwords don't match", async () => {
    happyBackend();
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD, "Kathmandu!2027");

    expect(screen.getByRole("alert")).toHaveTextContent("The two passwords don't match.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows the rules the server says are unmet", async () => {
    backend({
      "/api/auth/password-reset/": jsonResponse(SENT, 202),
      "/api/auth/password-reset/code/": jsonResponse({ detail: "ok" }),
      "/api/auth/password-reset/complete/": jsonResponse(
        { detail: "…", unmet_rules: ["symbol"] },
        400,
      ),
    });
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The password still needs a symbol.",
    );
  });

  it("goes back to the code step when the code ran out meanwhile", async () => {
    backend({
      "/api/auth/password-reset/": jsonResponse(SENT, 202),
      "/api/auth/password-reset/code/": jsonResponse({ detail: "ok" }),
      "/api/auth/password-reset/complete/": jsonResponse(CODE_REFUSED, 400),
    });
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD);

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("That code isn't right or has run out.");
  });

  it("says when the password couldn't be saved", async () => {
    backend({
      "/api/auth/password-reset/": jsonResponse(SENT, 202),
      "/api/auth/password-reset/code/": jsonResponse({ detail: "ok" }),
      "/api/auth/password-reset/complete/": jsonResponse({}, 502),
    });
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("asks for the number from the app when two-step login is on: a reset never skips it", async () => {
    const fetchFn = backend({
      "/api/auth/password-reset/": jsonResponse(SENT, 202),
      "/api/auth/password-reset/code/": jsonResponse({ detail: "That code is right." }),
      "/api/auth/password-reset/complete/": jsonResponse({ two_factor: "verify" }),
      "/api/auth/two-factor/verify/": jsonResponse({ context: CONTEXT }),
    });
    render(<ForgotPassword />);
    await sendCodeTo("sita@acme.test");
    await enterCode("123456");
    await choose("Kathmandu!2026");

    expect(await screen.findByRole("heading", { name: "Two-step login" })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("6-digit number"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/");
    });
    expect(bodiesSentTo(fetchFn, "/api/auth/two-factor/verify/")).toEqual([{ code: "654321" }]);
  });
});

const PLATFORM_CHANGED = { detail: "Your password was changed. Log in with your new password." };

function platformBackend(confirm: Response = jsonResponse(PLATFORM_CHANGED)) {
  return backend({
    "/api/platform/auth/password-reset/": jsonResponse(SENT, 202),
    "/api/platform/auth/password-reset/verify/": jsonResponse({ detail: "That code is right." }),
    "/api/platform/auth/password-reset/confirm/": confirm,
  });
}

describe("ForgotPassword on the Platform (issue 63)", () => {
  it("shows the same three steps, with Back to log in going to the Platform login", () => {
    render(<ForgotPassword side="platform" />);

    expect(screen.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    expect(currentStep()).toBe("1Your email");
    expect(screen.getByRole("link", { name: "Back to log in" })).toHaveAttribute(
      "href",
      "/platform/login",
    );
  });

  it("goes from email to code to password on the Platform's endpoints, then to its login", async () => {
    const fetchFn = platformBackend();
    render(<ForgotPassword side="platform" />);

    await sendCodeTo("ops@platform.test");
    await enterCode("123 456");
    await screen.findByRole("heading", { name: "Choose your password" });
    await choose(GOOD_PASSWORD);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/platform/login?password=changed");
    });
    expect(bodiesSentTo(fetchFn, "/api/platform/auth/password-reset/")).toEqual([
      { email: "ops@platform.test" },
    ]);
    expect(bodiesSentTo(fetchFn, "/api/platform/auth/password-reset/verify/")).toEqual([
      { email: "ops@platform.test", code: "123456" },
    ]);
    expect(bodiesSentTo(fetchFn, "/api/platform/auth/password-reset/confirm/")).toEqual([
      { email: "ops@platform.test", code: "123456", new_password: GOOD_PASSWORD },
    ]);
    expect(fetchFn.mock.calls.some(([path]) => path.startsWith("/api/auth/"))).toBe(false);
  });

  it("shows the rules the server says are unmet and stays on the password step", async () => {
    platformBackend(jsonResponse({ detail: "no", unmet_rules: ["symbol"] }, 400));
    render(<ForgotPassword side="platform" />);
    await sendCodeTo("ops@platform.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent(/symbol/i);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("goes back to the code step when the code ran out meanwhile", async () => {
    platformBackend(jsonResponse(CODE_REFUSED, 400));
    render(<ForgotPassword side="platform" />);
    await sendCodeTo("ops@platform.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD);

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(/code/i);
  });

  it("refuses an answer of the wrong shape with a short message", async () => {
    platformBackend(jsonResponse({ access: "a-token" }));
    render(<ForgotPassword side="platform" />);
    await sendCodeTo("ops@platform.test");
    await enterCode("123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choose(GOOD_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe.each(THEME_CASES)("ForgotPassword on the Platform in the $name Theme", ({ mode }) => {
  beforeEach(() => {
    applyThemeCase(mode);
  });
  afterEach(resetTheme);

  it("labels every field and shows the step it is on", async () => {
    platformBackend();
    render(<ForgotPassword side="platform" />);
    expect(screen.getByLabelText("Email")).toBeVisible();

    await sendCodeTo("ops@platform.test");

    expect(screen.getByLabelText("Code")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send me a new code" })).toBeVisible();
    expect(currentStep()).toBe("2Enter your code");
  });
});

describe("ForgotPassword from the login's password step (issue 66)", () => {
  it("shows the email as text, not a field, with a way back to the login", async () => {
    const fetchFn = happyBackend();
    render(<ForgotPassword knownEmail="sita@acme.test" />);

    expect(screen.getByText("sita@acme.test")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Use a different email" })).toHaveAttribute(
      "href",
      "/login",
    );

    await userEvent.click(screen.getByRole("button", { name: "Send the code" }));

    await screen.findByRole("heading", { name: "Check your email" });
    expect(bodiesSentTo(fetchFn, "/api/auth/password-reset/")).toEqual([
      { email: "sita@acme.test" },
    ]);
  });

  it("goes back to the Platform login on the Platform", () => {
    platformBackend();
    render(<ForgotPassword side="platform" knownEmail="ops@platform.test" />);

    expect(screen.getByRole("link", { name: "Use a different email" })).toHaveAttribute(
      "href",
      "/platform/login",
    );
  });
});
