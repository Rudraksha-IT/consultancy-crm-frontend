import { useCallback, type KeyboardEvent } from "react";

import { isSubmitKey, type SubmitMode } from "@/lib/keyboard/submitKey";

type SubmitKeysOptions = {
  /** "ctrlEnter" (the default) for every box but the Inbox, which sends on Enter. */
  mode?: SubmitMode;
  /** Escape cancels, e.g. editing the Note. Left out, Escape is left alone (a dialog closes). */
  onEscape?: (() => void) | undefined;
};

/**
 * The one keyboard rule for every box of several lines (design system, Keyboard): the submit
 * keys press the form's own submit button, so the form saves exactly as if it were clicked, and
 * nothing happens while that button can't be used (e.g. while saving). Typing in another
 * language never submits or cancels. Returns the box's key-down handler.
 */
export function useSubmitKeys({ mode = "ctrlEnter", onEscape }: SubmitKeysOptions = {}) {
  return useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      const isComposing = event.nativeEvent.isComposing;
      if (isSubmitKey({ ...event, isComposing }, mode)) {
        event.preventDefault();
        pressSubmit(event.currentTarget.form);
        return;
      }
      if (event.key === "Escape" && onEscape !== undefined && !isComposing) {
        event.preventDefault();
        onEscape();
      }
    },
    [mode, onEscape],
  );
}

/** Submit `form` through its first submit button (also one outside it, linked by `form`). */
function pressSubmit(form: HTMLFormElement | null): void {
  if (form === null) return;
  const button = Array.from(form.elements).find(isSubmitButton);
  if (button?.disabled === true) return;
  form.requestSubmit(button);
}

function isSubmitButton(element: Element): element is HTMLButtonElement {
  return element instanceof HTMLButtonElement && element.type === "submit";
}
