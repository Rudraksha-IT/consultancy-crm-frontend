import * as sidebarSwipe from "./sidebarSwipe";
import {
  EDGE_ZONE,
  canStartFingerSwipe,
  drawerOpensOnRelease,
  drawerShownWidth,
  fingerDirection,
  type FingerStart,
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

describe("a sideways touchpad swipe on a computer (UI revamp, ticket 19)", () => {
  it("has no rule of its own: it is left to the browser, for back and forward", () => {
    expect(Object.keys(sidebarSwipe)).not.toContain("readTouchpadStep");
    expect(Object.keys(sidebarSwipe).filter((name) => /touchpad/i.test(name))).toEqual([]);
  });
});
