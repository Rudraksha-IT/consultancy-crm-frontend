import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PasswordField } from "./PasswordField";

function rulesList(): HTMLElement {
  return screen.getByRole("list", { name: "Password rules" });
}

describe("PasswordField", () => {
  it("shows the rules as one line before typing", () => {
    render(<PasswordField />);

    expect(
      screen.getByText(
        "At least 8 characters, with a capital letter, a small letter, a number and a symbol.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Password rules" })).not.toBeInTheDocument();
  });

  it("turns the rules into a checklist that ticks off while typing", async () => {
    render(<PasswordField />);

    await userEvent.type(screen.getByLabelText("New password"), "abcD1");

    const met = within(rulesList())
      .getAllByRole("listitem")
      .map((item) => item.dataset.met);
    expect(met).toEqual(["false", "true", "true", "true", "false"]);
    expect(within(rulesList()).getByText("A capital letter (A–Z)")).toBeInTheDocument();
  });

  it("says whether the confirmation matches", async () => {
    render(<PasswordField />);
    await userEvent.type(screen.getByLabelText("New password"), "Kathmandu!2026");

    await userEvent.type(screen.getByLabelText("Confirm new password"), "Kathmandu");
    expect(screen.getByLabelText("Confirm new password")).toHaveAccessibleDescription(
      "They don't match yet",
    );

    await userEvent.type(screen.getByLabelText("Confirm new password"), "!2026");
    expect(screen.getByLabelText("Confirm new password")).toHaveAccessibleDescription("Both match");
  });

  it("says nothing about matching before the confirmation is typed", () => {
    render(<PasswordField />);

    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
  });

  it("uses its own label and posts both values under their names", async () => {
    render(
      <form aria-label="Choose">
        <PasswordField label="Password" name="password" confirmationName="password_again" />
      </form>,
    );

    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.type(screen.getByLabelText("Confirm password"), "y");

    const form = screen.getByRole("form", { name: "Choose" });
    if (!(form instanceof HTMLFormElement)) throw new Error("not a form");
    const data = new FormData(form);
    expect(data.get("password")).toBe("x");
    expect(data.get("password_again")).toBe("y");
  });
});
