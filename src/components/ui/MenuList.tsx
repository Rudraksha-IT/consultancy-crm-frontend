"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Icon } from "./Icon";
import type { MenuItem } from "./Menu";
import { useLeaving } from "./useMovement";

const ITEM = '[role="menuitem"], [role="menuitemradio"]';

const STEP_BY_KEY: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

type MenuListProps = {
  id: string;
  label: string;
  items: readonly MenuItem[];
  onChosen: () => void;
  /** Which edge of its button the menu lines up with: the end (default) or the start. */
  align?: "start" | "end";
  /** Show the label as a small title above the items. */
  hasTitle?: boolean;
  /** Something above the items that is not one of them, such as whose menu it is. */
  header?: ReactNode;
  /**
   * The menu is in a page's action row (Priority, More). On phones it then opens from the left
   * of that row, under its button, and is never wider than the screen less the page's margins,
   * so it can't run off the screen (UI revamp 23). Its holder takes `MENU_IN_ROW_HOLDER`.
   */
  isInRow?: boolean;
};

/**
 * For the element that holds a button and its menu in an action row: the menu is placed from it
 * above phone width, and from the row (the nearest placed element around it) on phones.
 */
export const MENU_IN_ROW_HOLDER = "relative max-phone:static";

const IN_ROW_ON_PHONES =
  "max-phone:top-auto max-phone:right-auto max-phone:left-0 max-phone:max-w-menu-phone";

/** Where the menu opens: under its button, from the chosen edge (from its row on phones). */
function placeOf(align: "start" | "end", isInRow: boolean): string {
  return clsx(
    "min-w-menu rounded-menu border-rule bg-paper shadow-lift absolute top-full z-20 mt-2 grid gap-0.5 border p-2",
    align === "end" ? "right-0" : "left-0",
    isInRow && IN_ROW_ON_PHONES,
  );
}

/** The open menu: focus starts on the first item and the arrow keys move between items. */
export function MenuList({
  id,
  label,
  items,
  onChosen,
  align = "end",
  hasTitle = false,
  header,
  isInRow = false,
}: MenuListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  // It opens from its button and a copy fades out as it closes (design system: Movement).
  useLeaving(listRef, "pop");

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
      data-move="pop"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={placeOf(align, isInRow)}
    >
      {hasTitle && (
        <p aria-hidden="true" className="text-small text-ink-3 px-3.5 pt-1 pb-1.5 font-semibold">
          {label}
        </p>
      )}
      {header}
      {items.map((item) => (
        <MenuListItem key={item.label} item={item} onChosen={onChosen} />
      ))}
    </div>
  );
}

type MenuListItemProps = { item: MenuItem; onChosen: () => void };

/** One item: a link, an action, or one choice of several (shown ticked when chosen). */
function MenuListItem({ item, onChosen }: MenuListItemProps) {
  const className = clsx(
    "min-h-side-item rounded-control text-body hover:bg-fill max-phone:active:bg-fill-2 flex cursor-pointer items-center gap-3 px-3.5 text-left",
    item.isDestructive === true ? "text-bad" : "text-ink",
  );
  const content = <ItemContent item={item} />;
  if ("href" in item) {
    return (
      <Link href={item.href} role="menuitem" tabIndex={-1} onClick={onChosen} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      {...choiceRole(item.isChosen)}
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
}

/** A plain item, or one choice of several that says whether it is the chosen one. */
function choiceRole(isChosen: boolean | undefined) {
  return isChosen === undefined
    ? { role: "menuitem" }
    : { role: "menuitemradio", "aria-checked": isChosen };
}

/** The item's label, with its hint on a quieter line underneath when it has one. */
function ItemLabel({ label, hint }: { label: string; hint: string | undefined }) {
  if (hint === undefined) return label;
  return (
    <span className="grid py-2">
      <span className="font-semibold">{label}</span>
      <span className="text-secondary text-ink-2">{hint}</span>
    </span>
  );
}

/** The dot or icon, the label (and hint), and a tick when it is the chosen one. */
function ItemContent({ item }: { item: MenuItem }) {
  return (
    <>
      {item.dot !== undefined && (
        <span aria-hidden="true" className={clsx("size-2.5 shrink-0 rounded-full", item.dot)} />
      )}
      {item.icon !== undefined && <Icon name={item.icon} />}
      <ItemLabel label={item.label} hint={item.hint} />
      {item.isChosen === true && <Icon name="check" className="text-accent ml-auto" />}
    </>
  );
}
