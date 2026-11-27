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
  /** Show the numbers as a table in the chart's place ("Show as a table", `ChartSection`). */
  showsTable?: boolean;
};

/**
 * Grouped columns on one axis, with a legend and exact values on hover or focus; or, in its
 * place, the same numbers as a table.
 */
export function ColumnChart(props: ColumnChartProps) {
  const { title, categories, series } = props;
  const format = props.format ?? formatPlainNumber;
  if (props.showsTable === true) {
    return (
      <ChartTable
        title={title}
        categoryHeading={props.categoryHeading ?? LABELS.month}
        categories={categories}
        series={series}
        format={format}
      />
    );
  }
  const layout = layoutColumns(series.map((item) => item.values));

  return (
    <div className="px-gutter grid gap-3 pt-5 pb-4">
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
    </div>
  );
}
