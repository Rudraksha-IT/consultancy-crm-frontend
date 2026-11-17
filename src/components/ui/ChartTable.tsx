import { LABELS } from "@/constants/messages";

import { DataCell, DataRow, DataTable } from "./DataTable";
import type { ChartCategory, ChartSeries, ValueFormat } from "./chartTypes";

type ChartTableProps = {
  categoryHeading: string;
  categories: readonly ChartCategory[];
  series: readonly ChartSeries[];
  format: ValueFormat;
};

const CELL = "px-6 py-3 text-right";

/**
 * The chart's numbers as a table, folded away under "Show as a table". On a phone each row is a
 * card with every column, so it never scrolls sideways.
 */
export function ChartTable({ categoryHeading, categories, series, format }: ChartTableProps) {
  return (
    <details className="border-rule -mx-7 border-t">
      <summary className="text-secondary text-accent cursor-pointer px-7 py-3.5 font-semibold">
        {LABELS.showAsTable}
      </summary>
      <div className="border-rule overflow-x-auto border-t">
        <DataTable>
          <thead className="bg-fill text-small text-ink-2">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">
                {categoryHeading}
              </th>
              {series.map((item) => (
                <th key={item.name} scope="col" className={CELL}>
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-rule divide-y">
            {categories.map((category, index) => (
              <DataRow key={category.key}>
                <DataCell className="px-6 py-3">{category.label}</DataCell>
                {series.map((item) => (
                  <DataCell key={item.name} label={item.name} className={CELL}>
                    {format(item.values[index] ?? 0)}
                  </DataCell>
                ))}
              </DataRow>
            ))}
          </tbody>
        </DataTable>
      </div>
    </details>
  );
}
