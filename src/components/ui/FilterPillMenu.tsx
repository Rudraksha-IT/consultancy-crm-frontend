"use client";

import { useRef } from "react";

import { LABELS } from "@/constants/messages";

import { Icon } from "./Icon";
import { MenuList } from "./MenuList";
import type { SelectOption } from "./SelectField";
import { useMenu } from "./useMenu";

type FilterPillMenuProps = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
};

/**
 * A filter that stands alone, on a phone (Tasks' Priority): a pill, 36 drawn inside a 44 tall
 * target, the name in grey before the choice. It is a button that opens a small menu, not a
 * select: an iPhone zooms the page in on a select with text under 16, and never on a button
 * (ticket 25). The chosen one is ticked; the cursor comes back to the pill.
 */
export function FilterPillMenu({ label, value, options, onChange }: FilterPillMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menu = useMenu(rootRef, buttonRef);
  const chosen = options.find((option) => option.value === value)?.label ?? "";

  return (
    <div ref={rootRef} onKeyDown={menu.handleKeyDown} className="relative inline-flex shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        aria-controls={menu.isOpen ? menu.menuId : undefined}
        aria-label={LABELS.filterChoice(label, chosen)}
        onClick={menu.toggle}
        className="group min-h-control inline-flex cursor-pointer items-center"
      >
        <span className="rounded-pill border-rule-2 bg-paper text-small group-active:bg-fill inline-flex min-h-9 items-center gap-3.5 border px-3.5 whitespace-nowrap">
          <span className="text-ink-3 font-medium">{label}</span>
          <span className="text-ink inline-flex items-center gap-2.5 font-semibold">
            {chosen}
            <Icon name="down" size="sm" className="text-ink-3" />
          </span>
        </span>
      </button>
      {menu.isOpen && (
        <MenuList
          id={menu.menuId}
          label={label}
          align="start"
          items={options.map((option) => ({
            label: option.label,
            isChosen: option.value === value,
            onSelect: () => {
              onChange(option.value);
            },
          }))}
          onChosen={menu.close}
        />
      )}
    </div>
  );
}
