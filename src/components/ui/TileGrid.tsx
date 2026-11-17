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
 * Number tiles in a grid: two per row on tablets and phones, three or four on wide screens. On a
 * phone an odd first tile takes the whole row (design system: Phones, number tiles).
 */
export function TileGrid({ label, columns = 3, children }: TileGridProps) {
  return (
    <div
      role={label === undefined ? undefined : "group"}
      aria-label={label}
      className={clsx(
        "phone:grid-cols-2 grid gap-4",
        WIDE_COLUMNS[columns],
        "max-phone:grid-cols-2 max-phone:gap-2 max-phone:[&>:first-child:nth-last-child(odd)]:col-span-2",
      )}
    >
      {children}
    </div>
  );
}
