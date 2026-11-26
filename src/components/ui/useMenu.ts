"use client";

import { useEffect, useId, useState, type KeyboardEvent, type RefObject } from "react";

export type MenuState = {
  /** The open menu's id, for the button's `aria-controls`. */
  menuId: string;
  isOpen: boolean;
  toggle: () => void;
  /** Closes the menu and leaves the cursor where it is (the chosen item takes it elsewhere). */
  dismiss: () => void;
  /** Closes the menu and gives the cursor back to its button. */
  close: () => void;
  /** Escape closes the menu, back on its button. Goes on the root. */
  handleKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * A button that opens a small menu: one place for opening, Escape and a press outside. `rootRef`
 * is on the element that holds the button and the menu (a press outside it closes the menu);
 * `buttonRef` is on the button, which gets the cursor back.
 */
export function useMenu(
  rootRef: RefObject<HTMLElement | null>,
  buttonRef: RefObject<HTMLElement | null>,
): MenuState {
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, rootRef]);

  function close(): void {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  return {
    menuId,
    isOpen,
    toggle: () => {
      setIsOpen((open) => !open);
    },
    dismiss: () => {
      setIsOpen(false);
    },
    close,
    handleKeyDown: (event) => {
      if (event.key === "Escape" && isOpen) close();
    },
  };
}
