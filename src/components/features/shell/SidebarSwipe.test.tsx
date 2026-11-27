import { readFileSync } from "node:fs";
import { join } from "node:path";

import { uid } from "@/test/ids";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { jsonResponse } from "@/lib/api/core/test-helpers";
import { NARROW_SCREEN_QUERY } from "@/lib/gestures";
import { fakeMatchMedia } from "@/test/matchMedia";
import { resetTheme } from "@/test/themes";

import { AppShell } from "./AppShell";
import { SIDEBAR_ID } from "./Sidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));

const CONTEXT = {
  staff: {
    id: uid(7),
    name: "Ram Thapa",
    email: "ram@acme.test",
    role: "teacher",
    colour_mode: "light",
  },
  consultancy: { name: "Acme Education" },
  modules: ["students", "tasks", "batches"],
  date_display: "AD",
  support_access: null,
};

const NO_NOTIFICATIONS = { count: 0, page: 1, page_size: 20, unread_count: 0, results: [] };
const MENU_WIDTH = 300;

async function renderShell({ isNarrow }: { isNarrow: boolean }): Promise<void> {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => isNarrow && query === NARROW_SCREEN_QUERY,
    ).matchMedia,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation((path) => {
      if (path === "/api/context/") return Promise.resolve(jsonResponse(CONTEXT));
      if (path === "/api/notifications/") return Promise.resolve(jsonResponse(NO_NOTIFICATIONS));
      return Promise.resolve(new Response(null, { status: 204 }));
    }),
  );
  const listens = vi.spyOn(document, "addEventListener");
  render(<AppShell>page</AppShell>);
  await screen.findByText("page");
  // The shell starts listening for touches in an effect, and React may run it a moment after the
  // page is drawn. A touch fired before that reaches nobody, which failed this file about one run
  // in fifteen (ticket 25); so wait until it listens.
  await waitFor(() => {
    expect(listens).toHaveBeenCalledWith("touchstart", expect.any(Function), expect.anything());
  });
  Object.defineProperty(menu(), "offsetWidth", { configurable: true, value: MENU_WIDTH });
  // A swipe is one burst of events by their times (Date.now in jsdom). Freeze the date, so a slow
  // machine can't split one swipe into two; timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] });
}

afterEach(() => {
  vi.useRealTimers();
  resetTheme();
});

function menu(): HTMLElement {
  const element = document.getElementById(SIDEBAR_ID);
  if (element === null) throw new Error("no sidebar");
  return element;
}

function menuButton(): HTMLElement {
  return screen.getByRole("button", { name: "Open the menu" });
}

/** One finger touching down at `from`, moving through `moves` and lifting. */
function swipe(target: Element, from: [number, number], moves: [number, number][]): void {
  const touch = ([clientX, clientY]: [number, number]) => [{ clientX, clientY }];
  fireEvent.touchStart(target, { touches: touch(from) });
  for (const point of moves) fireEvent.touchMove(target, { touches: touch(point) });
  fireEvent.touchEnd(target, { touches: [] });
}

/** A wheel step with its own time, as a touchpad sends them. */
function wheel(target: Element, init: WheelEventInit, at: number): WheelEvent {
  const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "timeStamp", { value: at });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

describe("swiping the slide-out menu on phones and tablets", () => {
  it("opens from the left edge, following the finger, once past halfway", async () => {
    await renderShell({ isNarrow: true });
    const main = screen.getByRole("main");

    fireEvent.touchStart(main, { touches: [{ clientX: 4, clientY: 300 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 100, clientY: 305 }] });
    expect(menu()).toHaveAttribute("data-dragging");
    expect(menu().style.translate).toBe(`${String(100 - 4 - MENU_WIDTH)}px`);
    fireEvent.touchMove(main, { touches: [{ clientX: 220, clientY: 310 }] });
    fireEvent.touchEnd(main, { touches: [] });

    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(menu()).not.toHaveAttribute("data-dragging");
    expect(menu().style.translate).toBe("");
  });

  it("snaps back shut when let go before halfway", async () => {
    await renderShell({ isNarrow: true });

    swipe(
      screen.getByRole("main"),
      [4, 300],
      [
        [60, 300],
        [120, 300],
      ],
    );

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menu().style.translate).toBe("");
  });

  it("does nothing for a swipe that doesn't start at the edge, or that goes up or down", async () => {
    await renderShell({ isNarrow: true });

    swipe(screen.getByRole("main"), [80, 300], [[300, 300]]);
    swipe(
      screen.getByRole("main"),
      [4, 300],
      [
        [10, 400],
        [250, 420],
      ],
    );

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with a swipe to the left on the open menu, and stays open on a short one", async () => {
    await renderShell({ isNarrow: true });
    await userEvent.click(menuButton());
    const link = screen.getByRole("link", { name: "Tasks" });

    swipe(
      link,
      [250, 300],
      [
        [200, 300],
        [180, 300],
      ],
    );
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");

    swipe(
      link,
      [250, 300],
      [
        [150, 300],
        [40, 300],
      ],
    );
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("judges the release by where the finger lifted, even if its last move was missed", async () => {
    await renderShell({ isNarrow: true });
    const main = screen.getByRole("main");

    fireEvent.touchStart(main, { touches: [{ clientX: 4, clientY: 300 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 100, clientY: 300 }] });
    fireEvent.touchEnd(main, { touches: [], changedTouches: [{ clientX: 240, clientY: 300 }] });

    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    expect(menu()).not.toHaveAttribute("data-dragging");
    expect(menu().style.translate).toBe("");
  });

  it("puts the menu back where it was when the touch is cancelled", async () => {
    await renderShell({ isNarrow: true });
    const main = screen.getByRole("main");

    fireEvent.touchStart(main, { touches: [{ clientX: 4, clientY: 300 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 250, clientY: 300 }] });
    fireEvent.touchCancel(main, { touches: [] });

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menu().style.translate).toBe("");
  });

  it("never moves the menu from a touchpad there", async () => {
    await renderShell({ isNarrow: true });

    const event = wheel(screen.getByRole("main"), { deltaX: 40 }, 0);
    wheel(screen.getByRole("main"), { deltaX: 40 }, 16);

    expect(event.defaultPrevented).toBe(false);
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("a two-finger touchpad swipe on a computer (UI revamp, ticket 05)", () => {
  it("is left to the browser: the side menu has nothing to collapse", async () => {
    await renderShell({ isNarrow: false });
    const main = screen.getByRole("main");

    const first = wheel(main, { deltaX: 30 }, 1000);
    wheel(main, { deltaX: 30 }, 1016);

    expect(first.defaultPrevented).toBe(false);
    expect(screen.queryByRole("button", { name: "Expand the menu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Collapse the menu" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("crm.sidebar-collapsed")).toBeNull();
  });
});

describe("the browser's own sideways swipe (UI revamp, ticket 19)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("is stopped on phones and tablets only, so a computer keeps back and forward", () => {
    const rules = [...css.matchAll(/overscroll-behavior-x: none/g)];
    expect(rules).toHaveLength(1);

    const before = css.slice(0, rules[0]?.index);
    const media = before.slice(before.lastIndexOf("@media"));
    expect(media).toMatch(/^@media \(width < 64\.0625rem\) \{\s*html \{\s*$/);
  });
});
