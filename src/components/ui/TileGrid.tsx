import clsx from "clsx";
import type { ReactNode } from "react";

type TileGridProps = {
  /** Names the group of tiles for screen readers. */
  label?: string;
  /** How many tiles sit side by side on wide screens. */
  columns?: 3 | 4;
  children: ReactNode;
};

const WIDE_COLUMNS = { 3: "wide:grid-cols-3", 4: "wide:grid-cols-4" } as const;

/**
 * Number tiles on one sheet (ticket 21), with thin lines between the figures: two per row on
 * tablets and phones, three or four on wide screens. Every figure has a line on its right and
 * under it and reaches one pixel out; the sheet cuts off what falls outside it. So the lines are
 * only between figures: the first figure of each row has none on its left, the last none on its
 * right, at any number of columns, and a last row that is not full still has a whole line above
 * it. On a phone there are no side lines and an odd first tile takes the whole row (design
 * system: Phones, number tiles).
 */
export function TileGrid({ label, columns = 3, children }: TileGridProps) {
  return (
    <div
      role={label === undefined ? undefined : "group"}
      aria-label={label}
      data-tiles=""
      className={clsx(
        "rounded-panel border-sheet-rule bg-paper shadow-raise *:border-rule grid overflow-hidden border",
        "phone:grid-cols-2 phone:*:-mr-px phone:*:-mb-px phone:*:border-r phone:*:border-b",
        WIDE_COLUMNS[columns],
        "max-phone:grid-cols-2 max-phone:gap-x-4 max-phone:px-gutter max-phone:py-1 max-phone:[&>:first-child:nth-last-child(odd)]:col-span-2",
      )}
    >
      {children}
    </div>
  );
}
