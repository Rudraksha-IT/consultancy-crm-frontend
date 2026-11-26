import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";

import { Stage } from "@/constants/stages";

import { Thread } from "./Thread";

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function beads(): HTMLElement[] {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

function states(): (string | undefined)[] {
  return beads().map((bead) => bead.dataset.state);
}

describe("the thread: a Student's journey as five beads (ticket 21)", () => {
  it("marks the beads reached, the current one and the ones to come", () => {
    render(<Thread stage={Stage.Applying} />);

    expect(states()).toEqual(["past", "past", "now", "next", "next"]);
  });

  it("gives each bead its own shade, Lead to Visa", () => {
    render(<Thread stage={Stage.Visa} />);

    expect(states()).toEqual(["past", "past", "past", "past", "now"]);
    expect(beads().map((bead) => bead.dataset.bead)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("fills every bead once the visa is granted", () => {
    render(<Thread stage={Stage.Visa} isDone />);

    expect(states()).toEqual(["past", "past", "past", "past", "past"]);
  });

  it("marks nothing for a Lost Student and says Lost", () => {
    render(<Thread stage={Stage.Lost} />);

    expect(states().every((state) => state === "next")).toBe(true);
    expect(screen.getByText("Lost")).toBeInTheDocument();
  });

  it("names the Stage for screen readers", () => {
    render(<Thread stage={Stage.Offer} />);

    expect(screen.getByRole("list", { name: "Stage: Offer" })).toBeInTheDocument();
  });

  it("always writes the Stage's name beside the beads, so the colour never stands alone", () => {
    render(<Thread stage={Stage.Offer} />);

    const word = screen.getByText("Offer");
    expect(word).toBeVisible();
    // Screen readers hear the name once, from the list.
    expect(word).toHaveAttribute("aria-hidden", "true");
    expect(beads().every((bead) => bead.textContent === "")).toBe(true);
  });

  it("names each bead's Stage on hover", () => {
    render(<Thread stage={Stage.Lead} />);

    expect(beads().map((bead) => bead.title)).toEqual([
      "Lead",
      "Counselling",
      "Applying",
      "Offer",
      "Visa",
    ]);
  });

  it("keeps room round the beads, so the current bead's ring is never cut off", () => {
    const thread = /\[data-thread\] \{[^}]*\}/.exec(GLOBALS_CSS)?.[0] ?? "";

    expect(thread).toContain("padding: 0.4375rem;");
    expect(thread).toContain("overflow: visible;");
    expect(GLOBALS_CSS).toMatch(
      /\[data-state="now"\]::after \{\s*box-shadow:\s*0 0 0 2px var\(--paper\),\s*0 0 0 4px var\(--bead\);/,
    );
  });
});
