import { isApplePlatform, isSubmitKey, submitKeysHint, type KeyPress } from "./submitKey";

function press(key: string, extra: Partial<KeyPress> = {}): KeyPress {
  return { key, shiftKey: false, ctrlKey: false, metaKey: false, isComposing: false, ...extra };
}

describe("isSubmitKey in the Inbox (Enter sends)", () => {
  it("sends on Enter", () => {
    expect(isSubmitKey(press("Enter"), "enter")).toBe(true);
  });

  it("makes a new line on Shift + Enter", () => {
    expect(isSubmitKey(press("Enter", { shiftKey: true }), "enter")).toBe(false);
  });

  it("never sends while typing in another language", () => {
    expect(isSubmitKey(press("Enter", { isComposing: true }), "enter")).toBe(false);
  });

  it("ignores other keys", () => {
    expect(isSubmitKey(press("a"), "enter")).toBe(false);
  });
});

describe("isSubmitKey elsewhere (Ctrl + Enter saves)", () => {
  it("saves on Ctrl + Enter and ⌘ + Enter", () => {
    expect(isSubmitKey(press("Enter", { ctrlKey: true }), "ctrlEnter")).toBe(true);
    expect(isSubmitKey(press("Enter", { metaKey: true }), "ctrlEnter")).toBe(true);
  });

  it("makes a new line on Enter", () => {
    expect(isSubmitKey(press("Enter"), "ctrlEnter")).toBe(false);
  });

  it("never saves while composing", () => {
    expect(isSubmitKey(press("Enter", { ctrlKey: true, isComposing: true }), "ctrlEnter")).toBe(
      false,
    );
  });
});

describe("isApplePlatform", () => {
  it("is true on a Mac, iPhone or iPad", () => {
    expect(isApplePlatform({ platform: "MacIntel" })).toBe(true);
    expect(isApplePlatform({ platform: "iPad" })).toBe(true);
    expect(isApplePlatform({ platform: "", userAgentData: { platform: "macOS" } })).toBe(true);
  });

  it("is false elsewhere or when the browser doesn't say", () => {
    expect(isApplePlatform({ platform: "Win32" })).toBe(false);
    expect(isApplePlatform({ platform: "Linux x86_64" })).toBe(false);
    expect(isApplePlatform({ userAgentData: { platform: "Windows" } })).toBe(false);
    expect(isApplePlatform({})).toBe(false);
  });
});

describe("submitKeysHint", () => {
  it("names Ctrl, or ⌘ on a Mac, and the action", () => {
    expect(submitKeysHint({ isApple: false, action: "save" })).toBe("Ctrl + Enter to save");
    expect(submitKeysHint({ isApple: true, action: "save" })).toBe("⌘ + Enter to save");
    expect(submitKeysHint({ isApple: false, action: "send" })).toBe("Ctrl + Enter to send");
  });

  it("adds Escape where it cancels", () => {
    expect(submitKeysHint({ isApple: false, action: "save", canEscape: true })).toBe(
      "Ctrl + Enter to save, Escape to cancel",
    );
  });
});
