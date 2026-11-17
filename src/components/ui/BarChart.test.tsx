import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BarChart } from "./BarChart";

const ROWS = [
  { key: "canada", label: "Canada", value: 12 },
  { key: "uk", label: "UK", value: 4 },
];

function renderChart(props: Partial<Parameters<typeof BarChart>[0]> = {}) {
  return render(
    <BarChart
      title="Visas granted by country"
      seriesName="Visas granted"
      categoryHeading="Country"
      rows={ROWS}
      {...props}
    />,
  );
}

describe("BarChart", () => {
  it("draws a bar per row with its number, and names the series in a legend", () => {
    renderChart();

    const bars = within(screen.getByRole("list", { name: "Visas granted by country" }));
    expect(bars.getAllByRole("listitem").map((row) => row.textContent)).toEqual([
      "Canada12",
      "UK4",
    ]);
    const legend = within(screen.getByRole("list", { name: "Legend" }));
    expect(legend.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Visas granted",
    ]);
  });

  it("shows the exact value on hover and on keyboard focus", async () => {
    renderChart({ format: (value) => `${String(value)} visas` });
    const canada = screen.getByRole("button", { name: "Canada: Visas granted 12 visas" });

    fireEvent.mouseEnter(canada);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Canada");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Visas granted12 visas");
    fireEvent.mouseLeave(canada);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Canada");
    await userEvent.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent("UK");
    await userEvent.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("lists every row in the table view, also those grouped in the bars", async () => {
    renderChart({
      rows: [...ROWS, { key: "other", label: "Other", value: 3 }],
      tableRows: [
        ...ROWS,
        { key: "japan", label: "Japan", value: 2 },
        { key: "x", label: "Other", value: 1 },
      ],
    });

    await userEvent.click(screen.getByText("Show as a table"));

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Country", "Visas granted"]);
    expect(
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(["Canada12", "UK4", "Japan2", "Other1"]);
  });

  it("uses the bars for the table when no other rows are given", async () => {
    renderChart();

    await userEvent.click(screen.getByText("Show as a table"));

    expect(within(screen.getByRole("table")).getByRole("row", { name: "UK 4" })).toBeVisible();
  });

  it("writes typed names as text, never as markup", () => {
    renderChart({ rows: [{ key: "x", label: "<b>Bold</b>", value: 1 }] });

    const bars = within(screen.getByRole("list", { name: "Visas granted by country" }));
    expect(bars.getByText("<b>Bold</b>")).toBeInTheDocument();
    expect(document.querySelector("b b")).toBeNull();
  });
});
