export type ChartCategory = { key: string; label: string; shortLabel: string };
export type ChartSeries = { name: string; values: readonly number[] };
export type ValueFormat = (value: number) => string;

/** The fixed chart colours, always in this order; never the Theme's accent or status colours. */
export const SERIES_COLOURS = [
  { fill: "fill-c1", swatch: "bg-c1" },
  { fill: "fill-c2", swatch: "bg-c2" },
  { fill: "fill-c3", swatch: "bg-c3" },
] as const;

export function seriesColour(index: number): (typeof SERIES_COLOURS)[number] {
  return SERIES_COLOURS[index % SERIES_COLOURS.length] ?? SERIES_COLOURS[0];
}

export const formatPlainNumber: ValueFormat = (value) => value.toLocaleString("en-IN");
