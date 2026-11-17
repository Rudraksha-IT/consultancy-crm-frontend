"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent } from "react";

import { Icon } from "./Icon";
import type { MenuItem } from "./Menu";

const ITEM = '[role="menuitem"]';

const STEP_BY_KEY: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

type MenuListProps = {
  id: string;
  label: string;
  items: readonly MenuItem[];
  onChosen: () => void;
};

/** The open menu: focus starts on the first item and the arrow keys move between items. */
export function MenuList({ id, label, items, onChosen }: MenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(ITEM)?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const step = STEP_BY_KEY[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const buttons = [...(listRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])];
    const current = buttons.findIndex((button) => button === document.activeElement);
    buttons[(current + step + buttons.length) % buttons.length]?.focus();
  }

  return (
    <div
      ref={listRef}
      id={id}
      role="menu"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className="min-w-menu rounded-control border-rule bg-paper shadow-lift absolute top-full right-0 z-20 mt-2 grid gap-0.5 border p-2"
    >
      {items.map((item) => {
        const className = clsx(
          "min-h-side-item rounded-control text-body hover:bg-fill max-phone:active:bg-fill-2 flex cursor-pointer items-center gap-3 px-3.5 text-left",
          item.isDestructive === true ? "text-bad" : "text-ink",
        );
        const content = (
          <>
            {item.icon !== undefined && <Icon name={item.icon} />}
            {item.label}
          </>
        );
        return "href" in item ? (
          <Link
            key={item.label}
            href={item.href}
            role="menuitem"
            tabIndex={-1}
            onClick={onChosen}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onChosen();
              item.onSelect();
            }}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
