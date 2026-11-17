import { KEYBOARD_TEXT } from "@/constants/keyboard";

/** What a key press needs to say whether it submits; a React or DOM keyboard event fits. */
export type KeyPress = {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  /** True while an input method is composing text, e.g. typing in another language. */
  isComposing: boolean;
};

/**
 * How a box of several lines submits (design system, Keyboard): the Inbox sends on Enter
 * (Shift + Enter makes a new line); every other box saves on Ctrl + Enter or ⌘ + Enter.
 */
export type SubmitMode = "enter" | "ctrlEnter";

const MODIFIERS_THAT_SUBMIT: Record<SubmitMode, (press: KeyPress) => boolean> = {
  enter: (press) => !press.shiftKey && !press.ctrlKey && !press.metaKey,
  ctrlEnter: (press) => press.ctrlKey || press.metaKey,
};

/** Whether `press` submits the form in `mode`. Composing text never submits. */
export function isSubmitKey(press: KeyPress, mode: SubmitMode): boolean {
  return press.key === "Enter" && !press.isComposing && MODIFIERS_THAT_SUBMIT[mode](press);
}

/** What the browser says about the computer; `navigator` fits. */
export type PlatformInfo = {
  platform?: string;
  userAgentData?: { platform: string } | undefined;
};

const APPLE_PLATFORM = /mac|iphone|ipad|ipod/i;

/** Whether this is a Mac, iPhone or iPad, where ⌘ takes the place of Ctrl. */
export function isApplePlatform(info: PlatformInfo): boolean {
  const name = info.userAgentData?.platform ?? info.platform ?? "";
  return APPLE_PLATFORM.test(name);
}

/** What the button the keys press does: "save" for most forms, "send" for a message. */
export type SubmitAction = "save" | "send";

type HintOptions = { isApple: boolean; action: SubmitAction; canEscape?: boolean };

/** The hint beside the Save button, e.g. "Ctrl + Enter to save, Escape to cancel". */
export function submitKeysHint({ isApple, action, canEscape = false }: HintOptions): string {
  const modifier = isApple ? KEYBOARD_TEXT.command : KEYBOARD_TEXT.ctrl;
  const enter = KEYBOARD_TEXT.enterTo(modifier, action);
  return canEscape ? `${enter}, ${KEYBOARD_TEXT.escapeToCancel}` : enter;
}
