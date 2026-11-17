import { CHART_BOX, type ColumnLayout } from "@/lib/charts";

import { seriesColour, type ChartCategory, type ValueFormat } from "./chartTypes";

const LABEL_OFFSET = 12;
const TICK_TEXT_NUDGE = 5;
const BAR_RADIUS = 3;

type ChartPlotProps = {
  title: string;
  layout: ColumnLayout;
  categories: readonly ChartCategory[];
  axisFormat: ValueFormat;
};

/** The drawing: grid lines with axis values, and the columns with their category labels. */
export function ChartPlot({ title, layout, categories, axisFormat }: ChartPlotProps) {
  const right = CHART_BOX.width - CHART_BOX.right;
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${String(CHART_BOX.width)} ${String(CHART_BOX.height)}`}
      className="text-small block h-auto w-full"
    >
      {layout.ticks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={CHART_BOX.left}
            x2={right}
            y1={tick.y}
            y2={tick.y}
            className={tick.value === 0 ? "stroke-rule-2" : "stroke-rule"}
          />
          <text
            x={CHART_BOX.left - LABEL_OFFSET}
            y={tick.y + TICK_TEXT_NUDGE}
            textAnchor="end"
            className="fill-ink-3"
          >
            {axisFormat(tick.value)}
          </text>
        </g>
      ))}
      {layout.groups.map((group, index) => (
        <g key={categories[index]?.key ?? index}>
          {group.bars.map((bar, seriesIndex) => (
            <rect
              key={seriesIndex}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={BAR_RADIUS}
              className={seriesColour(seriesIndex).fill}
            />
          ))}
          <text
            x={group.centre}
            y={CHART_BOX.height - LABEL_OFFSET}
            textAnchor="middle"
            className="fill-ink-3"
          >
            {categories[index]?.shortLabel}
          </text>
        </g>
      ))}
    </svg>
  );
}
