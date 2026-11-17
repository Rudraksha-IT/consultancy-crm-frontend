import { isSearchShortcut, nextResultIndex, studentListHref } from "./search";

const PLAIN = { ctrlKey: false, metaKey: false, altKey: false };

describe("isSearchShortcut", () => {
  it.each([
    [{ ...PLAIN, key: "k", ctrlKey: true }, true],
    [{ ...PLAIN, key: "K", ctrlKey: true }, true],
    [{ ...PLAIN, key: "k", metaKey: true }, true],
    [{ ...PLAIN, key: "/" }, true],
    [{ ...PLAIN, key: "k" }, false],
    [{ ...PLAIN, key: "/", ctrlKey: true }, false],
    [{ ...PLAIN, key: "/", altKey: true }, false],
    [{ ...PLAIN, key: "j", ctrlKey: true }, false],
  ])("%o is the shortcut: %s", (keys, expected) => {
    expect(isSearchShortcut(keys)).toBe(expected);
  });
});

describe("nextResultIndex", () => {
  it("moves down from the box to the first result and stops at the last", () => {
    expect(nextResultIndex(3, -1, "ArrowDown")).toBe(0);
    expect(nextResultIndex(3, 1, "ArrowDown")).toBe(2);
    expect(nextResultIndex(3, 2, "ArrowDown")).toBe(2);
  });

  it("moves up, and from the first result back to the box", () => {
    expect(nextResultIndex(3, 2, "ArrowUp")).toBe(1);
    expect(nextResultIndex(3, 0, "ArrowUp")).toBe(-1);
    expect(nextResultIndex(3, -1, "ArrowUp")).toBe(-1);
  });
});

describe("studentListHref", () => {
  it("opens the Student list with the search, encoded", () => {
    expect(studentListHref("sita & ram")).toBe("/students?q=sita+%26+ram");
  });
});
