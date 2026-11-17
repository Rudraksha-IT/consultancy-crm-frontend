import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LABELS } from "@/constants/messages";
import { jsonResponse } from "@/lib/api/test-helpers";

import { Join } from "./Join";

const navigate = vi.hoisted(() => vi.fn<(path: string) => void>());
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => navigate }));

const CONTEXT = {
  staff: {
    id: 7,
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
const CODE_REFUSED = { detail: "That code isn't right or has run out." };
const GOOD_PASSWORD = "Kathmandu!2026";

type Route = Record<string, Response | (() => Response)>;

function backend(routes: Route) {
  const fetchFn = vi.fn((path: string, init?: RequestInit) => {
    const answer = init === undefined ? undefined : routes[path];
    const response = typeof answer === "function" ? answer() : answer;
    return Promise.resolve(response?.clone() ?? jsonResponse({}, 404));
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

function happyBackend(extra: Route = {}) {
  return backend({
    "/api/consultancy/": jsonResponse({ name: "Acme Education" }),
    "/api/auth/join/": jsonResponse({ detail: "If that email…" }, 202),
    "/api/auth/join/code/": jsonResponse({ detail: "That code is right." }),
    "/api/auth/join/complete/": jsonResponse({ context: CONTEXT }),
    ...extra,
  });
}

function bodiesSentTo(fetchFn: ReturnType<typeof backend>, path: string): unknown[] {
  return fetchFn.mock.calls
    .filter(([sentTo]) => sentTo === path)
    .map(([, init]) => {
      const body = init?.body;
      if (typeof body !== "string") throw new Error("expected a JSON body");
      const parsed: unknown = JSON.parse(body);
      return parsed;
    });
}

function currentStep(): string {
  const steps = screen.getByRole("list", { name: "Steps" });
  const current = within(steps)
    .getAllByRole("listitem")
    .find((item) => item.getAttribute("aria-current") === "step");
  return current?.textContent ?? "";
}

async function enterEmailAndCode(email: string, code: string): Promise<void> {
  if (email !== "") await userEvent.type(screen.getByLabelText("Email"), email);
  if (code !== "") await userEvent.type(screen.getByLabelText("Code"), code);
  await userEvent.click(screen.getByRole("button", { name: "Check the code" }));
}

async function choosePassword(password: string, confirmation = password): Promise<void> {
  await userEvent.type(screen.getByLabelText("New password"), password);
  await userEvent.type(screen.getByLabelText("Confirm new password"), confirmation);
  await userEvent.click(screen.getByRole("button", { name: "Save password and log in" }));
}

describe("Join", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it("asks for the work email and code first, naming the office", async () => {
    happyBackend();

    render(<Join />);

    expect(await screen.findByRole("heading", { name: "Join Acme Education" })).toBeInTheDocument();
    expect(currentStep()).toContain("Enter your code");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByText("It works for 30 minutes.")).toBeInTheDocument();
  });

  it("checks the code, then lets them choose a password and logs them in", async () => {
    const fetchFn = happyBackend();
    render(<Join />);

    await enterEmailAndCode(" sita@acme.test ", "123 456");
    await screen.findByRole("heading", { name: "Choose your password" });
    expect(screen.getByText("You'll use it with sita@acme.test to log in.")).toBeInTheDocument();
    await choosePassword(GOOD_PASSWORD);

    expect(bodiesSentTo(fetchFn, "/api/auth/join/code/")).toEqual([
      { email: "sita@acme.test", code: "123456" },
    ]);
    expect(bodiesSentTo(fetchFn, "/api/auth/join/complete/")).toEqual([
      { email: "sita@acme.test", code: "123456", password: GOOD_PASSWORD },
    ]);
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it.each([
    ["", "123456", "Enter your email."],
    ["sita@acme.test", "123", "Enter the 6-digit code."],
  ])("refuses an incomplete step without calling the server", async (email, code, message) => {
    const fetchFn = happyBackend();
    render(<Join />);

    await enterEmailAndCode(email, code);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(bodiesSentTo(fetchFn, "/api/auth/join/code/")).toEqual([]);
  });

  it("says when the code is refused", async () => {
    happyBackend({ "/api/auth/join/code/": jsonResponse(CODE_REFUSED, 400) });
    render(<Join />);

    await enterEmailAndCode("sita@acme.test", "000000");

    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right");
    expect(currentStep()).toContain("Enter your code");
  });

  it("sends a new code to the email typed", async () => {
    const fetchFn = happyBackend();
    render(<Join />);

    await userEvent.type(screen.getByLabelText("Email"), "sita@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Send me a new code" }));

    expect(await screen.findByRole("status")).toHaveTextContent("a new code is on its way");
    expect(bodiesSentTo(fetchFn, "/api/auth/join/")).toEqual([{ email: "sita@acme.test" }]);
  });

  it("needs an email before sending a new code", async () => {
    happyBackend();
    render(<Join />);

    await userEvent.click(screen.getByRole("button", { name: "Send me a new code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your email.");
  });

  it("refuses a weak or mismatched password on the screen", async () => {
    const fetchFn = happyBackend();
    render(<Join />);
    await enterEmailAndCode("sita@acme.test", "123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choosePassword("kathmandu");
    expect(await screen.findByRole("alert")).toHaveTextContent("The password still needs");

    await userEvent.clear(screen.getByLabelText("New password"));
    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await choosePassword(GOOD_PASSWORD, "Kathmandu!2027");
    expect(await screen.findByRole("alert")).toHaveTextContent("The two passwords don't match.");
    expect(bodiesSentTo(fetchFn, "/api/auth/join/complete/")).toEqual([]);
  });

  it("shows the rules the server says are unmet", async () => {
    happyBackend({
      "/api/auth/join/complete/": jsonResponse({ detail: "…", unmet_rules: ["symbol"] }, 400),
    });
    render(<Join />);
    await enterEmailAndCode("sita@acme.test", "123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choosePassword(GOOD_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent("a symbol");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("goes back to the code step when the code ran out meanwhile", async () => {
    happyBackend({ "/api/auth/join/complete/": jsonResponse(CODE_REFUSED, 400) });
    render(<Join />);
    await enterEmailAndCode("sita@acme.test", "123456");
    await screen.findByRole("heading", { name: "Choose your password" });

    await choosePassword(GOOD_PASSWORD);

    expect(await screen.findByRole("alert")).toHaveTextContent("That code isn't right");
    expect(currentStep()).toContain("Enter your code");
    expect(screen.getByLabelText("Email")).toHaveValue("sita@acme.test");
  });

  it("says something went wrong when the server fails", async () => {
    happyBackend({ "/api/auth/join/code/": jsonResponse({}, 502) });
    render(<Join />);

    await enterEmailAndCode("sita@acme.test", "123456");

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("is titled plainly while the office is unknown", () => {
    happyBackend({ "/api/consultancy/": jsonResponse({}, 404) });

    render(<Join />);

    expect(screen.getByRole("heading", { level: 1, name: "Join" })).toBeInTheDocument();
  });

  it("goes on to two-step login setup when it's on for them: a Code never skips it", async () => {
    const SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const fetchFn = happyBackend({
      "/api/auth/join/complete/": jsonResponse({ two_factor: "setup" }),
      "/api/auth/two-factor/setup/": jsonResponse({
        uri: `otpauth://totp/Consultancy%20CRM:sita?secret=${SECRET}&issuer=Consultancy%20CRM`,
      }),
    });
    render(<Join />);
    await enterEmailAndCode("sita@acme.test", "123456");

    await choosePassword(GOOD_PASSWORD);

    expect(await screen.findByRole("heading", { name: "Two-step login" })).toBeInTheDocument();
    expect(await screen.findByText("JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(bodiesSentTo(fetchFn, "/api/auth/two-factor/setup/")).toEqual([{}]);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("Join on the Platform (issue 65)", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  function platformBackend(complete: Response = jsonResponse({ detail: "Your password is set." })) {
    return backend({
      "/api/platform/auth/join/": jsonResponse({ detail: "If that email…" }, 202),
      "/api/platform/auth/join/verify/": jsonResponse({ detail: "That code is right." }),
      "/api/platform/auth/join/complete/": complete,
    });
  }

  it("is titled for the product and goes back to the Platform login", () => {
    platformBackend();
    render(<Join side="platform" />);

    expect(
      screen.getByRole("heading", { level: 1, name: `Join ${LABELS.productName}` }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to log in" })).toHaveAttribute(
      "href",
      "/platform/login",
    );
  });

  it("checks the code and sets the password on the Platform's endpoints, then opens its login", async () => {
    const fetchFn = platformBackend();
    render(<Join side="platform" />);

    await enterEmailAndCode("rita@platform.test", "123 456");
    await screen.findByRole("heading", { name: "Choose your password" });
    await choosePassword(GOOD_PASSWORD);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/platform/login?password=set");
    });
    expect(bodiesSentTo(fetchFn, "/api/platform/auth/join/verify/")).toEqual([
      { email: "rita@platform.test", code: "123456" },
    ]);
    expect(bodiesSentTo(fetchFn, "/api/platform/auth/join/complete/")).toEqual([
      { email: "rita@platform.test", code: "123456", new_password: GOOD_PASSWORD },
    ]);
    expect(fetchFn.mock.calls.some(([path]) => path.startsWith("/api/auth/"))).toBe(false);
    expect(fetchFn.mock.calls.some(([path]) => path === "/api/consultancy/")).toBe(false);
  });

  it("sends a new code from the Platform", async () => {
    const fetchFn = platformBackend();
    render(<Join side="platform" />);

    await userEvent.type(screen.getByLabelText("Email"), "rita@platform.test");
    await userEvent.click(screen.getByRole("button", { name: "Send me a new code" }));

    expect(await screen.findByRole("status")).toBeVisible();
    expect(bodiesSentTo(fetchFn, "/api/platform/auth/join/")).toEqual([
      { email: "rita@platform.test" },
    ]);
  });
});

describe("Join after the email step (issue 66)", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it("shows the email above, says a new code was sent, and asks only for the code", async () => {
    const fetchFn = happyBackend();
    render(<Join knownEmail="new@acme.test" codeSent />);

    expect(screen.getByText("new@acme.test")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Email" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("We've emailed you a new 6-digit code.");
    expect(screen.getByRole("link", { name: "Use a different email" })).toHaveAttribute(
      "href",
      "/login",
    );

    await userEvent.type(screen.getByLabelText("Code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Check the code" }));

    await screen.findByRole("heading", { name: "Choose your password" });
    expect(bodiesSentTo(fetchFn, "/api/auth/join/code/")).toEqual([
      { email: "new@acme.test", code: "123456" },
    ]);
  });

  it("sends a new code to the known email", async () => {
    const fetchFn = happyBackend();
    render(<Join knownEmail="new@acme.test" />);

    await userEvent.click(screen.getByRole("button", { name: "Send me a new code" }));

    await waitFor(() => {
      expect(bodiesSentTo(fetchFn, "/api/auth/join/")).toEqual([{ email: "new@acme.test" }]);
    });
  });

  it("goes back to the Platform login from the Platform's Join", () => {
    happyBackend();
    render(<Join side="platform" knownEmail="rita@platform.test" />);

    expect(screen.getByRole("link", { name: "Use a different email" })).toHaveAttribute(
      "href",
      "/platform/login",
    );
  });
});
