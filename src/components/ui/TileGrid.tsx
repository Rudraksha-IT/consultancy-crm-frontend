import clsx from "clsx";
import type { ReactNode } from "react";

type TileGridProps = {
  /** Names the group of tiles for screen readers. */
  label?: string;
  /** How many tiles sit side by side on wide screens. */
  columns?: 3 | 4;
  children: ReactNode;
};

/*
 * Figures in a row with thin dividers, not cards (Ivory, ticket 03): a line above and below the
 * row, and one between figures, never before the first of a row. Phones have no side lines.
 */
const WIDE_COLUMNS = {
  3: "wide:grid-cols-3 wide:[&>:nth-child(3n+1)]:border-l-0 wide:[&>:nth-child(3n+1)]:pl-0",
  4: "wide:grid-cols-4 wide:[&>:nth-child(4n+1)]:border-l-0 wide:[&>:nth-child(4n+1)]:pl-0",
} as const;

/**
 * Number tiles in a grid: two per row on tablets and phones, three or four on wide screens. On a
 * phone an odd first tile takes the whole row (design system: Phones, number tiles).
 */
export function TileGrid({ label, columns = 3, children }: TileGridProps) {
  return (
    <div
      role={label === undefined ? undefined : "group"}
      aria-label={label}
      data-tiles=""
      className={clsx(
        "border-rule *:border-rule grid border-y *:border-l",
        "phone:grid-cols-2 phone:max-wide:[&>:nth-child(odd)]:border-l-0 phone:max-wide:[&>:nth-child(odd)]:pl-0",
        WIDE_COLUMNS[columns],
        "max-phone:grid-cols-2 max-phone:gap-x-4 max-phone:*:border-l-0 max-phone:[&>:first-child:nth-last-child(odd)]:col-span-2",
      )}
    >
      {children}
    </div>
  );
}
