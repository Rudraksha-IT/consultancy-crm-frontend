"use client";

import { useRef } from "react";

import { buttonClasses } from "./buttonStyles";
import { Icon, type IconName } from "./Icon";
import { MENU_IN_ROW_HOLDER, MenuList } from "./MenuList";
import { useMenu } from "./useMenu";

/** One item: an action, or a link to another page (e.g. "Edit details"). */
export type MenuItem = {
  label: string;
  icon?: IconName;
  /** Destructive items always sit last, in red. */
  isDestructive?: boolean;
  /** For a choice of one (e.g. a Priority): whether this is the one chosen now. */
  isChosen?: boolean;
  /** A short line under the label saying what the choice means. */
  hint?: string;
  /** A small coloured dot before the label (a colour class, e.g. "bg-bad"). */
  dot?: string;
} & ({ onSelect: () => void } | { href: string });

type MenuProps = {
  label: string;
  items: readonly MenuItem[];
};

/**
 * The "More" menu for rare actions, in a page's action row. On phones it opens from the left of
 * that row and stays on the screen (see `MenuList`).
 */
export function Menu({ label, items }: MenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menu = useMenu(rootRef, buttonRef);
  const ordered = [
    ...items.filter((item) => item.isDestructive !== true),
    ...items.filter((item) => item.isDestructive === true),
  ];

  return (
    <div ref={rootRef} onKeyDown={menu.handleKeyDown} className={MENU_IN_ROW_HOLDER}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        aria-controls={menu.isOpen ? menu.menuId : undefined}
        onClick={menu.toggle}
        className={buttonClasses("secondary", "md")}
      >
        <Icon name="more" size="sm" />
        {label}
      </button>
      {menu.isOpen && (
        <MenuList id={menu.menuId} label={label} items={ordered} onChosen={menu.dismiss} isInRow />
      )}
    </div>
  );
}
