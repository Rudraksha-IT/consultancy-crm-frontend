import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./Button";
import { ButtonLink } from "./ButtonLink";
import { IconButton } from "./IconButton";

describe("Button", () => {
  it("runs its action when pressed", async () => {
    const handlePress = vi.fn();
    render(<Button onClick={handlePress}>Save visit</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save visit" }));

    expect(handlePress).toHaveBeenCalledOnce();
  });

  it("submits forms only when asked to", () => {
    render(
      <>
        <Button>Cancel</Button>
        <Button type="submit">Save</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "submit");
  });

  it("shows the loading label and can't be pressed while loading", async () => {
    const handlePress = vi.fn();
    render(
      <Button isLoading loadingLabel="Saving…" onClick={handlePress}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });

    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(handlePress).not.toHaveBeenCalled();
  });

  it("can't be pressed when disabled", () => {
    render(<Button isDisabled>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows an icon before its label without changing its name", () => {
    render(<Button icon="plus">New class</Button>);

    expect(screen.getByRole("button", { name: "New class" })).toBeInTheDocument();
  });
});

describe("ButtonLink", () => {
  it("is a link that looks like a button", () => {
    render(
      <ButtonLink href="/platform/consultancies/new" variant="primary" icon="plus">
        New consultancy
      </ButtonLink>,
    );

    expect(screen.getByRole("link", { name: "New consultancy" })).toHaveAttribute(
      "href",
      "/platform/consultancies/new",
    );
  });
});

describe("IconButton", () => {
  it("is named by its label", async () => {
    const handlePress = vi.fn();
    render(<IconButton icon="bell" label="Notifications" onClick={handlePress} />);

    await userEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(handlePress).toHaveBeenCalledOnce();
  });

  it("can show that it controls something open", () => {
    render(<IconButton icon="burger" label="Open the menu" isExpanded={false} controls="nav" />);

    const button = screen.getByRole("button", { name: "Open the menu" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "nav");
  });
});
