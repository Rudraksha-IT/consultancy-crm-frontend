import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { applyThemeCase, resetTheme, THEME_CASES } from "@/test/themes";

import { UnexpectedError } from "./UnexpectedError";

describe.each(THEME_CASES)("UnexpectedError in the $name Theme", ({ config, mode }) => {
  beforeEach(() => {
    applyThemeCase(config, mode);
  });

  afterEach(() => {
    resetTheme();
  });

  it("shows the message and the reference to quote, as an alert", () => {
    render(<UnexpectedError reference="2417294843" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong.");
    expect(alert).toHaveTextContent("Reference: 2417294843");
  });

  it("shows the message alone without a reference", () => {
    render(<UnexpectedError reference={undefined} />);

    expect(screen.getByRole("alert")).toHaveTextContent(/^Something went wrong\.$/);
    expect(screen.queryByText(/Reference/)).not.toBeInTheDocument();
  });

  it("shows a reference as text, never as markup", () => {
    render(<UnexpectedError reference="<b>x</b>" />);

    expect(screen.getByText("Reference: <b>x</b>")).toBeInTheDocument();
  });

  it("offers its action", async () => {
    const retry = vi.fn();
    render(
      <UnexpectedError
        reference="r"
        action={
          <button type="button" onClick={retry}>
            Try again
          </button>
        }
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(retry).toHaveBeenCalledOnce();
  });
});
