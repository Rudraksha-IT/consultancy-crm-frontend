import { LABELS } from "@/constants/messages";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/test-helpers";
import { resetTheme } from "@/test/themes";

import { CentralLogin } from "./CentralLogin";

const SAME_ANSWER = { detail: "If this email belongs to an office, we've sent it a link." };
const SENT = "If this email belongs to an office, we've sent it a link.";

function answering(response: Response) {
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

async function lookUp(email: string): Promise<void> {
  const user = userEvent.setup();
  if (email !== "") await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Email me my offices" }));
}

afterEach(resetTheme);

describe("CentralLogin", () => {
  it("shows the product's brand, the title and one email field", () => {
    render(<CentralLogin />);

    expect(screen.getByRole("heading", { level: 2, name: LABELS.productName })).toBeInTheDocument();
    expect(screen.getByText("Staff login")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Find your office" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("sends the email and shows the same confirmation", async () => {
    const fetchFn = answering(jsonResponse(SAME_ANSWER, 202));
    render(<CentralLogin />);

    await lookUp(" sita@example.com ");

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/central-login/",
      expect.objectContaining({ body: JSON.stringify({ email: "sita@example.com" }) }),
    );
    expect(await screen.findByText(SENT)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Check your inbox");
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("never shows anything that came back from the server", async () => {
    answering(jsonResponse({ detail: "<b>Acme Education</b>" }, 202));
    render(<CentralLogin />);

    await lookUp("sita@example.com");

    expect(await screen.findByText(SENT)).toBeInTheDocument();
    expect(screen.queryByText(/Acme/)).not.toBeInTheDocument();
  });

  it("lets the person try another email", async () => {
    answering(jsonResponse(SAME_ANSWER, 202));
    render(<CentralLogin />);
    await lookUp("sita@example.com");

    await userEvent.setup().click(await screen.findByRole("button", { name: "Try another email" }));

    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByText(/Type your work email/)).toBeInTheDocument();
  });

  it("asks for an email before sending anything", async () => {
    const fetchFn = answering(jsonResponse(SAME_ANSWER, 202));
    render(<CentralLogin />);

    await lookUp("");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    [429, "Too many tries from here. Wait a few minutes and try again."],
    [400, "Enter a valid email, like name@example.com."],
    [502, "Something went wrong. Please try again."],
  ])("explains a %i refusal", async (status, message) => {
    answering(jsonResponse({ detail: "x" }, status));
    render(<CentralLogin />);

    await lookUp("sita@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("explains a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline")));
    render(<CentralLogin />);

    await lookUp("sita@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});
