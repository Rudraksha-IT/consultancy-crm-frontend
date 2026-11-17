import { CHART_BOX, layoutColumns, type ColumnGroup } from "./columns";

function groupsOf(series: number[][]): ColumnGroup[] {
  return layoutColumns(series).groups;
}

function barHeights(group: ColumnGroup | undefined): number[] {
  return (group?.bars ?? []).map((bar) => bar.height);
}

describe("layoutColumns", () => {
  it("rounds the axis up and spaces the ticks evenly from the base line", () => {
    const { ticks } = layoutColumns([[3, 38]]);

    expect(ticks.map((tick) => tick.value)).toEqual([0, 10, 20, 30, 40]);
    expect(ticks.map((tick) => tick.y)).toEqual([
      CHART_BOX.height - CHART_BOX.bottom,
      ...ticks.slice(1, -1).map((tick) => tick.y),
      CHART_BOX.top,
    ]);
  });

  it("places one bar per series in each category, side by side, as tall as its value", () => {
    const [first, second] = groupsOf([
      [10, 20],
      [5, 0],
    ]);
    const firstXs = (first?.bars ?? []).map((bar) => bar.x);

    expect(firstXs).toHaveLength(2);
    expect(firstXs).toEqual([...firstXs].sort((a, b) => a - b));
    const [firstTall = 0] = barHeights(first);
    const [secondTall = 0, secondEmpty] = barHeights(second);
    expect(secondTall).toBeCloseTo(firstTall * 2);
    expect(secondEmpty).toBe(0);
  });

  it("gives each category a centre for its axis label, evenly spaced", () => {
    const centres = groupsOf([[1, 1, 1, 1]]).map((group) => group.centre);
    const gaps = centres.slice(1).map((centre, index) => centre - (centres[index] ?? 0));

    expect(new Set(gaps.map((gap) => gap.toFixed(6))).size).toBe(1);
  });

  it("copes with no categories", () => {
    expect(groupsOf([[]])).toEqual([]);
  });
});
