"use client";

import { useEffect, useRef } from "react";

import { SELECTION_TEXT } from "@/constants/exports";

import type { RowSelection } from "./useRowSelection";

// The box draws at 22 px; the label around it is the 44 px square that ticks it.
const HIT = "size-control grid cursor-pointer place-items-center";
const BOX = "accent-accent size-5.5 cursor-pointer";
const CELL = "w-control px-2 align-middle";

type TickBoxProps = {
  label: string;
  isChecked: boolean;
  isMixed?: boolean;
  onChange: () => void;
};

/**
 * A row checkbox in its own 44 px square. Rows open their Student only through the Student's
 * link, so ticking never opens it.
 */
function TickBox({ label, isChecked, isMixed = false, onChange }: TickBoxProps) {
  return (
    <label className={HIT}>
      <Box label={label} isChecked={isChecked} isMixed={isMixed} onChange={onChange} />
    </label>
  );
}

function Box({
  label,
  isChecked,
  isMixed = false,
  onChange,
}: Partial<TickBoxProps> & {
  isChecked: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current !== null) ref.current.indeterminate = isMixed;
  }, [isMixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={isChecked}
      onChange={onChange}
      className={BOX}
    />
  );
}

/** The header cell that ticks every row on the page (shown from tablet width up). */
export function SelectAllHeader({ selection }: { selection: RowSelection }) {
  return (
    <th scope="col" className={`bg-fill ${CELL}`}>
      <span className="max-tablet:hidden">
        <TickBox
          label={SELECTION_TEXT.selectAll}
          isChecked={selection.isAllSelected}
          isMixed={selection.isPartlySelected}
          onChange={selection.toggleAll}
        />
      </span>
    </th>
  );
}

/** "Select all on this page" above the stacked cards, where the header is hidden. */
export function SelectAllStrip({ selection }: { selection: RowSelection }) {
  return (
    <div className="tablet:hidden border-rule border-b px-3">
      <label className="min-h-control text-secondary text-ink-2 inline-flex cursor-pointer items-center gap-3 pr-3">
        <span className="size-control grid place-items-center">
          <Box
            isChecked={selection.isAllSelected}
            isMixed={selection.isPartlySelected}
            onChange={selection.toggleAll}
          />
        </span>
        {SELECTION_TEXT.selectAllShown}
      </label>
    </div>
  );
}

type SelectRowCellProps = { selection: RowSelection; id: number; name: string };

/** The first cell of a row: its checkbox, named after the row (e.g. "Select Sita Karki"). */
export function SelectRowCell({ selection, id, name }: SelectRowCellProps) {
  return (
    <td data-part="select" className={`${CELL} max-tablet:p-0`}>
      <TickBox
        label={SELECTION_TEXT.selectRow(name)}
        isChecked={selection.isSelected(id)}
        onChange={() => {
          selection.toggle(id);
        }}
      />
    </td>
  );
}
