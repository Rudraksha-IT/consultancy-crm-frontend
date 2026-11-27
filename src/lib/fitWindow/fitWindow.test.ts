import { FIT_GAP_PX, FIT_LEAST_PX, fitHeight } from "./fitWindow";

describe("fitHeight", () => {
  it("leaves 24 under the box, so it ends clearly above the edge of the screen", () => {
    expect(FIT_GAP_PX).toBe(24);
  });

  it("fills the window from the box's top down to a small gap above its bottom", () => {
    expect(fitHeight({ windowHeight: 900, top: 150, tabBarHeight: 0 })).toBe(
      900 - 150 - FIT_GAP_PX,
    );
  });

  it("stops above the phone tab bar", () => {
    expect(fitHeight({ windowHeight: 800, top: 76, tabBarHeight: 60 })).toBe(
      800 - 76 - 60 - FIT_GAP_PX,
    );
  });

  it("never goes under its least height, however short the window", () => {
    expect(fitHeight({ windowHeight: 300, top: 150, tabBarHeight: 60 })).toBe(FIT_LEAST_PX);
  });

  it("gives whole pixels", () => {
    // 900.6 - 150.2 - 24 = 726.4, cut to 726.
    expect(fitHeight({ windowHeight: 900.6, top: 150.2, tabBarHeight: 0 })).toBe(726);
  });

  it("falls back to its least height when a measure isn't a number", () => {
    expect(fitHeight({ windowHeight: Number.NaN, top: 150, tabBarHeight: 0 })).toBe(FIT_LEAST_PX);
  });
});
