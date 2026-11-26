import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BarList } from "./BarList";
import { ColumnChart } from "./ColumnChart";
import { PipelineThread } from "./PipelineThread";
import { Thread } from "./Thread";

describe("Thread", () => {
  it("names the current Stage and marks the beads before it as reached", () => {
    render(<Thread stage="applying" />);

    const steps = screen.getByRole("list", { name: "Stage: Applying" });
    const states = within(steps)
      .getAllByRole("listitem")
      .map((step) => step.dataset.state);
    expect(states).toEqual(["past", "past", "now", "next", "next"]);
    expect(screen.getByText("Applying")).toBeInTheDocument();
  });

  it("marks nothing for a Lost Student and says Lost", () => {
    render(<Thread stage="lost" />);

    const steps = screen.getByRole("list", { name: "Stage: Lost" });
    expect(
      within(steps)
        .getAllByRole("listitem")
        .every((step) => step.dataset.state === "next"),
    ).toBe(true);
  });
});

describe("PipelineThread", () => {
  const COUNTS = {
    lead: 6,
    counselling: 4,
    applying: 4,
    offer: 3,
    visa: 3,
    lost: 2,
  };

  it("shows each Stage's count and share, linking to the Students at that Stage", () => {
    render(<PipelineThread counts={COUNTS} hrefFor={(stage) => `/students?stage=${stage}`} />);

    const lead = screen.getByRole("link", { name: "Lead: 6 Students" });
    expect(lead).toHaveAttribute("href", "/students?stage=lead");
    expect(lead).toHaveTextContent("Lead630%");
  });

  it("is five beads, Lead to Visa, with Lost left off the thread", () => {
    render(<PipelineThread counts={COUNTS} hrefFor={(stage) => `/students?stage=${stage}`} />);

    const beads = within(screen.getByRole("list", { name: "Students at each Stage" })).getAllByRole(
      "listitem",
    );
    expect(beads.map((bead) => bead.dataset.bead)).toEqual(["1", "2", "3", "4", "5"]);
    expect(screen.queryByText(/Lost/)).toBeNull();
  });

  it("shows 0% everywhere when nobody is in progress", () => {
    const none = { lead: 0, counselling: 0, applying: 0, offer: 0, visa: 0, lost: 3 };
    render(<PipelineThread counts={none} hrefFor={(stage) => `/students?stage=${stage}`} />);

    expect(screen.getByRole("link", { name: "Lead: 0 Students" })).toHaveTextContent("Lead00%");
  });
});

describe("BarList", () => {
  it("writes each value next to its bar, with notes and formatting", () => {
    render(
      <BarList
        label="What happened to them"
        rows={[
          { label: "Came in", value: 40, note: "New visitors" },
          { label: "Visa refused", value: 3, isMuted: true },
        ]}
        format={(value) => `${String(value)} people`}
      />,
    );

    const list = screen.getByRole("list", { name: "What happened to them" });
    const [cameIn] = within(list).getAllByRole("listitem");
    expect(cameIn).toHaveTextContent("Came in");
    expect(cameIn).toHaveTextContent("New visitors");
    expect(cameIn).toHaveTextContent("40 people");
  });

  it("keeps rows with the same label apart and can write its own text for a value", () => {
    render(
      <BarList
        label="Classes"
        rows={[
          { key: 1, label: "IELTS", value: 80, valueText: "80%" },
          { key: 2, label: "IELTS", value: 0, valueText: "—" },
        ]}
      />,
    );

    const rows = within(screen.getByRole("list", { name: "Classes" })).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["IELTS80%", "IELTS—"]);
  });
});

describe("ColumnChart", () => {
  const MONTHS = [
    { key: "2026-09", label: "September 2026", shortLabel: "Sep" },
    { key: "2026-10", label: "October 2026", shortLabel: "Oct" },
  ];
  const SERIES = [
    { name: "New visitors", values: [12, 20] },
    { name: "Signed up", values: [5, 9] },
  ];

  it("is an image named by its title, with a legend for two or more series", () => {
    render(<ColumnChart title="Visitors each month" categories={MONTHS} series={SERIES} />);

    expect(screen.getByRole("img", { name: "Visitors each month" })).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "Legend" });
    expect(
      within(legend)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["New visitors", "Signed up"]);
  });

  it("has no legend for a single series", () => {
    render(<ColumnChart title="Visitors" categories={MONTHS} series={SERIES.slice(0, 1)} />);

    expect(screen.queryByRole("list", { name: "Legend" })).not.toBeInTheDocument();
  });

  it("shows the exact values for a month on hover and on keyboard focus", async () => {
    render(
      <ColumnChart
        title="Visitors each month"
        categories={MONTHS}
        series={SERIES}
        format={(value) => `${String(value)} people`}
      />,
    );
    const october = screen.getByRole("button", {
      name: "October 2026: New visitors 20 people, Signed up 9 people",
    });

    fireEvent.mouseEnter(october);
    expect(screen.getByRole("tooltip")).toHaveTextContent("October 2026");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Signed up9 people");
    fireEvent.mouseLeave(october);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent("September 2026");
  });

  it("has no table while it is a chart", () => {
    render(<ColumnChart title="Visitors each month" categories={MONTHS} series={SERIES} />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Show as a table")).toBeNull();
  });

  it("can be shown as a table, in place of the chart", () => {
    render(
      <ColumnChart title="Visitors each month" categories={MONTHS} series={SERIES} showsTable />,
    );

    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("list", { name: "Legend" })).toBeNull();

    const table = screen.getByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Month", "New visitors", "Signed up"]);
    expect(within(table).getByRole("row", { name: "October 2026 20 9" })).toBeInTheDocument();
  });
});
