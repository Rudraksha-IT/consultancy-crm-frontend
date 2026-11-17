import clsx from "clsx";

import { formatPlainNumber, type ValueFormat } from "./chartTypes";

const PERCENT = 100;

export type BarRow = {
  /** Tells rows apart when two share a label (the label is used otherwise). */
  key?: string | number;
  label: string;
  value: number;
  note?: string;
  /** Grey bars show what didn't go through. */
  isMuted?: boolean;
  /** Written instead of the formatted value, e.g. "—" for a share nobody has yet. */
  valueText?: string;
};

type BarListProps = {
  label: string;
  rows: readonly BarRow[];
  format?: ValueFormat;
};

/**
 * Horizontal bars, each with its number written at the end. On a phone the name and the number
 * share one line, with the bar under them.
 */
export function BarList({ label, rows, format = formatPlainNumber }: BarListProps) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul aria-label={label} className="max-phone:gap-4 max-phone:p-4 grid gap-4.5 p-7">
      {rows.map((row) => (
        <li
          key={row.key ?? row.label}
          className="text-body phone:grid-cols-[9.5rem_minmax(0,1fr)_auto] phone:gap-5 max-phone:grid-cols-[minmax(0,1fr)_auto] max-phone:gap-x-3 max-phone:gap-y-1.5 max-phone:text-secondary grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3"
        >
          <span className="text-ink-2 max-phone:col-start-1 max-phone:row-start-1 min-w-0">
            {row.label}
            {row.note !== undefined && (
              <small className="text-small text-ink-3 block">{row.note}</small>
            )}
          </span>
          <span className="rounded-pill bg-fill-2 max-phone:col-span-2 max-phone:row-start-2 max-phone:h-2 h-4 overflow-hidden">
            <span
              className={clsx(
                "rounded-pill block h-full",
                row.isMuted === true ? "bg-ink-3" : "bg-accent",
              )}
              style={{ width: `${String((row.value / max) * PERCENT)}%` }}
            />
          </span>
          <span className="max-phone:col-start-2 max-phone:row-start-1 text-right font-bold whitespace-nowrap">
            {row.valueText ?? format(row.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
