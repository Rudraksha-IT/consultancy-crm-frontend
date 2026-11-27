import { render, screen } from "@testing-library/react";

import { Priority } from "@/constants/priority";

import { PriorityWord } from "./PriorityWord";

function dot(word: string): Element | null | undefined {
  return screen.getByText(word).firstElementChild;
}

describe("a Priority's dot (ticket 21: colour means one thing)", () => {
  it("is a hollow ring for Normal, never the accent", () => {
    render(<PriorityWord priority={Priority.Normal} />);

    expect(dot("Normal")).toHaveClass("border-2", "border-ink-3");
    expect(dot("Normal")?.className).not.toMatch(/accent|(^|\s)bg-/);
  });

  it("is red only for High", () => {
    render(<PriorityWord priority={Priority.High} />);

    expect(dot("High")).toHaveClass("bg-bad");
  });

  it("is a quiet ring for Low", () => {
    render(<PriorityWord priority={Priority.Low} />);

    expect(dot("Low")).toHaveClass("border", "border-rule-2");
    expect(dot("Low")?.className).not.toMatch(/(^|\s)bg-/);
  });

  it("always writes the word beside the dot", () => {
    render(<PriorityWord priority={Priority.High} />);

    expect(screen.getByText("High")).toBeVisible();
    expect(dot("High")).toHaveAttribute("aria-hidden", "true");
  });
});
