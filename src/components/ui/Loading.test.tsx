import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";

import { Button } from "./Button";
import { Loading } from "./Loading";

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function loaderRules(): string {
  const start = GLOBALS_CSS.indexOf("The logo loader");
  return GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("End of the logo loader", start));
}

describe("loading shows the product's logo (list tidy-ups 06)", () => {
  it("says Loading… to everyone and draws the logo's 8 petals and its spokes", () => {
    render(<Loading />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading…");
    const mark = status.querySelector("svg");
    expect(mark).toHaveAttribute("aria-hidden", "true");
    expect(mark?.querySelectorAll("[data-petal]")).toHaveLength(8);
    expect(mark?.querySelector("[data-spokes]")).not.toBeNull();
  });

  it("breathes petals and lines as one, the lines reaching near the petals (list tidy-ups 19)", () => {
    render(<Loading />);

    const petals = document.querySelectorAll("[data-breathe] > [data-petal]");
    const lines = document.querySelector("[data-breathe] > [data-spokes]");
    expect(petals).toHaveLength(8);
    expect([...petals].filter((petal) => petal.hasAttribute("style"))).toEqual([]);
    expect(lines).toHaveAttribute("d", expect.stringContaining("M18 0L117 0"));
    expect(lines?.getAttribute("d")?.split("M")).toHaveLength(9);
  });

  it("comes in a page size and a panel size, panel by default", () => {
    render(
      <>
        <Loading />
        <Loading size="page" />
      </>,
    );

    const [panel, page] = screen.getAllByRole("status");
    expect(panel?.querySelector("svg")).toHaveAttribute("data-size", "panel");
    expect(page?.querySelector("svg")).toHaveAttribute("data-size", "page");
  });

  it("shows the small logo in a button that is working, beside its word", () => {
    render(
      <Button isLoading loadingLabel="Saving…">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving…" });
    expect(within(button).getByText("Saving…")).toBeInTheDocument();
    expect(button.querySelector("svg[data-size=button]")).not.toBeNull();
  });

  it("turns, closes the petals into a small flower and opens them, but only turns with reduced motion", () => {
    const rules = loaderRules();

    expect(rules).toMatch(/@keyframes logo-loader-turn/);
    expect(rules).toMatch(
      /@keyframes logo-loader-breathe \{[\s\S]*?scale\(0\.49\)[\s\S]*?scale\(1\.05\)/,
    );
    expect(rules).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*\.logo-loader-breathe[\s\S]*animation: none/,
    );
  });

  it("turns at one steady speed, never stopping, and the lines never fade (list tidy-ups 19)", () => {
    const rules = loaderRules();

    expect(rules).toMatch(
      /\.logo-loader-turn \{[^}]*animation: logo-loader-turn 2s linear infinite/,
    );
    expect(rules).toMatch(/\.logo-loader-breathe \{[^}]*animation: logo-loader-breathe 2s /);
    expect(rules).not.toMatch(/opacity/);
  });

  it("turns in place around the logo's centre, not rolling like a wheel", () => {
    const rules = loaderRules();

    expect(rules).toMatch(/\.logo-loader-turn,[^{]*\{[^}]*transform-origin: 0 0/);
    expect(rules).toMatch(/\.logo-loader-breathe[^{]*\{[^}]*transform-origin: 0 0/);
    expect(rules).not.toMatch(/transform-origin: 50% 50%/);
  });

  it("draws in the logo's own red, a lighter one in dark mode", () => {
    expect(GLOBALS_CSS).toMatch(/:root \{[^}]*--mark: #8b0a1a/);
    expect(GLOBALS_CSS).toMatch(/:root\[data-theme="dark"\] \{[^}]*--mark: #f49aa3/);
  });
});
