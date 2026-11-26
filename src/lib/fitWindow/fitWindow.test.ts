import { FIT_GAP_PX, FIT_LEAST_PX, fitHeight } from "./fitWindow";

describe("fitHeight", () => {
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
    expect(fitHeight({ windowHeight: 900.6, top: 150.2, tabBarHeight: 0 })).toBe(734);
  });

  it("falls back to its least height when a measure isn't a number", () => {
    expect(fitHeight({ windowHeight: Number.NaN, top: 150, tabBarHeight: 0 })).toBe(FIT_LEAST_PX);
  });
});
