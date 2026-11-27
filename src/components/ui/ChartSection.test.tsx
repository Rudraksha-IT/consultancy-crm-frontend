import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChartSection } from "./ChartSection";
import { ChartViewsProvider } from "./ChartViews";

function Chart({ title, hasSwitch }: { title: string; hasSwitch?: boolean }) {
  return (
    <ChartSection title={title} {...(hasSwitch !== undefined && { hasSwitch })}>
      {(showsTable) => (showsTable ? <table aria-label={title} /> : <p>{`${title} drawn`}</p>)}
    </ChartSection>
  );
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}

describe("ChartSection", () => {
  it("puts Show as a table on the title's line, outside the sheet", () => {
    render(<Chart title="Each month" />);

    const button = section("Each month").getByRole("button", { name: "Show as a table" });
    const titleLine = screen.getByRole("heading", { name: "Each month" }).parentElement
      ?.parentElement;
    expect(titleLine).toContainElement(button);
    expect(button.closest("[data-panel]")).toBeNull();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("swaps the chart for its table and back, and says so on the button", async () => {
    render(<Chart title="Each month" />);
    expect(screen.getByText("Each month drawn")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Show as a table" }));

    expect(screen.getByRole("table", { name: "Each month" })).toBeInTheDocument();
    expect(screen.queryByText("Each month drawn")).toBeNull();
    const back = screen.getByRole("button", { name: "Show as a chart" });
    expect(back).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Show as a table" })).toBeNull();

    await userEvent.click(back);

    expect(screen.getByText("Each month drawn")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Show as a table" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps the cursor on the button after each press", async () => {
    render(<Chart title="Each month" />);
    const button = screen.getByRole("button", { name: "Show as a table" });

    await userEvent.click(button);
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName("Show as a chart");

    await userEvent.keyboard("{Enter}");
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName("Show as a table");
  });

  it("switches each chart on its own", async () => {
    render(
      <>
        <Chart title="Visitors" />
        <Chart title="Money" />
      </>,
    );

    await userEvent.click(section("Money").getByRole("button", { name: "Show as a table" }));

    expect(section("Money").getByRole("table")).toBeInTheDocument();
    expect(section("Visitors").queryByRole("table")).toBeNull();
    expect(section("Visitors").getByText("Visitors drawn")).toBeInTheDocument();
    expect(section("Visitors").getByRole("button", { name: "Show as a table" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("has no switch where there is nothing to chart", () => {
    render(<Chart title="Each month" hasSwitch={false} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Each month drawn")).toBeInTheDocument();
  });

  it("remembers each chart's choice while the page is open, also after the chart was away", async () => {
    function Page({ isShown }: { isShown: boolean }) {
      return (
        <ChartViewsProvider>
          {isShown && <Chart title="Visitors" />}
          {isShown && <Chart title="Money" />}
        </ChartViewsProvider>
      );
    }
    const { rerender } = render(<Page isShown />);
    await userEvent.click(section("Visitors").getByRole("button", { name: "Show as a table" }));

    rerender(<Page isShown={false} />);
    expect(screen.queryByRole("region")).toBeNull();
    rerender(<Page isShown />);

    expect(section("Visitors").getByRole("table")).toBeInTheDocument();
    expect(section("Visitors").getByRole("button", { name: "Show as a chart" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(section("Money").queryByRole("table")).toBeNull();
  });
});
