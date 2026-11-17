"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

import { SEARCH_TEXT } from "@/constants/search";
import { isSearchShortcut } from "@/lib/search";

/**
 * Ctrl K / ⌘ K or "/" puts the cursor in the search box (issue 49), except while someone is
 * typing in a field (the box included) or a dialog is open.
 */
export function useSearchShortcut(inputRef: RefObject<HTMLInputElement | null>): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!isSearchShortcut(event) || isBusy(event.target)) return;
      if (focusBox(inputRef.current)) event.preventDefault();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputRef]);
}

/**
 * Put the cursor in the box with its text selected. False when it can't take the cursor (it is
 * hidden at 1024px and below), so the key is left alone.
 */
function focusBox(input: HTMLInputElement | null): boolean {
  if (input === null) return false;
  input.focus();
  if (document.activeElement !== input) return false;
  input.select();
  return true;
}

function isBusy(target: EventTarget | null): boolean {
  return isTyping(target) || document.querySelector('[aria-modal="true"]') !== null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.closest("input, textarea, select") !== null;
}

function subscribeToNothing(): () => void {
  return () => undefined;
}

function isMacBrowser(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/** The hint shown in the box and the keys announced to screen readers: ⌘ on a Mac, else Ctrl. */
export function useShortcutHint(): { hint: string; keys: string } {
  const isMac = useSyncExternalStore(subscribeToNothing, isMacBrowser, () => false);
  return isMac
    ? { hint: SEARCH_TEXT.macShortcut, keys: "Meta+K /" }
    : { hint: SEARCH_TEXT.shortcut, keys: "Control+K /" };
}
