import { uid } from "@/test/ids";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { jsonResponse } from "@/lib/api/core/test-helpers";
import { fakeMatchMedia } from "@/test/matchMedia";
import { holdUnsavedChanges } from "@/lib/unsavedChanges";
import { resetTheme } from "@/test/themes";

import { AppShell } from "./AppShell";

const navigation = vi.hoisted(() => ({
  pathname: "/batches",
  push: vi.fn<(href: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: navigation.push }),
  usePathname: () => navigation.pathname,
}));
vi.mock("@/hooks/useFullPageNavigation", () => ({ useFullPageNavigation: () => vi.fn() }));

// A Teacher's sidebar: Home, Classes, Tasks, Inbox.
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
  // Swipe between pages is off until the person switches it on in Settings (asked 2026-11-17).
  page_swipe: true,
  support_access: null,
};

const NO_NOTIFICATIONS = { count: 0, page: 1, page_size: 20, unread_count: 0, results: [] };
const WHEEL_END_MS = 300;
const LEAVE_MS = 200;
const ENTER_MS = 300;
const SETTLE_TURNS = 3;

/** Where the page is scrolled: its height and how far down it is. */
function scrollPage({ height, y }: { height: number; y: number }): void {
  Object.defineProperty(document.documentElement, "scrollHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, "scrollY", { configurable: true, value: y });
}

type ShellOptions = { pathname?: string; reduceMotion?: boolean; pageSwipe?: boolean };

/** The shell with the context the server would send; Swipe between pages on unless told off. */
async function renderShell(options: ShellOptions = {}, children: React.ReactNode = "page") {
  const { pathname, reduceMotion, pageSwipe } = {
    pathname: "/batches",
    reduceMotion: false,
    pageSwipe: true,
    ...options,
  };
  navigation.pathname = pathname;
  return renderShellWith({ ...CONTEXT, page_swipe: pageSwipe }, { reduceMotion }, children);
}

async function renderShellWith(
  context: object,
  { reduceMotion }: { reduceMotion: boolean },
  children: React.ReactNode,
) {
  vi.stubGlobal(
    "matchMedia",
    fakeMatchMedia(
      () => false,
      (query) => reduceMotion && query.includes("reduce"),
    ).matchMedia,
  );
  const answers: Partial<Record<string, unknown>> = {
    "/api/context/": context,
    "/api/notifications/": NO_NOTIFICATIONS,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockImplementation((path) => {
      const answer = typeof path === "string" ? answers[path] : undefined;
      return Promise.resolve(
        answer === undefined ? new Response(null, { status: 204 }) : jsonResponse(answer),
      );
    }),
  );
  const view = render(<AppShell>{children}</AppShell>);
  await screen.findByRole("main");
  await settle();
  // Event times come from Date.now in jsdom: freeze it, so a slow machine can't split one pull in
  // two. performance.now stays real: a scroll seen before this line keeps a comparable time.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  return view;
}

/**
 * Let the shell finish starting: the gesture listeners are added in an effect, which a busy
 * machine may run only after <main> is on screen. A few turns of the real clock let every effect
 * and answer land before the test touches the page.
 */
async function settle(): Promise<void> {
  for (let turn = 0; turn < SETTLE_TURNS; turn += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

beforeEach(() => {
  navigation.push.mockClear();
  scrollPage({ height: 3000, y: 0 });
});

afterEach(() => {
  vi.useRealTimers();
  resetTheme();
  document.querySelectorAll('[aria-modal="true"]').forEach((element) => {
    element.remove();
  });
});

function main(): HTMLElement {
  return screen.getByRole("main");
}

/** Two fingers on a touchpad: one burst of small wheel steps, then the pause that ends it. */
function touchpad(deltaYs: number[], { deltaMode = 0 } = {}): void {
  for (const deltaY of deltaYs) fireEvent.wheel(main(), { deltaY, deltaMode });
}

function letGo(ms = WHEEL_END_MS): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** One finger touching down at `fromY`, moving through `moves`, and lifting at the last one. */
function finger(fromY: number, moves: number[]): void {
  const at = (clientY: number) => [{ clientX: 200, clientY }];
  fireEvent.touchStart(main(), { touches: at(fromY) });
  for (const y of moves) fireEvent.touchMove(main(), { touches: at(y) });
  fireEvent.touchEnd(main(), { touches: [], changedTouches: at(moves.at(-1) ?? fromY) });
}

function fingerHeld(fromY: number, moves: number[]): void {
  const at = (clientY: number) => [{ clientX: 200, clientY }];
  fireEvent.touchStart(main(), { touches: at(fromY) });
  for (const y of moves) fireEvent.touchMove(main(), { touches: at(y) });
}

describe("swiping between pages with a touchpad", () => {
  it("pulls past the top: the page moves and the gap says where letting go will go", async () => {
    await renderShell();
    touchpad([-10, -10]);

    expect(screen.getByText("Keep pulling to go to Home")).toBeInTheDocument();
    expect(main()).toHaveAttribute("data-pulled", "top");
    expect(main().style.translate).toMatch(/^0px \d/);

    touchpad(Array<number>(13).fill(-30));
    expect(screen.getByText("Release to go to Home")).toBeInTheDocument();
  });

  it("goes to the previous page in the sidebar when let go, after the page slides away", async () => {
    await renderShell();
    touchpad(Array<number>(13).fill(-30));
    letGo();

    expect(main()).toHaveAttribute("data-page-move", "out-down");
    expect(navigation.push).not.toHaveBeenCalled();
    letGo(LEAVE_MS);
    expect(navigation.push).toHaveBeenCalledWith("/");
  });

  it("goes to the next page when pulled past the bottom", async () => {
    await renderShell();
    scrollPage({ height: 3000, y: 3000 - window.innerHeight });
    touchpad(Array<number>(13).fill(30));

    expect(screen.getByText("Release to go to Tasks")).toBeInTheDocument();
    letGo();
    letGo(LEAVE_MS);
    expect(navigation.push).toHaveBeenCalledWith("/tasks");
  });

  it("snaps back without changing page when let go too early", async () => {
    await renderShell();
    touchpad([-10]);
    letGo();
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
    expect(main()).not.toHaveAttribute("data-pulled");
  });

  it("cancels when pushed back before letting go", async () => {
    await renderShell();
    touchpad([-30, -30, 5]);
    letGo();
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("never moves with a mouse wheel", async () => {
    await renderShell();
    touchpad([-100, -100]);
    touchpad([-3], { deltaMode: 1 });
    letGo();
    letGo(LEAVE_MS);

    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("never moves when a scroll has just run into the end", async () => {
    await renderShell();
    fireEvent.scroll(window);
    touchpad([-30, -30, -30]);
    letGo();
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("never moves from the middle of the page", async () => {
    await renderShell();
    scrollPage({ height: 3000, y: 900 });
    touchpad([-30, -30, -30]);
    touchpad([30, 30, 30]);
    letGo();
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });
});

describe("swiping between pages with a finger", () => {
  it("goes to the previous page when pulled down past the top and let go", async () => {
    await renderShell();
    fingerHeld(400, [500, 1000]);
    expect(screen.getByText("Release to go to Home")).toBeInTheDocument();

    fireEvent.touchEnd(main(), { touches: [], changedTouches: [{ clientX: 200, clientY: 1000 }] });
    letGo(LEAVE_MS);
    expect(navigation.push).toHaveBeenCalledWith("/");
  });

  it("goes to the next page when pulled up past the bottom", async () => {
    await renderShell();
    scrollPage({ height: 3000, y: 3000 - window.innerHeight });
    finger(600, [500, 50]);
    letGo(LEAVE_MS);

    expect(navigation.push).toHaveBeenCalledWith("/tasks");
  });

  it("cancels when pushed back before letting go", async () => {
    await renderShell();
    finger(400, [600, 405]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
    expect(main()).not.toHaveAttribute("data-pulled");
  });

  it("puts the page back when the browser cancels the touch", async () => {
    await renderShell();
    fingerHeld(400, [500, 800]);
    fireEvent.touchCancel(main());
    letGo(LEAVE_MS);

    expect(main()).not.toHaveAttribute("data-pulled");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("leaves a sideways swipe to the sidebar", async () => {
    await renderShell();
    const at = (clientX: number, clientY: number) => [{ clientX, clientY }];
    fireEvent.touchStart(main(), { touches: at(200, 400) });
    fireEvent.touchMove(main(), { touches: at(260, 405) });
    fireEvent.touchMove(main(), { touches: at(260, 600) });

    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
    fireEvent.touchEnd(main(), { touches: [], changedTouches: at(260, 600) });
    letGo(LEAVE_MS);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("switches at once with reduce motion on", async () => {
    await renderShell({ reduceMotion: true });
    finger(400, [500, 1000]);

    expect(navigation.push).toHaveBeenCalledWith("/");
    expect(main()).not.toHaveAttribute("data-page-move");
  });
});

describe("where the gap opens", () => {
  // A short page still fills the screen, so the bottom gap opens at the bottom of the screen and
  // not straight under the content, part way down (jsdom has no layout: the classes are the proof).
  it("opens the bottom gap at the bottom of the screen on a short page", async () => {
    await renderShell({ pathname: "/batches" });
    const page = main();
    const pulledArea = page.parentElement;

    expect(pulledArea).toHaveClass("flex-1");
    expect(page).toHaveClass("flex-1");
  });

  it("eases the page along with the pull instead of jumping with each scroll step", async () => {
    await renderShell();
    touchpad([-10, -10]);

    expect(main()).toHaveAttribute("data-pulled", "top");
    expect(main()).not.toHaveClass("data-pulled:transition-none");
    expect(main()).toHaveClass("data-pulled:ease-out");
  });

  it("closes the gap smoothly when let go too early, instead of it vanishing", async () => {
    const { container } = await renderShell();
    touchpad([-10, -10]);
    const gap = container.querySelector('[data-pull-gap="top"]');
    expect(gap).not.toHaveStyle({ height: "0px" });

    letGo();
    expect(container.querySelector('[data-pull-gap="top"]')).toHaveStyle({ height: "0px" });
    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
  });
});

describe("a page too short to scroll", () => {
  beforeEach(() => {
    scrollPage({ height: window.innerHeight, y: 0 });
  });

  it("with a touchpad, changes page only for the end it first pulled", async () => {
    await renderShell();
    touchpad([-30]);
    expect(screen.getByText("Keep pulling to go to Home")).toBeInTheDocument();
    touchpad([20, 20, 20, 20, 20, 20, 20, 20]);

    expect(screen.queryByText(/to go to Tasks/)).not.toBeInTheDocument();
    letGo();
    letGo(LEAVE_MS);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("with a finger, changes page only for the end it first pulled", async () => {
    await renderShell();
    finger(400, [350, 300, 700, 900]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });
});

describe("where swiping between pages works", () => {
  it("does nothing past the top of the first page", async () => {
    await renderShell({ pathname: "/" });
    touchpad([-30, -30, -30]);

    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
    expect(main()).not.toHaveAttribute("data-pulled");
    letGo();
    letGo(LEAVE_MS);
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("does nothing past the bottom of the last page, and shows no hint", async () => {
    await renderShell({ pathname: "/inbox" });
    finger(700, [600, 300]);
    letGo(LEAVE_MS);

    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off while the office hasn't switched it on in Configuration", async () => {
    await renderShell({ pageSwipe: false });
    finger(400, [500, 1000]);
    touchpad(Array<number>(13).fill(-30));
    letGo(LEAVE_MS);

    expect(screen.queryByText(/to go to/)).not.toBeInTheDocument();
    expect(main()).not.toHaveAttribute("data-pulled");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off when the context doesn't say, as for an older server", async () => {
    const older = Object.fromEntries(
      Object.entries(CONTEXT).filter(([key]) => key !== "page_swipe"),
    );
    navigation.pathname = "/batches";
    await renderShellWith(older, { reduceMotion: false }, "page");
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off on a detail page", async () => {
    await renderShell({ pathname: `/batches/${uid(3)}` });
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off while a field has focus", async () => {
    await renderShell({}, <input aria-label="Search classes" />);
    screen.getByRole("textbox", { name: "Search classes" }).focus();
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off while a dialog is open", async () => {
    await renderShell();
    const dialog = document.createElement("div");
    dialog.setAttribute("aria-modal", "true");
    document.body.append(dialog);
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off while there are unsaved changes", async () => {
    await renderShell();
    const release = holdUnsavedChanges();
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);
    release();

    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("is off while the slide-out menu is open", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open the menu" }));
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);

    expect(navigation.push).not.toHaveBeenCalled();
  });
});

describe("arriving on the new page", () => {
  it("slides the new page in from the side the old one left from", async () => {
    const view = await renderShell();
    finger(400, [500, 1000]);
    letGo(LEAVE_MS);

    navigation.pathname = "/";
    view.rerender(<AppShell>page</AppShell>);
    expect(main()).toHaveAttribute("data-page-move", "in-from-top");

    letGo(ENTER_MS);
    expect(main()).not.toHaveAttribute("data-page-move");
  });

  it("arrives plainly after an ordinary link", async () => {
    const view = await renderShell();
    navigation.pathname = "/tasks";
    view.rerender(<AppShell>page</AppShell>);

    expect(main()).not.toHaveAttribute("data-page-move");
  });
});
