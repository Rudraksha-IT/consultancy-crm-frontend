import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColourMode } from "@/lib/theme";

import { ThemeToggle } from "./ThemeToggle";

/** A browser that can animate and swap the whole screen in one fade. */
function canFade(): ReturnType<typeof vi.fn> {
  Object.defineProperty(Element.prototype, "animate", { value: vi.fn(), configurable: true });
  const startViewTransition = vi.fn((change: () => void) => {
    change();
    return { finished: Promise.resolve() };
  });
  Object.defineProperty(document, "startViewTransition", {
    value: startViewTransition,
    configurable: true,
  });
  return startViewTransition;
}

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, "animate");
  Reflect.deleteProperty(document, "startViewTransition");
  document.documentElement.removeAttribute("data-theme-fade");
});

describe("ThemeToggle", () => {
  it("swaps light and dark in one fade of the whole screen, wherever the button is (owner)", async () => {
    const startViewTransition = canFade();
    const onToggle = vi.fn();
    render(<ThemeToggle mode={ColourMode.Light} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("still switches where the browser can't fade", async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle mode={ColourMode.Dark} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("the light and dark fade (owner: smoother)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  const fade = css.slice(css.indexOf("Light and dark: one cross-fade"));

  it("lays the new screen over the old one, which stays put, so nothing dims half-way", () => {
    expect(fade).toMatch(/::view-transition-old\(root\) \{\s*animation: none;/);
    expect(fade).toMatch(
      /::view-transition-new\(root\) \{\s*animation: move-fade var\(--move-cross\) ease-out both;/,
    );
  });

  it("stops every element's own colour fade while the screen fades, so colours don't flicker", () => {
    expect(css).toMatch(
      /html\[data-theme-fade\] :is\(\*, \*::before, \*::after\) \{\s*transition: none !important;/,
    );
  });
});
