import clsx from "clsx";
import { createContext, useContext, type ReactNode } from "react";

/**
 * How a table shows at 640 and below (design system: Phones, Lists). A `list` is a lean row per
 * item: only the cells that declare a part are shown. `cards` keeps every column, each cell with
 * its column's name, so nothing ever scrolls sideways. Above 640 a table is a table.
 */
export type PhoneLayout = "list" | "cards";

/**
 * The part a cell plays in a phone list row: the row's checkbox, the name, one short line under
 * it, one key fact on the right, then the row's own button (`action`) or buttons on their own
 * line under it (`actions`). Undeclared cells are hidden on phones; they are on the page the row
 * opens.
 */
export type PhonePart = "select" | "title" | "line" | "fact" | "action" | "actions";

/** A shrinking cell's fixed share of the table's width. */
export type ShrinkShare = "small" | "medium" | "large" | "quarter";

type TableSettings = { phone: PhoneLayout; stacksBelowTablet: boolean };

const TableContext = createContext<TableSettings>({ phone: "cards", stacksBelowTablet: false });

type DataTableProps = {
  /** Lean rows (`list`, declared by each cell's `part`) or cards with every column. */
  phone?: PhoneLayout;
  /** Names the table for screen readers. */
  label?: string;
  /** The rows already stack into cards below tablet width, with each column's name shown. */
  stacksBelowTablet?: boolean;
  /**
   * Cells that don't shrink may wrap onto a second line (a date, an intake) when the table is
   * tight, so a table with many columns still fits; otherwise they stay on one line.
   */
  wraps?: boolean;
  className?: string;
  children: ReactNode;
};

/** A table that turns into a lean list or cards at phone width (rules in `globals.css`). */
export function DataTable({
  phone = "cards",
  label,
  stacksBelowTablet = false,
  wraps = false,
  className,
  children,
}: DataTableProps) {
  return (
    <TableContext value={{ phone, stacksBelowTablet }}>
      <table
        aria-label={label}
        data-phone={phone}
        {...flag("data-stacks", stacksBelowTablet)}
        {...flag("data-wraps", wraps)}
        // Cells in page text, column titles on one line (list tidy-ups 26); heads and gutters in
        // globals.css ("Porcelain tables").
        className={clsx("text-body w-full border-collapse [&_th]:whitespace-nowrap", className)}
      >
        {children}
      </table>
    </TableContext>
  );
}

/** An empty data attribute when `isOn`, so CSS can select it; nothing otherwise. */
function flag(name: string, isOn: boolean): Record<string, string> {
  return isOn ? { [name]: "" } : {};
}

type DataRowProps = {
  /** The row opens a page (through its name's link): on phones it gets an arrow. */
  opensPage?: boolean;
  className?: string;
  children: ReactNode;
};

/** One row of a `DataTable`. */
export function DataRow({ opensPage = false, className, children }: DataRowProps) {
  return (
    <tr data-opens-page={opensPage ? "" : undefined} className={className}>
      {children}
    </tr>
  );
}

type DataCellProps = {
  /** What this cell is in a phone list row; leave it out to hide the cell in a list. */
  part?: PhonePart;
  /** The column's name, shown beside the value when rows are cards. */
  label?: string;
  /**
   * The cell gives up width so the table fits its panel: its text is cut with … (use `OneLine`
   * inside), while the other cells stay on one line (globals.css, "Tables fit their panel").
   * `true` shares out what the other cells leave; a size gives it a fixed share of the table
   * (small 10%, medium 15%, large 20%, quarter 25%), for a table with many columns, or to keep a
   * main column from taking half the table (the Students list's name, list tidy-ups 01).
   */
  shrinks?: boolean | ShrinkShare;
  colSpan?: number;
  className?: string;
  children?: ReactNode;
};

/**
 * One cell of a `DataRow`. Its column's name is drawn before the value on phone cards (from
 * `data-label`, so the cell's text and the table above 640 are unchanged); in a table whose rows
 * stack below tablet width it is a word in the cell, as there it shows from 760 down.
 */
export function DataCell({ part, label, shrinks, colSpan, className, children }: DataCellProps) {
  const { stacksBelowTablet } = useContext(TableContext);
  const isLabelWritten = label !== undefined && stacksBelowTablet;
  return (
    <td
      data-part={part}
      data-label={isLabelWritten ? undefined : label}
      {...shrinkMark(shrinks)}
      colSpan={colSpan}
      className={className}
    >
      {isLabelWritten && <CellLabel text={label} />}
      {children}
    </td>
  );
}

/** `data-shrinks` (with its share, if any) on a cell that gives up width; nothing on others. */
function shrinkMark(shrinks: boolean | ShrinkShare | undefined): {
  "data-shrinks"?: ShrinkShare | "";
} {
  if (shrinks === undefined || shrinks === false) return {};
  return { "data-shrinks": shrinks === true ? "" : shrinks };
}

/**
 * A column's name written inside its cell, for rows that stack below tablet width: shown there,
 * heard by screen readers, and hidden in a phone list (its line is the value alone).
 */
export function CellLabel({ text }: { text: string }) {
  return (
    <span data-cell-label="" className="tablet:sr-only text-ink-2">
      {`${text} `}
    </span>
  );
}
