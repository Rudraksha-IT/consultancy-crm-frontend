"use client";

import clsx from "clsx";
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
  /**
   * On a phone the button is its icon alone, 44 square (the word stays for screen readers): for
   * a menu that sits beside a title, such as a Student's name.
   */
  isIconOnPhone?: boolean;
};

/** The icon alone, in a 44 square, on a phone. */
const ICON_ON_PHONE = "max-phone:min-w-control max-phone:justify-center max-phone:px-0";

function buttonLook(isIconOnPhone: boolean): string {
  return clsx(buttonClasses("secondary", "md"), isIconOnPhone && ICON_ON_PHONE);
}

/** The word is drawn beside the icon, or kept only for screen readers on a phone. */
function wordLook(isIconOnPhone: boolean): string | undefined {
  return isIconOnPhone ? "max-phone:sr-only" : undefined;
}

/**
 * The "More" menu for rare actions, in a page's action row. On phones it opens from the left of
 * that row and stays on the screen (see `MenuList`).
 */
export function Menu({ label, items, isIconOnPhone = false }: MenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menu = useMenu(rootRef, buttonRef);
  const ordered = [
    ...items.filter((item) => item.isDestructive !== true),
    ...items.filter((item) => item.isDestructive === true),
  ];

  return (
    <div ref={rootRef} data-menu="" onKeyDown={menu.handleKeyDown} className={MENU_IN_ROW_HOLDER}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        aria-controls={menu.isOpen ? menu.menuId : undefined}
        onClick={menu.toggle}
        className={buttonLook(isIconOnPhone)}
      >
        <Icon name="more" size="sm" />
        <span className={wordLook(isIconOnPhone)}>{label}</span>
      </button>
      {menu.isOpen && (
        <MenuList id={menu.menuId} label={label} items={ordered} onChosen={menu.close} isInRow />
      )}
    </div>
  );
}
