import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, waitFor, within } from "@testing-library/react";

import { Button } from "./Button";
import { Loading } from "./Loading";
import { PageLoadProvider } from "./pageLoad";

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

  it("puts a whole page's loader in the middle of the screen (list tidy-ups 21)", () => {
    render(
      <>
        <Loading />
        <Loading size="page" />
      </>,
    );

    const [panel, page] = screen.getAllByRole("status");
    expect(page).toHaveClass("fixed", "inset-0", "place-items-center", "pointer-events-none");
    expect(panel).not.toHaveClass("fixed");
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
    expect(rules).toMatch(/@keyframes logo-loader-breathe \{[\s\S]*?scale\(0\.49\)/);
    // No bounce: it opens straight back to full size (list tidy-ups 19).
    expect(rules).not.toMatch(/scale\(1\.0[1-9]\)/);
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

  it("keeps every loader on one clock, so a handover or overlap never jumps (list tidy-ups 27)", () => {
    vi.spyOn(performance, "now").mockReturnValue(12_345);
    render(
      <>
        <Loading />
        <Loading size="page" />
      </>,
    );

    const marks = screen.getAllByRole("status").map((one) => one.querySelector("svg"));
    expect(marks.map((mark) => mark?.style.getPropertyValue("--loader-sync"))).toEqual([
      "-345ms",
      "-345ms",
    ]);
    const rules = loaderRules();
    expect(rules).toMatch(/\.logo-loader-turn \{[^}]*animation-delay: var\(--loader-sync, 0s\)/);
    expect(rules).toMatch(/\.logo-loader-breathe \{[^}]*animation-delay: var\(--loader-sync, 0s\)/);
  });

  it("turns in place around the logo's centre, not rolling like a wheel", () => {
    const rules = loaderRules();

    expect(rules).toMatch(/\.logo-loader-turn,[^{]*\{[^}]*transform-origin: 0 0/);
    expect(rules).toMatch(/\.logo-loader-breathe[^{]*\{[^}]*transform-origin: 0 0/);
    expect(rules).not.toMatch(/transform-origin: 50% 50%/);
  });

  it("draws in the logo's own red, a lighter one in dark mode", () => {
    expect(GLOBALS_CSS).toMatch(/:root \{[^}]*--mark: #c8102e/);
    expect(GLOBALS_CSS).toMatch(/:root\[data-theme="dark"\] \{[^}]*--mark: #ff5263/);
  });
});

describe("a reload shows one loader, in the middle, until the page has something (list tidy-ups 27)", () => {
  function App({ page, loading }: { page: string; loading: readonly string[] }) {
    return (
      <PageLoadProvider>
        {loading.map((box) => (
          <Loading key={`${page}-${box}`} />
        ))}
      </PageLoadProvider>
    );
  }
  const sizes = () =>
    screen.getAllByRole("status").map((one) => one.querySelector("svg")?.getAttribute("data-size"));

  it("shows the boxes' loaders as the page's while nothing has loaded yet", () => {
    render(<App page="/" loading={["progress", "money"]} />);

    expect(sizes()).toEqual(["page", "page"]);
  });

  it("puts the rest in their boxes once one box has its data", async () => {
    const { rerender } = render(<App page="/" loading={["progress", "money"]} />);

    rerender(<App page="/" loading={["money"]} />);

    await waitFor(() => {
      expect(sizes()).toEqual(["panel"]);
    });
  });

  it("shows box loaders on the next page, as when moving between pages", async () => {
    const { rerender } = render(<App page="/" loading={["progress"]} />);
    rerender(<App page="/" loading={[]} />);
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    rerender(<App page="/students" loading={["list"]} />);

    await waitFor(() => {
      expect(sizes()).toEqual(["panel"]);
    });
  });

  it("keeps box loaders in their boxes outside the app", () => {
    render(<Loading />);

    expect(sizes()).toEqual(["panel"]);
  });
});
