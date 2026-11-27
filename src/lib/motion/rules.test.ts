import { canMove, changedRows, hasArrived, MAX_CHANGED_ROWS, startOffset } from ".";

describe("when a page counts as arrived", () => {
  it("arrives when the first page opens", () => {
    expect(hasArrived(null, "/students")).toBe(true);
  });

  it("arrives when another page opens", () => {
    expect(hasArrived("/students", "/tasks")).toBe(true);
    expect(hasArrived("/students", "/students/abc")).toBe(true);
  });

  it("does not arrive again on the same page", () => {
    expect(hasArrived("/students", "/students")).toBe(false);
  });

  it("does not arrive when only what the page shows changed (a tab, a filter)", () => {
    expect(hasArrived("/clock", "/clock?tab=wfh")).toBe(false);
    expect(hasArrived("/students?stage=lead", "/students#top")).toBe(false);
    expect(hasArrived("/students/", "/students")).toBe(false);
  });
});

describe("which rows count as new or changed", () => {
  it("finds a row that was added", () => {
    expect(changedRows(["Asha", "Bina"], ["Asha", "Chitra", "Bina"])).toEqual([1]);
  });

  it("finds a row whose words changed", () => {
    expect(changedRows(["Asha Lead", "Bina Lead"], ["Asha Lead", "Bina Counselling"])).toEqual([1]);
  });

  it("finds nothing when a row was only removed or the order changed", () => {
    expect(changedRows(["Asha", "Bina", "Chitra"], ["Chitra", "Asha"])).toEqual([]);
  });

  it("finds nothing in a list drawn for the first time", () => {
    expect(changedRows([], ["Asha", "Bina"])).toEqual([]);
  });

  it("finds nothing when the whole list was redrawn (another page of it)", () => {
    expect(changedRows(["Asha", "Bina"], ["Chitra", "Dipa"])).toEqual([]);
  });

  it("marks at most six rows; more than that is a redraw, not a change", () => {
    const before = ["kept"];
    const six = ["kept", "a", "b", "c", "d", "e", "f"];

    expect(changedRows(before, six)).toHaveLength(MAX_CHANGED_ROWS);
    expect(changedRows(before, [...six, "g"])).toEqual([]);
  });

  it("counts a second copy of the same words as new", () => {
    expect(changedRows(["Asha"], ["Asha", "Asha"])).toEqual([1]);
  });
});

describe("where a marker starts from", () => {
  const place = (left: number, top: number, width = 80) => ({ left, top, width });

  it("starts at its old place, as far back as it has come", () => {
    expect(startOffset(place(10, 0), place(130, 0))).toEqual({ dx: -120, dy: 0, scaleX: 1 });
    expect(startOffset(place(0, 200), place(0, 68))).toEqual({ dx: 0, dy: 132, scaleX: 1 });
  });

  it("starts as wide as the old one was", () => {
    expect(startOffset(place(0, 0, 60), place(100, 0, 120))).toEqual({
      dx: -100,
      dy: 0,
      scaleX: 0.5,
    });
  });

  it("does not move when it has not gone anywhere", () => {
    expect(startOffset(place(10, 10), place(11, 9))).toBeNull();
  });

  it("does not move when it was not on screen before, or is not now", () => {
    expect(startOffset(null, place(10, 10))).toBeNull();
    expect(startOffset(place(10, 10), null)).toBeNull();
    expect(startOffset(place(10, 10, 0), place(90, 10))).toBeNull();
    expect(startOffset(place(10, 10), place(90, 10, 0))).toBeNull();
  });
});

describe("less motion", () => {
  it("moves on a device that can and has not asked for less", () => {
    expect(canMove({ reducesMotion: false, canAnimate: true })).toBe(true);
  });

  it("turns everything off when the device asks for less motion", () => {
    expect(canMove({ reducesMotion: true, canAnimate: true })).toBe(false);
  });

  it("turns everything off where the browser cannot animate", () => {
    expect(canMove({ reducesMotion: false, canAnimate: false })).toBe(false);
  });
});
