"use client";

import clsx from "clsx";
import { useRef } from "react";

import { LABELS } from "@/constants/messages";

import { Icon } from "./Icon";
import { MENU_IN_ROW_HOLDER, MenuList } from "./MenuList";
import type { SelectOption } from "./SelectField";
import { useMenu } from "./useMenu";

/** The pill drawn inside the button: the name in grey when it is shown, the choice, an arrow. */
function Pill({ name, chosen }: { name: string | null; chosen: string }) {
  return (
    <span className="rounded-pill border-rule-2 bg-paper text-small group-active:bg-fill inline-flex min-h-9 items-center gap-3.5 border px-3.5 whitespace-nowrap">
      {name !== null && <span className="text-ink-3 font-medium">{name}</span>}
      <span className="text-ink inline-flex items-center gap-2.5 font-semibold">
        {chosen}
        <Icon name="down" size="sm" className="text-ink-3" />
      </span>
    </span>
  );
}

/** The chosen option's words; nothing when the value is not one of the options. */
function chosenLabel(options: readonly SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

type FilterPillMenuProps = {
  label: string;
  /** Show the name in grey before the choice; otherwise it is only for screen readers. */
  isLabelShown: boolean;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
};

/**
 * A choice drawn as a pill on a phone (Tasks' Priority, a document's group in Configuration): 36
 * drawn inside a 44 tall target. It is a button that opens a small menu, not a select: an iPhone
 * zooms the page in on a select with text under 16, and never on a button (ticket 25). The chosen
 * one is ticked; the cursor comes back to the pill. The menu opens from the left of the pill's
 * row and stays on the screen, so that row takes `max-phone:relative` (see `MenuList isInRow`).
 */
export function FilterPillMenu(props: FilterPillMenuProps) {
  const { label, isLabelShown, value, options, onChange } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menu = useMenu(rootRef, buttonRef);
  const chosen = chosenLabel(options, value);

  return (
    <div
      ref={rootRef}
      onKeyDown={menu.handleKeyDown}
      className={clsx(MENU_IN_ROW_HOLDER, "w-fit shrink-0")}
    >
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
        <Pill name={isLabelShown ? label : null} chosen={chosen} />
      </button>
      {menu.isOpen && (
        <MenuList
          id={menu.menuId}
          label={label}
          isInRow
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
