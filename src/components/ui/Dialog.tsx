"use client";

import clsx from "clsx";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { LABELS } from "@/constants/messages";
import { movesNow } from "@/lib/motion";

import { IconButton } from "./IconButton";
import { useLeaving } from "./useMovement";

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
  /** Every text a size smaller, e.g. the email writer (list tidy-ups 31). */
  hasSmallText?: boolean;
  /** Shown in the header between the title and the close button, e.g. Write / Preview. */
  headerAside?: ReactNode;
};

/** The dialog that opened in the change being drawn right now, if one did. */
let justOpened: HTMLElement | null = null;

/**
 * Whether a dialog that closed shows its copy fading out. Not when another dialog opened in the
 * same change (the steps of a board move): that one takes its place and only cross-fades.
 */
function leavesAlone(): boolean {
  if (justOpened === null) return true;
  justOpened.dataset.move = "next";
  return false;
}

/**
 * How a dialog comes and goes (design system: Movement): it fades in and rises with its shade
 * (a sheet from the bottom on phones), and a copy of it fades out when it closes, so the page
 * under it is usable at once. With less motion it opens and closes at once.
 */
function useDialogMovement(overlayRef: { current: HTMLDivElement | null }): void {
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (overlay === null || !movesNow()) return;
    overlay.dataset.move = "open";
    justOpened = overlay;
    queueMicrotask(() => {
      if (justOpened === overlay) justOpened = null;
    });
  }, [overlayRef]);
  useLeaving(overlayRef, "dialog", leavesAlone);
}

/**
 * A modal dialog. Escape, the close button or a click outside close it. Only its middle scrolls:
 * the header and the buttons stay in view, with a thin line above the buttons. On phones it is a
 * bottom sheet: full width, rounded top corners and a grab handle, and the buttons share the
 * width (design system: Dialog, and Phones).
 */
export function Dialog(props: DialogProps) {
  if (!props.isOpen) return null;
  return createPortal(<OpenDialog {...props} />, document.body);
}

function OpenDialog(props: DialogProps) {
  const { title, onClose, children, footer, isPrintable, isFull, headerAside } = props;
  const width = widthOf(props);
  const look = isFull === true ? FULL_LOOK : LOOK;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  useDialogMovement(overlayRef);

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
        data-panel=""
        aria-modal="true"
        aria-labelledby={titleId}
        {...smallText(props.hasSmallText)}
        className={panelClasses(width, isFull)}
      >
        <div
          aria-hidden="true"
          data-grab-handle=""
          className="phone:hidden bg-rule-2 rounded-pill h-grab-h w-grab mx-auto mt-2 flex-none print:hidden"
        />
        <header
          className={clsx(
            "phone:px-8 max-phone:px-4 flex flex-none items-center justify-between gap-4 px-5 print:hidden",
            look.header,
          )}
        >
          <h2 id={titleId} className="text-dialog-title max-phone:flex-1 min-w-0 truncate">
            {title}
          </h2>
          {headerAside !== undefined && <div className={look.aside}>{headerAside}</div>}
          <IconButton icon="x" label={LABELS.close} onClick={onClose} />
        </header>
        <div data-dialog-body="" className={look.body}>
          {children}
        </div>
        {footer !== undefined && (
          <footer
            className={clsx(
              "phone:px-6 max-phone:gap-2 max-phone:px-4 max-phone:pt-3 max-phone:pb-sheet-safe max-phone:*:flex-1 flex flex-none flex-wrap justify-end px-5 print:hidden",
              look.footer,
            )}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

type Look = { header: string; aside: string; body: string; footer: string };

/**
 * A dialog's parts. Only the body scrolls, and above phone width a thin line parts the buttons
 * from the body that scrolls over them (UI revamp 23).
 */
const LOOK: Look = {
  // On phones what sits between the title and the close button takes its own second line.
  header: "phone:pb-3 max-phone:flex-wrap max-phone:pt-3 pt-7 pb-1",
  aside: "max-phone:order-last max-phone:basis-full ml-auto",
  body: "phone:px-8 max-phone:px-4 max-phone:pb-5 grid min-h-0 flex-1 gap-5 overflow-y-auto overscroll-contain px-5 pt-5 pb-7 print:overflow-visible print:p-0",
  footer: "phone:border-t border-rule phone:pt-3.5 phone:pb-4.5 gap-2",
};

/**
 * The email writer's parts: its body lays out and scrolls its own areas. On phones (UI revamp 23)
 * the title and the close button share the first line and what sits between them (Write /
 * Preview) takes the second, with no line under it; the form starts under them.
 */
const FULL_LOOK: Look = {
  header:
    "border-rule border-b pt-5 pb-4 max-phone:grid max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:gap-y-0.5 max-phone:border-b-0 max-phone:pt-2 max-phone:pr-3 max-phone:pb-0",
  aside: "ml-auto max-phone:col-span-full max-phone:row-start-2 max-phone:ml-0",
  body: "min-h-0 flex-1 overflow-hidden",
  footer: "gap-1 pt-1 pb-5",
};

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

/** Marks a dialog whose text is a size smaller (globals.css, "Small text in a dialog"). */
function smallText(hasSmallText: boolean | undefined): { "data-small-text"?: "" } {
  return hasSmallText === true ? { "data-small-text": "" } : {};
}

function widthOf({ isWide }: DialogProps): keyof typeof WIDTHS {
  return isWide === true ? "wide" : "normal";
}

const WIDTHS = {
  normal: "max-w-dialog",
  wide: "max-w-dialog-wide",
} as const;

function panelClasses(width: keyof typeof WIDTHS, isFull: boolean | undefined): string {
  return clsx(
    // Only the middle scrolls: the title and the buttons stay in view (UI revamp 23).
    "rounded-dialog bg-paper shadow-lift flex max-h-full w-full flex-col overflow-hidden",
    "max-phone:max-w-none max-phone:max-h-sheet max-phone:rounded-t-sheet max-phone:rounded-b-none",
    "print:block print:max-h-none print:max-w-none print:overflow-visible print:shadow-none",
    isFull === true ? "max-w-composer h-composer max-phone:h-sheet" : WIDTHS[width],
  );
}
