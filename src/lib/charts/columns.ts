import { niceAxisMax } from "./charts";

/** The chart's drawing box in SVG units; it scales with its container. */
export const CHART_BOX = {
  width: 960,
  height: 300,
  left: 72,
  right: 8,
  top: 16,
  bottom: 40,
} as const;

const AXIS_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;
const GROUP_FILL = 0.72;
const MAX_BAR_WIDTH = 34;
const BAR_GAP = 2;

export type ColumnBar = { x: number; y: number; width: number; height: number };
export type ColumnGroup = { left: number; width: number; centre: number; bars: ColumnBar[] };
export type ColumnLayout = {
  max: number;
  ticks: { value: number; y: number }[];
  groups: ColumnGroup[];
};

/**
 * Where to draw grouped columns: `series[s][c]` is series `s` in category `c`. One y-axis only,
 * rounded up to a nice maximum with four steps.
 */
export function layoutColumns(series: readonly (readonly number[])[]): ColumnLayout {
  const max = niceAxisMax(Math.max(0, ...series.flat()));
  const plotHeight = CHART_BOX.height - CHART_BOX.top - CHART_BOX.bottom;
  const baseline = CHART_BOX.top + plotHeight;
  const heightOf = (value: number): number => (Math.max(0, value) / max) * plotHeight;
  const categoryCount = series[0]?.length ?? 0;
  const groupWidth =
    (CHART_BOX.width - CHART_BOX.left - CHART_BOX.right) / Math.max(1, categoryCount);
  const inner = Math.min(groupWidth * GROUP_FILL, series.length * MAX_BAR_WIDTH);
  const barWidth = (inner - (series.length - 1) * BAR_GAP) / series.length;

  const groups = Array.from({ length: categoryCount }, (_, category) => {
    const left = CHART_BOX.left + category * groupWidth;
    const start = left + (groupWidth - inner) / 2;
    const bars = series.map((values, index) => {
      const height = heightOf(values[category] ?? 0);
      return {
        x: start + index * (barWidth + BAR_GAP),
        y: baseline - height,
        width: barWidth,
        height,
      };
    });
    return { left, width: groupWidth, centre: left + groupWidth / 2, bars };
  });

  return {
    max,
    ticks: AXIS_FRACTIONS.map((fraction) => ({
      value: fraction * max,
      y: baseline - fraction * plotHeight,
    })),
    groups,
  };
}
