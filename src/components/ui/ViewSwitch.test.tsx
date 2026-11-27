import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ViewSwitch } from "./ViewSwitch";

const OPTIONS = [
  { value: "board", label: "Board", icon: "batches" },
  { value: "list", label: "List", icon: "list" },
] as const;

describe("ViewSwitch", () => {
  it("names the group and marks the chosen view", () => {
    render(
      <ViewSwitch label="Show Students as" options={OPTIONS} value="list" onChange={vi.fn()} />,
    );

    const group = screen.getByRole("group", { name: "Show Students as" });
    expect(within(group).getByRole("button", { name: "List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(group).getByRole("button", { name: "Board" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("tells which view was picked, with the mouse or the keyboard", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ViewSwitch label="Show Students as" options={OPTIONS} value="list" onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Board" }));
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onChange.mock.calls).toEqual([["board"], ["list"]]);
  });

  it("keeps each choice 44 tall to tap", () => {
    render(
      <ViewSwitch label="Show Students as" options={OPTIONS} value="list" onChange={vi.fn()} />,
    );

    for (const button of screen.getAllByRole("button")) expect(button).toHaveClass("min-h-control");
  });
});
