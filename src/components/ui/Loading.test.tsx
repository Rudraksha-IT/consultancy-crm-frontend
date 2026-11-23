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
    expect(rules).toMatch(/@keyframes logo-loader-petals \{[\s\S]*?scale\(0\.32\)/);
    expect(rules).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*\[data-petal\][\s\S]*animation: none/,
    );
  });

  it("draws in the logo's own red, a lighter one in dark mode", () => {
    expect(GLOBALS_CSS).toMatch(/:root \{[^}]*--mark: #8b0a1a/);
    expect(GLOBALS_CSS).toMatch(/:root\[data-theme="dark"\] \{[^}]*--mark: #f49aa3/);
  });
});
