/** Words for the keyboard hints beside a form's Save or Send button (design system, Keyboard). */
export const KEYBOARD_TEXT = {
  ctrl: "Ctrl",
  command: "⌘",
  enterTo: (modifier: string, action: string) => `${modifier} + Enter to ${action}`,
  escapeToCancel: "Escape to cancel",
} as const;
