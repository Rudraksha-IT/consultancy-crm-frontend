"use client";

import { createContext, useContext, useId, useSyncExternalStore, type ReactNode } from "react";

import { isApplePlatform, submitKeysHint, type SubmitAction } from "@/lib/keyboard/submitKey";

/** The id of the keyboard hint in this form, so its boxes of several lines are described by it. */
const SubmitKeysHintIdContext = createContext<string | undefined>(undefined);

/** Wraps a form and its Save button, linking the form's text boxes to the hint beside it. */
export function SubmitKeysScope({ children }: { children: ReactNode }) {
  const id = useId();
  return <SubmitKeysHintIdContext value={id}>{children}</SubmitKeysHintIdContext>;
}

/** The id of the hint in the scope around, or undefined outside one. */
export function useSubmitKeysHintId(): string | undefined {
  return useContext(SubmitKeysHintIdContext);
}

type SubmitKeysHintProps = {
  action: SubmitAction;
  /** Escape cancels too, as when editing the Note. */
  canEscape?: boolean;
};

/**
 * "Ctrl + Enter to save" (⌘ on a Mac), placed beside the Save button. Phones have no Ctrl key, so
 * there the buttons have the row to themselves.
 */
export function SubmitKeysHint({ action, canEscape = false }: SubmitKeysHintProps) {
  const id = useSubmitKeysHintId();
  const isApple = useIsApple();
  return (
    <span id={id} className="text-small text-ink-2 max-phone:hidden self-center">
      {submitKeysHint({ isApple, action, canEscape })}
    </span>
  );
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

/** Whether this is an Apple computer; the server and first render say no, so they match. */
function useIsApple(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => isApplePlatform(navigator),
    () => false,
  );
}
