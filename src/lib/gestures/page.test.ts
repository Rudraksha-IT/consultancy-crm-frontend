import { hasFocusedField, isDialogOpen, isInSidewaysScroller, isInUpDownScroller } from "./page";

function box({ scrollWidth, overflowX }: { scrollWidth: number; overflowX: string }): HTMLElement {
  const element = document.createElement("div");
  element.style.overflowX = overflowX;
  Object.defineProperty(element, "scrollWidth", { value: scrollWidth });
  Object.defineProperty(element, "clientWidth", { value: 600 });
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("isInSidewaysScroller", () => {
  it("finds a wide table's scrolling box from anything inside it", () => {
    const table = box({ scrollWidth: 1200, overflowX: "auto" });
    const cell = document.createElement("span");
    table.append(cell);

    expect(isInSidewaysScroller(cell)).toBe(true);
    expect(isInSidewaysScroller(box({ scrollWidth: 1200, overflowX: "scroll" }))).toBe(true);
  });

  it("ignores a box that fits, or that clips instead of scrolling", () => {
    expect(isInSidewaysScroller(box({ scrollWidth: 601, overflowX: "auto" }))).toBe(false);
    expect(isInSidewaysScroller(box({ scrollWidth: 1200, overflowX: "hidden" }))).toBe(false);
  });

  it("is false for no target, or one that isn't an element", () => {
    expect(isInSidewaysScroller(null)).toBe(false);
    expect(isInSidewaysScroller(window)).toBe(false);
  });
});

describe("isDialogOpen", () => {
  it("is true only while a dialog is open", () => {
    expect(isDialogOpen()).toBe(false);
    const dialog = document.createElement("div");
    dialog.setAttribute("aria-modal", "true");
    document.body.append(dialog);

    expect(isDialogOpen()).toBe(true);
  });
});

function tallBox({ scrollHeight, overflowY }: { scrollHeight: number; overflowY: string }) {
  const element = document.createElement("div");
  element.style.overflowY = overflowY;
  Object.defineProperty(element, "scrollHeight", { value: scrollHeight });
  Object.defineProperty(element, "clientHeight", { value: 300 });
  document.body.append(element);
  return element;
}

describe("isInUpDownScroller", () => {
  it("finds a list's own scrolling box from anything inside it", () => {
    const list = tallBox({ scrollHeight: 900, overflowY: "auto" });
    const row = document.createElement("span");
    list.append(row);

    expect(isInUpDownScroller(row)).toBe(true);
  });

  it("ignores a box that fits or clips, and the page itself", () => {
    expect(isInUpDownScroller(tallBox({ scrollHeight: 301, overflowY: "auto" }))).toBe(false);
    expect(isInUpDownScroller(tallBox({ scrollHeight: 900, overflowY: "hidden" }))).toBe(false);
    expect(isInUpDownScroller(document.body)).toBe(false);
    expect(isInUpDownScroller(null)).toBe(false);
  });
});

describe("hasFocusedField", () => {
  function focused(element: HTMLElement): boolean {
    document.body.append(element);
    element.focus();
    return hasFocusedField();
  }

  it("is true while a text box, text area, select or editable area has focus", () => {
    expect(focused(document.createElement("input"))).toBe(true);
    expect(focused(document.createElement("textarea"))).toBe(true);
    expect(focused(document.createElement("select"))).toBe(true);
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.tabIndex = 0;
    expect(focused(editable)).toBe(true);
  });

  it("is false with nothing focused, or a button or link focused", () => {
    expect(hasFocusedField()).toBe(false);
    expect(focused(document.createElement("button"))).toBe(false);
  });

  it("is false for a ticked box: it takes no typing", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    expect(focused(checkbox)).toBe(false);
  });
});
