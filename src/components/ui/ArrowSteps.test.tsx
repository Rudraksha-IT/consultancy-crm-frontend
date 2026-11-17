import { render, screen, within } from "@testing-library/react";

import { Stage } from "@/constants/stages";

import { ArrowSteps } from "./ArrowSteps";

function states(): (string | undefined)[] {
  return within(screen.getByRole("list"))
    .getAllByRole("listitem")
    .map((step) => step.dataset.state);
}

describe("arrow steps on Home", () => {
  it("fill the steps behind the Stage and mark the Stage itself", () => {
    render(<ArrowSteps stage={Stage.Applying} />);

    expect(states()).toEqual(["past", "past", "now", "next", "next"]);
  });

  it("at the Visa Stage, like any other: the steps behind it light, Visa highlighted", () => {
    render(<ArrowSteps stage={Stage.Visa} />);

    expect(states()).toEqual(["past", "past", "past", "past", "now"]);
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(steps.at(-1)).toHaveClass("bg-accent");
    expect(steps[0]).not.toHaveClass("bg-accent");
  });

  it("turn every step dark green once the visa is granted", () => {
    render(<ArrowSteps stage={Stage.Visa} isDone />);

    expect(states()).toEqual(["done", "done", "done", "done", "done"]);
    for (const step of within(screen.getByRole("list")).getAllByRole("listitem")) {
      expect(step).toHaveClass("bg-accent", "text-accent-ink");
    }
  });
});
