"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Icon } from "./Icon";

type InfoTipProps = {
  /** The button's name, e.g. "When they were Lost". */
  label: string;
  /** What the tip says; screen readers hear it as the button's description. */
  children: ReactNode;
};

/**
 * A small ⓘ button (44 square) with a tip. The tip shows on hover and on keyboard focus, and a tap
 * or click keeps it open; Escape or a tap outside closes it. Never hover-only.
 */
export function InfoTip({ label, children }: InfoTipProps) {
  const tipId = useId();
  const [isOpen, setIsOpen] = useState(false);
  // Escape hides the tip even while hovered or focused, until the pointer or focus leaves.
  const [isDismissed, setIsDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    // Escape closes it wherever focus is: a tap doesn't always move focus to the button.
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      setIsDismissed(true);
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsDismissed(true);
      }}
      onMouseLeave={() => {
        setIsDismissed(false);
      }}
      className="group relative inline-flex"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-describedby={tipId}
        aria-expanded={isOpen}
        onClick={() => {
          setIsDismissed(false);
          setIsOpen((open) => !open);
        }}
        onBlur={() => {
          setIsDismissed(false);
        }}
        className="peer size-control text-ink-3 hover:text-ink focus-visible:text-ink aria-expanded:text-ink -m-2.5 grid flex-none cursor-pointer place-items-center rounded-full"
      >
        <Icon name="info" size="sm" />
      </button>
      <div
        id={tipId}
        role="tooltip"
        data-open={isOpen}
        data-dismissed={isDismissed}
        className="rounded-control border-rule bg-paper text-secondary text-ink shadow-lift absolute top-full left-0 z-20 mt-1 hidden w-max max-w-80 min-w-60 border px-3.5 py-2.5 group-hover:block peer-focus-visible:block data-[dismissed=true]:hidden! data-[open=true]:block"
      >
        {children}
      </div>
    </div>
  );
}
