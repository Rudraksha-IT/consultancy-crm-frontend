"use client";

import { useState } from "react";

import { LABELS } from "@/constants/messages";

import { ChartTable } from "./ChartTable";
import { formatPlainNumber, type ValueFormat } from "./chartTypes";

const PERCENT = 100;

export type BarChartRow = { key: string; label: string; value: number };

type BarChartProps = {
  title: string;
  /** What the bars count, e.g. "Visas granted"; named in the legend, tooltip and table. */
  seriesName: string;
  /** The table's first column, e.g. "Country". */
  categoryHeading: string;
  rows: readonly BarChartRow[];
  /** Every row for "Show as a table", when the bars group some together; `rows` by default. */
  tableRows?: readonly BarChartRow[];
  format?: ValueFormat;
};

/**
 * One series as horizontal bars in the accent colour, each with its number, a legend, the exact
 * value on hover or focus, and a table view.
 */
export function BarChart(props: BarChartProps) {
  const { title, seriesName, rows } = props;
  const format = props.format ?? formatPlainNumber;
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((row) => row.value));
  const tableRows = props.tableRows ?? rows;

  return (
    <div className="grid gap-3 px-7 pt-6 pb-2">
      <ul aria-label={LABELS.legend} className="text-secondary text-ink-2 flex gap-6">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-accent size-3 rounded-sm" />
          {seriesName}
        </li>
      </ul>
      <ul aria-label={title} className="grid gap-1">
        {rows.map((row) => (
          <li key={row.key} className="relative">
            <button
              type="button"
              aria-label={`${row.label}: ${seriesName} ${format(row.value)}`}
              onMouseEnter={() => {
                setActive(row.key);
              }}
              onMouseLeave={() => {
                setActive(null);
              }}
              onFocus={() => {
                setActive(row.key);
              }}
              onBlur={() => {
                setActive(null);
              }}
              className="text-body rounded-control phone:grid-cols-[9.5rem_minmax(0,1fr)_auto] phone:gap-5 hover:bg-ink/5 focus-visible:bg-ink/5 grid min-h-11 w-full cursor-default grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 bg-transparent px-2 text-left"
            >
              <span className="text-ink-2 min-w-0 break-words">{row.label}</span>
              <span className="rounded-pill bg-fill-2 h-4 overflow-hidden">
                <span
                  className="rounded-pill bg-accent block h-full"
                  style={{ width: `${String((row.value / max) * PERCENT)}%` }}
                />
              </span>
              <span className="text-right font-semibold">{format(row.value)}</span>
            </button>
            {active === row.key && (
              <div
                role="tooltip"
                className="rounded-control border-rule-2 bg-paper text-small text-ink shadow-lift pointer-events-none absolute top-0 left-1/2 z-10 grid min-w-56 -translate-x-1/2 -translate-y-full gap-1.5 border px-3.5 py-3"
              >
                <b>{row.label}</b>
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="bg-accent size-3 rounded-sm" />
                  {seriesName}
                  <b className="ml-auto pl-4">{format(row.value)}</b>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ChartTable
        categoryHeading={props.categoryHeading}
        categories={tableRows.map((row) => ({
          key: row.key,
          label: row.label,
          shortLabel: row.label,
        }))}
        series={[{ name: seriesName, values: tableRows.map((row) => row.value) }]}
        format={format}
      />
    </div>
  );
}
