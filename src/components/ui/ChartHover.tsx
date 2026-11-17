"use client";

import { useState } from "react";

import { CHART_BOX, type ColumnLayout } from "@/lib/charts";

import { ChartTooltip } from "./ChartTooltip";
import type { ChartCategory, ChartSeries, ValueFormat } from "./chartTypes";

const PERCENT = 100;

const percentOfWidth = (units: number): string => `${String((units / CHART_BOX.width) * PERCENT)}%`;
const percentOfHeight = (units: number): string =>
  `${String((units / CHART_BOX.height) * PERCENT)}%`;

type ChartHoverProps = {
  layout: ColumnLayout;
  categories: readonly ChartCategory[];
  series: readonly ChartSeries[];
  format: ValueFormat;
};

/**
 * One invisible button per category over the plot. Hovering or focusing it shows the category's
 * exact values; its name reads them out, so the numbers reach keyboard and screen-reader users.
 */
export function ChartHover({ layout, categories, series, format }: ChartHoverProps) {
  const [active, setActive] = useState<number | null>(null);
  const describe = (index: number, label: string): string =>
    `${label}: ${series.map((item) => `${item.name} ${format(item.values[index] ?? 0)}`).join(", ")}`;

  return (
    <>
      <div
        className="absolute flex"
        style={{
          left: percentOfWidth(CHART_BOX.left),
          right: percentOfWidth(CHART_BOX.right),
          top: percentOfHeight(CHART_BOX.top),
          bottom: percentOfHeight(CHART_BOX.bottom),
        }}
      >
        {categories.map((category, index) => (
          <button
            key={category.key}
            type="button"
            aria-label={describe(index, category.label)}
            onMouseEnter={() => {
              setActive(index);
            }}
            onMouseLeave={() => {
              setActive(null);
            }}
            onFocus={() => {
              setActive(index);
            }}
            onBlur={() => {
              setActive(null);
            }}
            className="hover:bg-ink/5 focus-visible:bg-ink/5 flex-1 cursor-default bg-transparent"
          />
        ))}
      </div>
      <ActiveTooltip
        active={active}
        layout={layout}
        categories={categories}
        series={series}
        format={format}
      />
    </>
  );
}

type ActiveTooltipProps = ChartHoverProps & { active: number | null };

function ActiveTooltip({ active, layout, categories, series, format }: ActiveTooltipProps) {
  if (active === null) return null;
  return (
    <ChartTooltip
      label={labelAt(categories, active)}
      index={active}
      centre={centreAt(layout, active)}
      series={series}
      format={format}
    />
  );
}

function labelAt(categories: readonly ChartCategory[], index: number): string {
  return categories[index]?.label ?? "";
}

function centreAt(layout: ColumnLayout, index: number): number {
  return layout.groups[index]?.centre ?? 0;
}
