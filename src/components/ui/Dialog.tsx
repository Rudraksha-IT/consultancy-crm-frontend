"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { LABELS } from "@/constants/messages";

import { IconButton } from "./IconButton";

const FIRST_FIELD = "input:not([type=hidden]):not([readonly]), select, textarea";
/** A control marked to take focus first, e.g. Cancel in a confirm dialog. */
const FIRST_FOCUS = "[data-first-focus]";

type DialogProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The actions, shown on the right of the footer. */
  footer?: ReactNode;
  /** Wider, for a list such as a Student's document checklist. */
  isWide?: boolean;
  /** Printing the page prints only this dialog's body, e.g. a receipt. */
  isPrintable?: boolean;
  /**
   * Near full screen with a fixed height, e.g. the email composer: the body has no padding and
   * its children lay out and scroll their own areas.
   */
  isFull?: boolean;
  /** Shown in the header between the title and the close button, e.g. Write / Preview. */
  headerAside?: ReactNode;
};

/**
 * A modal dialog. Escape, the close button or a click outside close it. On phones it is a bottom
 * sheet: full width, rounded top corners and a grab handle; the content scrolls while the header
 * and the buttons stay in view, and the buttons share the width (design system: Phones).
 */
export function Dialog(props: DialogProps) {
  if (!props.isOpen) return null;
  return createPortal(<OpenDialog {...props} />, document.body);
}

function OpenDialog(props: DialogProps) {
  const { title, onClose, children, footer, isWide, isPrintable, isFull, headerAside } = props;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Escape still closes it when focus has left it, e.g. after its focused button was disabled
  // while saving. Inside, the overlay's own handler does it, so a menu inside can use Escape.
  useEffect(() => {
    function closeOnEscape(event: globalThis.KeyboardEvent): void {
      const isInside = event.target instanceof Node && overlayRef.current?.contains(event.target);
      if (event.key === "Escape" && isInside !== true) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement;
    const panel = panelRef.current;
    if (panel !== null) firstFocusIn(panel)?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Escape") return;
    // A dialog over another one (a confirm over a class) closes only itself.
    event.stopPropagation();
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      {...printMark(isPrintable)}
      className="bg-scrim max-phone:items-end max-phone:p-0 fixed inset-0 z-50 grid place-items-center p-4 print:static print:block print:bg-transparent print:p-0"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={panelClasses(isWide, isFull)}
      >
        <div
          aria-hidden="true"
          data-grab-handle=""
          className="phone:hidden bg-rule-2 rounded-pill h-grab-h w-grab mx-auto mt-2 flex-none print:hidden"
        />
        <header
          className={clsx(
            "phone:px-8 max-phone:flex-none max-phone:px-4 max-phone:pt-3 flex items-center justify-between gap-4 px-5 print:hidden",
            isFull === true
              ? "border-rule max-phone:flex-wrap flex-none border-b pt-5 pb-4"
              : "pt-7 pb-1",
          )}
        >
          <h2 id={titleId} className="text-section-title min-w-0 truncate">
            {title}
          </h2>
          {headerAside !== undefined && (
            <div className="max-phone:order-last max-phone:basis-full ml-auto">{headerAside}</div>
          )}
          <IconButton icon="x" label={LABELS.close} onClick={onClose} />
        </header>
        <div
          data-dialog-body=""
          className={
            isFull === true
              ? "min-h-0 flex-1 overflow-hidden"
              : "phone:px-8 max-phone:min-h-0 max-phone:flex-1 max-phone:overflow-y-auto max-phone:overscroll-contain max-phone:px-4 max-phone:pb-5 grid gap-5 px-5 pt-5 pb-7 print:p-0"
          }
        >
          {children}
        </div>
        {footer !== undefined && (
          <footer className="border-rule bg-fill phone:px-8 max-phone:flex-none max-phone:gap-2 max-phone:px-4 max-phone:pt-3 max-phone:pb-sheet-safe max-phone:*:flex-1 flex flex-none flex-wrap justify-end gap-3 border-t px-5 py-5 print:hidden">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/** The marked control, else the first field, else the first button (the close button). */
function firstFocusIn(panel: HTMLElement): HTMLElement | null {
  return (
    panel.querySelector<HTMLElement>(FIRST_FOCUS) ??
    panel.querySelector<HTMLElement>(FIRST_FIELD) ??
    panel.querySelector("button")
  );
}

/** The attribute that makes printing show only this dialog (see globals.css). */
function printMark(isPrintable: boolean | undefined): { "data-print"?: "" } {
  return isPrintable === true ? { "data-print": "" } : {};
}

function panelClasses(isWide: boolean | undefined, isFull: boolean | undefined): string {
  return clsx(
    "rounded-dialog bg-paper shadow-lift max-h-full w-full overflow-auto",
    "max-phone:max-w-none max-phone:max-h-sheet max-phone:rounded-t-sheet max-phone:rounded-b-none max-phone:animate-sheet-up max-phone:flex max-phone:flex-col max-phone:overflow-hidden",
    "print:max-h-none print:max-w-none print:overflow-visible print:shadow-none",
    isFull === true
      ? "max-w-composer h-composer max-phone:h-sheet flex flex-col overflow-hidden"
      : isWide === true
        ? "max-w-dialog-wide"
        : "max-w-dialog",
  );
}
