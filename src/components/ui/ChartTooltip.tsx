import type { CSSProperties } from "react";

import { CHART_BOX } from "@/lib/charts";

import { seriesColour, type ChartSeries, type ValueFormat } from "./chartTypes";

const PERCENT = 100;

type TipPlace = CSSProperties & { "--tip-at": string };

/** Where the tooltip's middle belongs: over the middle of its columns. */
function tipPlace(centre: number): TipPlace {
  return { "--tip-at": `${String((centre / CHART_BOX.width) * PERCENT)}%` };
}

type ChartTooltipProps = {
  label: string;
  index: number;
  centre: number;
  series: readonly ChartSeries[];
  format: ValueFormat;
};

/** The exact values of one category, above its columns. */
export function ChartTooltip({ label, index, centre, series, format }: ChartTooltipProps) {
  return (
    <div
      role="tooltip"
      className="rounded-control border-rule-2 bg-paper text-small text-ink shadow-lift pointer-events-none absolute top-0 z-10 grid min-w-56 -translate-x-1/2 -translate-y-full gap-1.5 border px-3.5 py-3"
      // Over its columns, but never past the chart's sides (`[data-chart-tip]` in globals.css).
      data-chart-tip=""
      style={tipPlace(centre)}
    >
      <b>{label}</b>
      {series.map((item, seriesIndex) => (
        <span key={item.name} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`size-3 rounded-sm ${seriesColour(seriesIndex).swatch}`}
          />
          {item.name}
          <b className="ml-auto pl-4">{format(item.values[index] ?? 0)}</b>
        </span>
      ))}
    </div>
  );
}
