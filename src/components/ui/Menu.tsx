"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { buttonClasses } from "./buttonStyles";
import { Icon, type IconName } from "./Icon";
import { MenuList } from "./MenuList";

/** One item: an action, or a link to another page (e.g. "Edit details"). */
export type MenuItem = {
  label: string;
  icon?: IconName;
  /** Destructive items always sit last, in red. */
  isDestructive?: boolean;
  /** For a choice of one (e.g. a Priority): whether this is the one chosen now. */
  isChosen?: boolean;
} & ({ onSelect: () => void } | { href: string });

type MenuProps = {
  label: string;
  items: readonly MenuItem[];
};

/** The "More" menu for rare actions. */
export function Menu({ label, items }: MenuProps) {
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ordered = [
    ...items.filter((item) => item.isDestructive !== true),
    ...items.filter((item) => item.isDestructive === true),
  ];

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
  }, [isOpen]);

  function close(): void {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") close();
  }

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        className={buttonClasses("secondary", "md")}
      >
        <Icon name="more" size="sm" />
        {label}
      </button>
      {isOpen && (
        <MenuList
          id={menuId}
          label={label}
          items={ordered}
          onChosen={() => {
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
