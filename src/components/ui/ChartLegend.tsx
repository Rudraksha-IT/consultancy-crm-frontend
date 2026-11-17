import { LABELS } from "@/constants/messages";

import { seriesColour, type ChartSeries } from "./chartTypes";

type ChartLegendProps = {
  series: readonly ChartSeries[];
};

/** Names each series by its colour; only shown for two or more series. */
export function ChartLegend({ series }: ChartLegendProps) {
  if (series.length < 2) return null;
  return (
    <ul
      aria-label={LABELS.legend}
      className="text-secondary text-ink-2 flex flex-wrap gap-x-6 gap-y-2"
    >
      {series.map((item, index) => (
        <li key={item.name} className="flex items-center gap-2">
          <span aria-hidden="true" className={`size-3 rounded-sm ${seriesColour(index).swatch}`} />
          {item.name}
        </li>
      ))}
    </ul>
  );
}
