// @vitest-environment jsdom
import { fakeMatchMedia } from "@/test/matchMedia";

import { crossFade, fadeIn, ghostOf, markFor, MOVE, movesNow, placeIn, slideFrom } from ".";

const animate = vi.fn(() => ({}));

function askForLessMotion(): void {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => query.includes("prefers-reduced-motion"),
    ).matchMedia,
  );
}

function sized(width: number): HTMLElement {
  const element = document.createElement("div");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(40, 60, width, 30));
  return document.body.appendChild(element);
}

beforeEach(() => {
  animate.mockClear();
  Object.defineProperty(Element.prototype, "animate", { value: animate, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(Element.prototype, "animate");
  Reflect.deleteProperty(document, "startViewTransition");
  document.documentElement.removeAttribute("data-theme-fade");
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("whether anything moves", () => {
  it("moves in a browser that can animate", () => {
    expect(movesNow()).toBe(true);
  });

  it("does not move when the device asks for less motion", () => {
    askForLessMotion();

    expect(movesNow()).toBe(false);
  });

  it("does not move where the browser cannot animate", () => {
    Reflect.deleteProperty(Element.prototype, "animate");

    expect(movesNow()).toBe(false);
  });
});

describe("moving one thing", () => {
  it("measures a place inside what holds it, wherever that is scrolled to", () => {
    const holder = sized(400);
    holder.scrollLeft = 25;
    const inner = document.createElement("i");
    vi.spyOn(inner, "getBoundingClientRect").mockReturnValue(new DOMRect(140, 60, 80, 30));

    expect(placeIn(holder, inner)).toEqual({ left: 125, top: 0, width: 80 });
  });

  it("slides and fades with the shared times and curve", () => {
    const element = sized(80);

    slideFrom(element, { dx: -120, dy: 4, scaleX: 0.5 }, MOVE.ms.marker);
    fadeIn(element);

    expect(animate.mock.calls).toEqual([
      [
        [{ transform: "translate(-120px, 4px) scaleX(0.5)" }, { transform: "none" }],
        { duration: MOVE.ms.marker, easing: MOVE.arrive },
      ],
      [[{ opacity: 0 }, { opacity: 1 }], { duration: MOVE.ms.swap, easing: "ease-out" }],
    ]);
  });

  it("marks something for a while, then clears the mark", () => {
    vi.useFakeTimers();
    const element = sized(80);

    markFor(element, "landed", "", MOVE.ms.ring);

    expect(element).toHaveAttribute("data-landed");
    vi.advanceTimersByTime(MOVE.ms.ring);
    expect(element).not.toHaveAttribute("data-landed");
  });

  it("does none of it with less motion", () => {
    askForLessMotion();
    const element = sized(80);

    slideFrom(element, { dx: -120, dy: 0, scaleX: 1 }, MOVE.ms.marker);
    fadeIn(element);
    markFor(element, "landed", "", MOVE.ms.ring);

    expect(animate).not.toHaveBeenCalled();
    expect(element).not.toHaveAttribute("data-landed");
    expect(ghostOf(element, "pop")).toBeNull();
  });
});

describe("a copy of what closes", () => {
  it("is pinned where the thing stood, with nothing a script or screen reader could find", () => {
    const menu = sized(240);
    menu.id = "more";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "More");
    menu.setAttribute("data-move", "pop");
    menu.innerHTML = '<button name="go" tabindex="-1" role="menuitem">Edit details</button>';

    const ghost = ghostOf(menu, "pop");

    expect(ghost).toHaveAttribute("data-leaving", "pop");
    expect(ghost).toHaveStyle({ position: "fixed", width: "240px", height: "30px" });
    expect(ghost?.style.inset).toBe("60px auto auto 40px");
    expect(ghost?.outerHTML).not.toMatch(/ (id|name|role|tabindex|aria-label|data-move)=/);
    expect(ghost).toHaveTextContent("Edit details");
  });

  it("is not made for something that is not on screen", () => {
    expect(ghostOf(sized(0), "pop")).toBeNull();
  });
});

describe("light and dark", () => {
  it("cross-fades the whole screen where the browser can, then clears its mark", async () => {
    const update = vi.fn();
    const finished = Promise.resolve();
    const startViewTransition = vi.fn((change: () => void) => {
      change();
      return { finished };
    });
    Object.defineProperty(document, "startViewTransition", {
      value: startViewTransition,
      configurable: true,
    });

    crossFade(update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveAttribute("data-theme-fade");
    await finished;
    await Promise.resolve();
    expect(document.documentElement).not.toHaveAttribute("data-theme-fade");
  });

  it("switches at once where the browser cannot", () => {
    const update = vi.fn();

    crossFade(update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement).not.toHaveAttribute("data-theme-fade");
  });

  it("switches at once with less motion, even where the browser could fade", () => {
    askForLessMotion();
    const startViewTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      value: startViewTransition,
      configurable: true,
    });
    const update = vi.fn();

    crossFade(update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
  });
});
