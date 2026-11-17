import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { backend, callsTo, on } from "@/test/backend";
import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { AddAdminDialog } from "./AddAdminDialog";

const OFFICE = { id: 3, name: "Acme Education" };
const PATH = "/api/platform/consultancies/3/admins/";
const INVITED = { name: "Sita Sharma", email: "sita@acme.test", status: "invited" };

function renderDialog() {
  const onAdded = vi.fn<(name: string) => void>();
  const onClose = vi.fn<() => void>();
  render(<AddAdminDialog office={OFFICE} onAdded={onAdded} onClose={onClose} />);
  return { onAdded, onClose };
}

async function fillAndSend(name = "Sita Sharma", email = "sita@acme.test"): Promise<void> {
  const user = userEvent.setup();
  if (name !== "") await user.type(screen.getByLabelText("Name"), name);
  if (email !== "") await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Send invite" }));
}

describe("AddAdminDialog (issue 64)", () => {
  it("names the office, moves focus to the name and explains the invite", () => {
    renderDialog();

    expect(screen.getByRole("dialog", { name: "Add an admin to Acme Education" })).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(
      screen.getByText(
        "We'll email them a 6-digit code. They use it to choose their own password.",
      ),
    ).toBeVisible();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("invites the Admin and says who was invited", async () => {
    const fetchFn = backend(on("POST", PATH, INVITED, 201));
    const { onAdded } = renderDialog();

    await fillAndSend();

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalledWith("Sita Sharma");
    });
    const [call] = callsTo(fetchFn, "POST", PATH);
    expect(call?.[1]?.body).toBe(JSON.stringify({ name: "Sita Sharma", email: "sita@acme.test" }));
  });

  it("asks for both fields before sending anything", async () => {
    const fetchFn = backend();
    renderDialog();

    await fillAndSend("", "");

    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Enter their name.");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter their email.");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("shows the server's reasons under the fields", async () => {
    backend(on("POST", PATH, { email: ["Someone here already uses this email."] }, 400));
    const { onAdded } = renderDialog();

    await fillAndSend();

    expect(await screen.findByLabelText("Email")).toHaveAccessibleDescription(
      "Someone here already uses this email.",
    );
    expect(onAdded).not.toHaveBeenCalled();
  });

  it("shows why the office can't take an Admin in a banner", async () => {
    backend(on("POST", PATH, { detail: "A Terminated Consultancy can't be changed." }, 400));
    renderDialog();

    await fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A Terminated Consultancy can't be changed.",
    );
  });

  it("shows a general message when sending fails", async () => {
    backend();
    renderDialog();

    await fillAndSend();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't send the invite. Please try again.",
    );
  });

  it("keeps a name shaped like code as text", async () => {
    backend(on("POST", PATH, { name: ["Enter a name of 1 to 200 letters."] }, 400));
    renderDialog();

    await fillAndSend("<b>Sita</b>");

    expect(screen.getByLabelText("Name")).toHaveValue("<b>Sita</b>");
    expect(document.querySelector("[role=dialog] b")).toBeNull();
  });

  it("closes with Escape and with Cancel", async () => {
    const { onClose } = renderDialog();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe.each(THEME_CASES)("AddAdminDialog in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });
  afterEach(resetTheme);

  it("labels both fields and both buttons", () => {
    renderDialog();

    expect(screen.getByLabelText("Name")).toBeVisible();
    expect(screen.getByLabelText("Email")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send invite" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
