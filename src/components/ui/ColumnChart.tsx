import { LABELS } from "@/constants/messages";
import { layoutColumns } from "@/lib/charts";

import { ChartHover } from "./ChartHover";
import { ChartLegend } from "./ChartLegend";
import { ChartPlot } from "./ChartPlot";
import { ChartTable } from "./ChartTable";
import {
  formatPlainNumber,
  type ChartCategory,
  type ChartSeries,
  type ValueFormat,
} from "./chartTypes";

type ColumnChartProps = {
  title: string;
  categories: readonly ChartCategory[];
  /** Up to three series, coloured c1, c2, c3 in order. */
  series: readonly ChartSeries[];
  format?: ValueFormat;
  /** How the axis values are written; `format` by default. */
  axisFormat?: ValueFormat;
  categoryHeading?: string;
};

/** Grouped columns on one axis, with a legend, exact values on hover or focus, and a table view. */
export function ColumnChart(props: ColumnChartProps) {
  const { title, categories, series } = props;
  const format = props.format ?? formatPlainNumber;
  const layout = layoutColumns(series.map((item) => item.values));

  return (
    <div className="grid gap-3 px-7 pt-6 pb-2">
      <ChartLegend series={series} />
      <div className="overflow-x-auto pt-24">
        <div className="min-w-chart relative">
          <ChartPlot
            title={title}
            layout={layout}
            categories={categories}
            axisFormat={props.axisFormat ?? format}
          />
          <ChartHover layout={layout} categories={categories} series={series} format={format} />
        </div>
      </div>
      <ChartTable
        categoryHeading={props.categoryHeading ?? LABELS.month}
        categories={categories}
        series={series}
        format={format}
      />
    </div>
  );
}
