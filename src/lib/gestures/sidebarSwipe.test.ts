import {
  EDGE_ZONE,
  GESTURE_GAP_MS,
  NO_TOUCHPAD_SWIPE,
  TOUCHPAD_DISTANCE,
  canStartFingerSwipe,
  drawerOpensOnRelease,
  drawerShownWidth,
  fingerDirection,
  readTouchpadStep,
  type FingerStart,
  type TouchpadSwipe,
  type WheelStep,
} from "./sidebarSwipe";

const CLOSED_AT_EDGE: FingerStart = {
  x: 5,
  fingers: 1,
  isNarrow: true,
  isDrawerOpen: false,
  startsOnSidebar: false,
  startsInSidewaysScroller: false,
  isDialogOpen: false,
};

const OPEN_ON_SIDEBAR: FingerStart = {
  ...CLOSED_AT_EDGE,
  x: 200,
  isDrawerOpen: true,
  startsOnSidebar: true,
};

describe("canStartFingerSwipe", () => {
  it("opens only from the left edge while the menu is shut", () => {
    expect(canStartFingerSwipe(CLOSED_AT_EDGE)).toBe(true);
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, x: EDGE_ZONE - 1 })).toBe(true);
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, x: EDGE_ZONE })).toBe(false);
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, x: 150 })).toBe(false);
  });

  it("closes only from a finger on the open menu", () => {
    expect(canStartFingerSwipe(OPEN_ON_SIDEBAR)).toBe(true);
    expect(canStartFingerSwipe({ ...OPEN_ON_SIDEBAR, startsOnSidebar: false })).toBe(false);
  });

  it("works on phones and tablets only, never above 1024 px", () => {
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, isNarrow: false })).toBe(false);
    expect(canStartFingerSwipe({ ...OPEN_ON_SIDEBAR, isNarrow: false })).toBe(false);
  });

  it("needs exactly one finger", () => {
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, fingers: 2 })).toBe(false);
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, fingers: 0 })).toBe(false);
  });

  it("leaves a sideways scroller (a wide table) to scroll", () => {
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, startsInSidewaysScroller: true })).toBe(false);
    expect(canStartFingerSwipe({ ...OPEN_ON_SIDEBAR, startsInSidewaysScroller: true })).toBe(false);
  });

  it("does nothing while a dialog is open", () => {
    expect(canStartFingerSwipe({ ...CLOSED_AT_EDGE, isDialogOpen: true })).toBe(false);
  });
});

describe("fingerDirection", () => {
  it("waits until the finger has moved a little", () => {
    expect(fingerDirection(0, 0)).toBe("undecided");
    expect(fingerDirection(5, -5)).toBe("undecided");
  });

  it("is sideways when the finger moves more across than up or down", () => {
    expect(fingerDirection(20, 5)).toBe("sideways");
    expect(fingerDirection(-20, -5)).toBe("sideways");
  });

  it("is up-down when the finger moves more up or down (the page scrolls instead)", () => {
    expect(fingerDirection(5, 20)).toBe("upDown");
    expect(fingerDirection(10, -10)).toBe("upDown");
  });
});

describe("drawerShownWidth", () => {
  it("follows the finger from shut", () => {
    expect(drawerShownWidth({ width: 300, wasOpen: false, dx: 120 })).toBe(120);
  });

  it("follows the finger from open", () => {
    expect(drawerShownWidth({ width: 300, wasOpen: true, dx: -100 })).toBe(200);
  });

  it("never goes past fully open or fully shut", () => {
    expect(drawerShownWidth({ width: 300, wasOpen: false, dx: 500 })).toBe(300);
    expect(drawerShownWidth({ width: 300, wasOpen: false, dx: -40 })).toBe(0);
    expect(drawerShownWidth({ width: 300, wasOpen: true, dx: 80 })).toBe(300);
    expect(drawerShownWidth({ width: 300, wasOpen: true, dx: -400 })).toBe(0);
  });
});

describe("drawerOpensOnRelease", () => {
  it("opens when let go past halfway, and snaps back shut before it", () => {
    expect(drawerOpensOnRelease({ width: 300, wasOpen: false, dx: 151 })).toBe(true);
    expect(drawerOpensOnRelease({ width: 300, wasOpen: false, dx: 150 })).toBe(false);
    expect(drawerOpensOnRelease({ width: 300, wasOpen: false, dx: 40 })).toBe(false);
  });

  it("closes when pushed past halfway, and snaps back open before it", () => {
    expect(drawerOpensOnRelease({ width: 300, wasOpen: true, dx: -151 })).toBe(false);
    expect(drawerOpensOnRelease({ width: 300, wasOpen: true, dx: -100 })).toBe(true);
  });

  it("stays as it was when the finger didn't move", () => {
    expect(drawerOpensOnRelease({ width: 300, wasOpen: true, dx: 0 })).toBe(true);
    expect(drawerOpensOnRelease({ width: 300, wasOpen: false, dx: 0 })).toBe(false);
  });
});

const PIXELS = 0;
const LINES = 1;
const PAGES = 2;

function step(deltaX: number, at: number, extra: Partial<WheelStep> = {}): WheelStep {
  return {
    deltaX,
    deltaY: 0,
    deltaMode: PIXELS,
    timeStamp: at,
    shiftKey: false,
    ctrlKey: false,
    isNarrow: false,
    startsInSidewaysScroller: false,
    isDialogOpen: false,
    ...extra,
  };
}

/** Feeds the steps in order and gives every answer. */
function feed(steps: WheelStep[], start: TouchpadSwipe = NO_TOUCHPAD_SWIPE) {
  let swipe = start;
  return steps.map((wheel) => {
    const answer = readTouchpadStep(swipe, wheel);
    swipe = answer.swipe;
    return answer;
  });
}

describe("readTouchpadStep", () => {
  it("collapses the sidebar once a swipe to the left has gone far enough", () => {
    const answers = feed([step(20, 0), step(20, 16), step(20, 32)]);

    expect(answers.map((a) => a.collapse)).toEqual([null, null, true]);
    expect(answers.every((a) => a.blocksBrowser)).toBe(true);
    expect(TOUCHPAD_DISTANCE).toBeLessThan(60);
  });

  it("opens the sidebar on a swipe to the right", () => {
    const answers = feed([step(-30, 0), step(-30, 16)]);

    expect(answers.at(-1)?.collapse).toBe(false);
  });

  it("switches only once per gesture: going on or reversing does nothing more", () => {
    const answers = feed([
      step(30, 0),
      step(30, 16),
      step(30, 32),
      step(-40, 48),
      step(-40, 64),
      step(-40, 80),
    ]);

    expect(answers.map((a) => a.collapse)).toEqual([null, true, null, null, null, null]);
    // The browser's own swipe back/forward stays off for the whole gesture.
    expect(answers.every((a) => a.blocksBrowser)).toBe(true);
  });

  it("needs a new gesture (a pause in the steps) to switch back", () => {
    const first = feed([step(30, 0), step(30, 16)]);
    const after = first.at(-1)?.swipe;
    const answers = feed(
      [step(-30, 16 + GESTURE_GAP_MS + 1), step(-30, 16 + GESTURE_GAP_MS + 17)],
      after,
    );

    expect(answers.at(-1)?.collapse).toBe(false);
  });

  it("ignores up-and-down scrolling", () => {
    const answers = feed([step(10, 0, { deltaY: 40 }), step(60, 16, { deltaY: 80 })]);

    expect(answers.every((a) => a.collapse === null && !a.blocksBrowser)).toBe(true);
  });

  it("never moves on a plain mouse wheel, nor a wheel turned sideways with Shift", () => {
    const wheel = feed([step(0, 0, { deltaY: 100 }), step(0, 30, { deltaY: 100 })]);
    const shifted = feed([step(100, 0, { shiftKey: true }), step(100, 30, { shiftKey: true })]);
    const notch = feed([step(120, 0), step(120, 30)]);
    const lines = feed([step(3, 0, { deltaMode: LINES }), step(3, 30, { deltaMode: LINES })]);

    for (const answers of [wheel, shifted, notch, lines]) {
      expect(answers.every((a) => a.collapse === null)).toBe(true);
    }
  });

  it("counts small line steps as pixels", () => {
    const answers = feed([step(2, 0, { deltaMode: LINES }), step(2, 16, { deltaMode: LINES })]);

    expect(answers.at(-1)?.collapse).toBe(true);
  });

  it("ignores page steps and pinch-to-zoom", () => {
    expect(feed([step(1, 0, { deltaMode: PAGES })])[0]?.collapse).toBeNull();
    expect(feed([step(60, 0, { ctrlKey: true })])[0]).toMatchObject({
      collapse: null,
      blocksBrowser: false,
    });
  });

  it("lets a gesture that starts in a wide table scroll the table for its whole length", () => {
    const answers = feed([
      step(30, 0, { startsInSidewaysScroller: true }),
      step(30, 16, { startsInSidewaysScroller: false }),
      step(30, 32, { startsInSidewaysScroller: false }),
    ]);

    expect(answers.every((a) => a.collapse === null && !a.blocksBrowser)).toBe(true);
  });

  it("does nothing on phones and tablets, where the finger moves the menu", () => {
    const answers = feed([step(30, 0, { isNarrow: true }), step(30, 16, { isNarrow: true })]);

    expect(answers.every((a) => a.collapse === null && !a.blocksBrowser)).toBe(true);
  });

  it("does nothing while a dialog is open", () => {
    const answers = feed([
      step(30, 0, { isDialogOpen: true }),
      step(30, 16, { isDialogOpen: true }),
    ]);

    expect(answers.every((a) => a.collapse === null)).toBe(true);
  });
});
