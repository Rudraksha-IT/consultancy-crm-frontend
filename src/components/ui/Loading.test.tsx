import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, screen, within } from "@testing-library/react";

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
    // The lines are 0.75 times the petals' width.
    expect(lines).toHaveAttribute("stroke-width", "7.5");
    expect(petals[0]).toHaveAttribute("stroke-width", "10");
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

  it("keeps every loader in step with the first one, which never moves (list tidy-ups 27)", () => {
    const first: { startTime: number | null } = { startTime: 140 };
    const later: { startTime: number | null } = { startTime: null };
    const timings = [first, later];
    Object.defineProperty(Element.prototype, "getAnimations", {
      configurable: true,
      value: vi.fn(() => [timings.shift()].filter(Boolean)),
    });

    render(<Loading size="page" />);
    render(<Loading />);

    expect(first.startTime).toBe(140);
    expect(later.startTime).toBe(140);
    Reflect.deleteProperty(Element.prototype, "getAnimations");
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

describe("one loader in the middle while a page loads (list tidy-ups 27)", () => {
  function App({ page = "/", loading }: { page?: string; loading: readonly string[] }) {
    return (
      <PageLoadProvider page={page}>
        <h1>Page</h1>
        {loading.map((box) => (
          <Loading key={`${page}-${box}`} />
        ))}
      </PageLoadProvider>
    );
  }
  const cover = () => document.querySelector("[data-reload-cover]");
  const middle = () => document.querySelector("[data-page-loader]");
  const boxMarks = () => [...document.querySelectorAll("svg[data-size=panel]")];
  const shownBoxMarks = () => boxMarks().filter((mark) => !mark.closest(".invisible"));
  const tick = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockReturnValue(300);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("covers the app after a reload, the page loading behind it, its boxes showing no loader", () => {
    render(<App loading={["progress", "money"]} />);

    expect(cover()).toHaveClass("fixed", "inset-0", "bg-canvas");
    expect(cover()?.querySelector("svg")).toHaveAttribute("data-size", "page");
    expect(screen.getByRole("heading", { name: "Page" })).toBeInTheDocument();
    expect(boxMarks()).toHaveLength(2);
    expect(shownBoxMarks()).toEqual([]);
  });

  it("lifts the cover 2 s after the reload, the one loader staying while boxes still load", () => {
    const { rerender } = render(<App loading={["progress", "money"]} />);
    tick(1_600);
    expect(cover()).not.toBeNull();
    tick(200);

    expect(cover()).toBeNull();
    expect(middle()).not.toBeNull();
    expect(shownBoxMarks()).toEqual([]);

    rerender(<App loading={["money"]} />);
    tick(0);
    expect(middle()).not.toBeNull();
    rerender(<App loading={[]} />);
    tick(0);
    expect(middle()).toBeNull();
  });

  it("shows one loader in the middle on another page only after 1 s, the boxes none", () => {
    const { rerender } = render(<App loading={[]} />);
    tick(2_000);

    rerender(<App page="/students" loading={["list", "counts"]} />);
    expect(cover()).toBeNull();
    expect(middle()).toBeNull();
    tick(1_000);

    expect(middle()).not.toBeNull();
    expect(shownBoxMarks()).toEqual([]);
  });

  it("shows a box's own loader once its page has loaded, as for a tab inside the page", () => {
    const { rerender } = render(<App page="/documents" loading={["list"]} />);
    tick(2_000);
    rerender(<App page="/documents" loading={[]} />);
    tick(0);

    rerender(<App page="/documents" loading={["bin"]} />);

    expect(middle()).toBeNull();
    expect(shownBoxMarks()).toHaveLength(1);
  });

  it("never keeps the middle loader more than 8 s", () => {
    const { rerender } = render(<App loading={[]} />);
    tick(2_000);
    rerender(<App page="/students" loading={["stuck"]} />);

    tick(8_000);

    expect(middle()).toBeNull();
    expect(shownBoxMarks()).toHaveLength(1);
  });
});
