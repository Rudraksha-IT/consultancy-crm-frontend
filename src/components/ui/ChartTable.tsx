import { DataCell, DataRow, DataTable } from "./DataTable";
import type { ChartCategory, ChartSeries, ValueFormat } from "./chartTypes";

type ChartTableProps = {
  /** The chart's title, naming the table for screen readers. */
  title: string;
  categoryHeading: string;
  categories: readonly ChartCategory[];
  series: readonly ChartSeries[];
  format: ValueFormat;
};

const CELL = "px-3 py-3 text-right";

/**
 * The chart's numbers as a table, shown in the chart's place after "Show as a table" (UI revamp
 * 15). It fills the sheet like any table (band under the column heads, the sheet's padding at its
 * sides). On a phone each row is a card with every column, so it never scrolls sideways.
 */
export function ChartTable({
  title,
  categoryHeading,
  categories,
  series,
  format,
}: ChartTableProps) {
  return (
    <div className="overflow-x-auto">
      <DataTable label={title}>
        <thead>
          <tr>
            <th scope="col" className="px-3 py-3 text-left">
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
              <DataCell className="px-3 py-3">{category.label}</DataCell>
              {series.map((item) => (
                <DataCell key={item.name} label={item.name} className={`${CELL} tabular-nums`}>
                  {format(item.values[index] ?? 0)}
                </DataCell>
              ))}
            </DataRow>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
}
