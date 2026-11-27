import clsx from "clsx";
import type { ReactNode } from "react";

type RowItemProps = {
  title: ReactNode;
  /** The secondary line under the title. */
  meta?: ReactNode;
  /** More content under the meta line, such as chips. */
  children?: ReactNode;
  /** Actions or a status on the right; below the text at phone width. */
  right?: ReactNode;
  /**
   * Marks the one row picked from the list, e.g. the Chosen Offer, with a line in the fixed good
   * colour on its left edge. The row must also say so in words (a chip), never by colour alone.
   */
  isMarked?: boolean;
  /** On a phone: drop the meta line (it is on the page the row opens). */
  hidesMetaOnPhone?: boolean;
  /** On a phone: keep `right` beside the text instead of under it, its parts one above another. */
  keepsRightBesideOnPhone?: boolean;
};

/** The standard list row. Use inside a `RowList`. */
export function RowItem({ title, meta, children, right, ...look }: RowItemProps) {
  return (
    <li data-row="" className={rowClasses(look)}>
      <div className="grid min-w-0 gap-1">
        <div className="text-name text-ink min-w-0 font-semibold">{title}</div>
        {meta !== undefined && <div className={metaClasses(look)}>{meta}</div>}
        {children}
      </div>
      {right !== undefined && <div className={rightClasses(look)}>{right}</div>}
    </li>
  );
}

type RowLook = Pick<RowItemProps, "isMarked" | "hidesMetaOnPhone" | "keepsRightBesideOnPhone">;

function rowClasses({ isMarked = false, keepsRightBesideOnPhone = false }: RowLook): string {
  return clsx(
    "phone:grid-cols-[minmax(0,1fr)_auto] max-phone:gap-3 pr-gutter grid grid-cols-[minmax(0,1fr)] items-center gap-4 py-3.25",
    // The marked row keeps the sheet's padding: its line is drawn over the edge, not beside it.
    "pl-gutter",
    isMarked &&
      "bg-good-tint/45 before:bg-good relative before:absolute before:inset-y-0 before:left-0 before:w-0.75",
    keepsRightBesideOnPhone && "max-phone:grid-cols-[minmax(0,1fr)_auto]",
  );
}

function metaClasses({ hidesMetaOnPhone = false }: RowLook): string {
  return clsx(
    "text-secondary text-ink-2 flex flex-wrap gap-x-5 gap-y-1",
    hidesMetaOnPhone && "max-phone:hidden",
  );
}

function rightClasses({ keepsRightBesideOnPhone = false }: RowLook): string {
  return clsx(
    "phone:justify-end flex flex-wrap items-center gap-3",
    keepsRightBesideOnPhone &&
      "max-phone:flex-col max-phone:flex-nowrap max-phone:items-end max-phone:gap-1.5",
  );
}
