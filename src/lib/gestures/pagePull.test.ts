import {
  MAX_SHIFT,
  NO_WHEEL_PULL,
  PULL_DISTANCE,
  REST_MS,
  canPullPages,
  moveFingerPull,
  neighbourPages,
  pullHint,
  pullShift,
  readPageWheelStep,
  restingEdges,
  startFingerPull,
  type PageWheelStep,
  type PullContext,
  type WheelPull,
} from "./pagePull";

const PAGES = [
  { href: "/", label: "Home" },
  { href: "/students", label: "Students" },
  { href: "/tasks", label: "Tasks" },
];

const AT_TOP = { isAtTop: true, isAtBottom: false, msSinceScroll: REST_MS };
const AT_BOTTOM = { isAtTop: false, isAtBottom: true, msSinceScroll: REST_MS };
const SHORT_PAGE = { isAtTop: true, isAtBottom: true, msSinceScroll: REST_MS };
const MIDDLE = { isAtTop: false, isAtBottom: false, msSinceScroll: REST_MS };

const FREE: PullContext = {
  isMainPage: true,
  isDialogOpen: false,
  hasFocusedField: false,
  hasUnsavedChanges: false,
  isDrawerOpen: false,
  startsInUpDownScroller: false,
};

describe("neighbourPages", () => {
  it("gives the pages before and after the open one, in sidebar order", () => {
    expect(neighbourPages(PAGES, "/students")).toEqual({ previous: PAGES[0], next: PAGES[2] });
  });

  it("has no previous page at the first page and no next page at the last", () => {
    expect(neighbourPages(PAGES, "/")).toEqual({ previous: null, next: PAGES[1] });
    expect(neighbourPages(PAGES, "/tasks")).toEqual({ previous: PAGES[1], next: null });
  });

  it("is null on a detail page such as one Student", () => {
    expect(neighbourPages(PAGES, "/students/4")).toBeNull();
    expect(neighbourPages(PAGES, "/students/4/edit")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(neighbourPages(PAGES, "/tasks/")).toEqual({ previous: PAGES[1], next: null });
  });
});

describe("canPullPages", () => {
  it("allows a pull on a main page with nothing being edited", () => {
    expect(canPullPages(FREE)).toBe(true);
  });

  it.each([
    ["not a main page", { isMainPage: false }],
    ["a dialog is open", { isDialogOpen: true }],
    ["a field has focus", { hasFocusedField: true }],
    ["there are unsaved changes", { hasUnsavedChanges: true }],
    ["the slide-out menu is open", { isDrawerOpen: true }],
    ["it starts in a box that scrolls up and down", { startsInUpDownScroller: true }],
  ])("is off when %s", (_why, change) => {
    expect(canPullPages({ ...FREE, ...change })).toBe(false);
  });
});

describe("restingEdges", () => {
  it("is the top or bottom the page has rested at for long enough", () => {
    expect(restingEdges(AT_TOP)).toEqual({ top: true, bottom: false });
    expect(restingEdges(AT_BOTTOM)).toEqual({ top: false, bottom: true });
  });

  it("is both ends on a page too short to scroll", () => {
    expect(restingEdges(SHORT_PAGE)).toEqual({ top: true, bottom: true });
  });

  it("is neither in the middle of the page", () => {
    expect(restingEdges(MIDDLE)).toEqual({ top: false, bottom: false });
  });

  it("is neither just after a scroll ran into the end", () => {
    expect(restingEdges({ ...AT_TOP, msSinceScroll: REST_MS - 1 })).toEqual({
      top: false,
      bottom: false,
    });
  });
});

describe("finger pulls", () => {
  it("needs a very long finger pull, 480 of travel, to be ready (asked 2026-11-17)", () => {
    const track = startFingerPull({ x: 200, y: 100, fingers: 1, position: AT_TOP, canPull: true });
    if (track === null) throw new Error("no track");
    expect(moveFingerPull(track, 200, 560).pull?.distance).toBeLessThan(PULL_DISTANCE);
    expect(moveFingerPull(track, 200, 580).pull?.distance).toBeGreaterThanOrEqual(PULL_DISTANCE);
  });

  function start(position = AT_TOP, fingers = 1, canPull = true) {
    return startFingerPull({ x: 200, y: 400, fingers, position, canPull });
  }

  it("starts only with one finger, when allowed, with the page resting at an end", () => {
    expect(start()).not.toBeNull();
    expect(start(AT_TOP, 2)).toBeNull();
    expect(start(AT_TOP, 1, false)).toBeNull();
    expect(start(MIDDLE)).toBeNull();
    expect(start({ ...AT_TOP, msSinceScroll: 0 })).toBeNull();
  });

  it("pulls down from the top towards the previous page, three quarters of the finger", () => {
    const track = start();
    if (track === null) throw new Error("no track");
    const { pull } = moveFingerPull(track, 200, 500);
    expect(pull?.edge).toBe("top");
    expect(pull?.distance).toBeCloseTo(75);
  });

  it("pulls up from the bottom towards the next page", () => {
    const track = start(AT_BOTTOM);
    if (track === null) throw new Error("no track");
    const { pull } = moveFingerPull(track, 200, 300);
    expect(pull?.edge).toBe("bottom");
    expect(pull?.distance).toBeCloseTo(75);
  });

  it("pulls either way on a short page", () => {
    const track = start(SHORT_PAGE);
    if (track === null) throw new Error("no track");
    expect(moveFingerPull(track, 200, 300).pull?.edge).toBe("bottom");
    expect(moveFingerPull(track, 200, 500).pull?.edge).toBe("top");
  });

  it("keeps to the end it first pulled on a short page, so one gesture changes one page", () => {
    const track = start(SHORT_PAGE);
    if (track === null) throw new Error("no track");
    const pulledUp = moveFingerPull(track, 200, 200);
    expect(pulledUp.pull?.edge).toBe("bottom");
    if (pulledUp.track === null) throw new Error("no track");
    const reversed = moveFingerPull(pulledUp.track, 200, 700);
    expect(reversed.pull).toBeNull();
    expect(reversed.track).not.toBeNull();
  });

  it("does nothing while the direction is undecided", () => {
    const track = start();
    if (track === null) throw new Error("no track");
    expect(moveFingerPull(track, 202, 403)).toEqual({ track, pull: null });
  });

  it("lets go of a sideways swipe (that is the sidebar's)", () => {
    const track = start();
    if (track === null) throw new Error("no track");
    expect(moveFingerPull(track, 260, 410)).toEqual({ track: null, pull: null });
  });

  it("is no pull when the finger moves away from the resting end (the page scrolls)", () => {
    const track = start();
    if (track === null) throw new Error("no track");
    const moved = moveFingerPull(track, 200, 300);
    expect(moved.pull).toBeNull();
    expect(moved.track).not.toBeNull();
  });

  it("cancels when pushed back past where it started", () => {
    const track = start();
    if (track === null) throw new Error("no track");
    const pulled = moveFingerPull(track, 200, 600);
    if (pulled.track === null) throw new Error("no track");
    expect(moveFingerPull(pulled.track, 200, 390).pull).toBeNull();
  });
});

describe("touchpad pulls", () => {
  function step(change: Partial<PageWheelStep> = {}): PageWheelStep {
    return {
      deltaX: 0,
      deltaY: -10,
      deltaMode: 0,
      timeStamp: 1000,
      ctrlKey: false,
      shiftKey: false,
      position: AT_TOP,
      canPull: true,
      ...change,
    };
  }

  function burst(steps: Partial<PageWheelStep>[], from: WheelPull = NO_WHEEL_PULL): WheelPull {
    return steps.reduce<WheelPull>(
      (state, change, index) =>
        readPageWheelStep(state, step({ timeStamp: 1000 + index * 16, ...change })),
      from,
    );
  }

  it("pulls down at the top towards the previous page, as far as the scroll", () => {
    expect(burst([{ deltaY: -10 }, { deltaY: -20 }]).pull).toEqual({ edge: "top", distance: 30 });
  });

  it("pulls up at the bottom towards the next page", () => {
    expect(burst([{ deltaY: 10, position: AT_BOTTOM }]).pull).toEqual({
      edge: "bottom",
      distance: 10,
    });
  });

  it("needs a very long, deliberate pull, 360 of scrolling, to be ready (asked 2026-11-17)", () => {
    const steps = (count: number) => Array.from({ length: count }, () => ({ deltaY: -20 }));
    // 340 of scrolling, far past the old threshold of about 130, no longer changes the page.
    expect(burst(steps(17)).pull?.distance).toBeLessThan(PULL_DISTANCE);
    expect(burst(steps(18)).pull?.distance).toBeGreaterThanOrEqual(PULL_DISTANCE);
  });

  it("waits for the page to rest at the end for most of a second first (asked 2026-11-16)", () => {
    expect(REST_MS).toBeGreaterThanOrEqual(800);
  });

  it("counts line steps as lines", () => {
    expect(burst([{ deltaY: -1, deltaMode: 1 }]).pull).toEqual({ edge: "top", distance: 16 });
  });

  it("never pulls with a burst that began while scrolling (momentum into the end)", () => {
    const moving = { ...AT_TOP, msSinceScroll: 30 };
    expect(burst([{ position: moving }, {}, {}, {}, {}, {}]).pull).toBeNull();
  });

  it("never pulls with a burst that began in the middle of the page", () => {
    expect(burst([{ position: MIDDLE }, {}, {}, {}]).pull).toBeNull();
  });

  it("starts a new burst after a pause, which may then pull", () => {
    const moving = burst([{ position: { ...AT_TOP, msSinceScroll: 30 } }]);
    expect(readPageWheelStep(moving, step({ timeStamp: 1600 })).pull).toEqual({
      edge: "top",
      distance: 10,
    });
  });

  it("cancels when the pull is pushed back", () => {
    expect(burst([{ deltaY: -30 }, { deltaY: 5 }]).pull).toBeNull();
  });

  it("keeps to the end it first pulled on a short page, so one gesture changes one page", () => {
    const short = { position: SHORT_PAGE };
    const reversed = burst([
      { ...short, deltaY: -30 },
      ...Array.from({ length: 8 }, () => ({ ...short, deltaY: 20 })),
    ]);
    expect(reversed.pull).toBeNull();
  });

  it("does nothing with a step that looks like a mouse wheel, for the rest of the burst", () => {
    expect(burst([{ deltaY: -100 }]).pull).toBeNull();
    expect(burst([{ deltaY: -3, deltaMode: 1 }]).pull).toBeNull();
    expect(burst([{ deltaY: -10 }, { deltaY: -120 }, { deltaY: -10 }]).pull).toBeNull();
  });

  it("does nothing with pinch, Shift or page steps", () => {
    expect(burst([{ ctrlKey: true }]).pull).toBeNull();
    expect(burst([{ shiftKey: true }]).pull).toBeNull();
    expect(burst([{ deltaMode: 2, deltaY: -1 }]).pull).toBeNull();
  });

  it("does nothing when pulls are off", () => {
    expect(burst([{ canPull: false }]).pull).toBeNull();
  });

  it("leaves a sideways step alone (that is the sidebar's)", () => {
    const pulled = burst([{ deltaY: -30 }]);
    expect(
      readPageWheelStep(pulled, step({ deltaX: 40, deltaY: 2, timeStamp: 1016 })).pull,
    ).toEqual(pulled.pull);
  });
});

describe("the pull's look", () => {
  it("moves the page like a rubber band: easy at first, never past the most", () => {
    expect(pullShift(0)).toBe(0);
    expect(pullShift(30)).toBeGreaterThan(25);
    expect(pullShift(160) - pullShift(130)).toBeLessThan(pullShift(30));
    expect(pullShift(5000)).toBeLessThanOrEqual(MAX_SHIFT);
  });

  const neighbours = { previous: PAGES[0] ?? null, next: PAGES[2] ?? null };

  it("opens a gap tall enough to read when it is ready, and never past the furthest", () => {
    expect(pullShift(PULL_DISTANCE)).toBeGreaterThanOrEqual(90);
    expect(pullShift(PULL_DISTANCE)).toBeLessThan(MAX_SHIFT);
  });

  it("names the page it will go to, and is ready past the threshold", () => {
    expect(pullHint({ edge: "bottom", distance: PULL_DISTANCE / 2 }, neighbours)).toMatchObject({
      edge: "bottom",
      page: PAGES[2],
      isReady: false,
      progress: 0.5,
    });
    expect(pullHint({ edge: "top", distance: PULL_DISTANCE }, neighbours)).toMatchObject({
      edge: "top",
      page: PAGES[0],
      isReady: true,
      progress: 1,
    });
  });

  it("shows nothing at the first page's top or the last page's bottom", () => {
    expect(pullHint({ edge: "top", distance: 200 }, { ...neighbours, previous: null })).toBeNull();
    expect(pullHint({ edge: "bottom", distance: 200 }, { ...neighbours, next: null })).toBeNull();
  });

  it("shows nothing without a pull", () => {
    expect(pullHint(null, neighbours)).toBeNull();
  });
});
