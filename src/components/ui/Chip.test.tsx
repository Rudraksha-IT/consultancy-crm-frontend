import { render, screen } from "@testing-library/react";

import { Chip } from "./Chip";

describe("Chip", () => {
  it("shows its word with a dot", () => {
    render(<Chip tone="warn">Not assigned</Chip>);

    expect(screen.getByText("Not assigned")).toBeInTheDocument();
  });

  it("never spills out of a narrow cell: it shrinks and cuts its word with … (list tidy-ups 17)", () => {
    render(<Chip tone="warn">Not assigned</Chip>);

    const word = screen.getByText("Not assigned");
    expect(word).toHaveClass("truncate");
    expect(word.parentElement).toHaveClass("max-w-full");
  });
});
