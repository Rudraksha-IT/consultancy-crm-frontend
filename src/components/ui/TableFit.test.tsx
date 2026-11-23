import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { DataCell, DataRow, DataTable } from "./DataTable";
import { OneLine } from "./OneLine";

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The rules that make tables fit their panel instead of scrolling sideways. */
function fitRules(): string {
  const start = GLOBALS_CSS.indexOf("Tables fit their panel");
  return GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("End of tables fit", start));
}

function Table({ stacks }: { stacks: boolean }) {
  return (
    <DataTable phone="list" label="Applications" stacksBelowTablet={stacks}>
      <tbody>
        <DataRow>
          <DataCell part="title" shrinks>
            <OneLine>Sita Karki Shrestha Thapa Magar</OneLine>
          </DataCell>
          <DataCell label="Applied">12 Oct 2026</DataCell>
        </DataRow>
      </tbody>
    </DataTable>
  );
}

describe("tables fit their panel: the main text is cut with … instead of scrolling", () => {
  it("marks the cells that give up width, and the tables whose rows stack below tablet", () => {
    render(<Table stacks />);

    const table = screen.getByRole("table", { name: "Applications" });
    expect(table).toHaveAttribute("data-stacks");
    const [name, applied] = screen.getAllByRole("cell");
    expect(name).toHaveAttribute("data-shrinks");
    expect(applied).not.toHaveAttribute("data-shrinks");
  });

  it("leaves a table that doesn't stack unmarked", () => {
    render(<Table stacks={false} />);

    expect(screen.getByRole("table", { name: "Applications" })).not.toHaveAttribute("data-stacks");
  });

  it("lets a shrinking cell go narrower than its text, and keeps the other cells on one line", () => {
    const rules = fitRules();

    expect(rules).toMatch(/:is\(td, th\)\[data-shrinks\][^{]*\{[^}]*max-width: 0/);
    expect(rules).toMatch(/td:not\(\[data-shrinks\]\)[^{]*\{[^}]*white-space: nowrap/);
  });

  it("only while rows are table rows: from tablet width for stacking tables, else above 640", () => {
    const rules = fitRules();

    expect(rules).toContain("@media (width >= 47.5625rem)");
    expect(rules).toMatch(/table\[data-stacks\]/);
    expect(rules).toContain("@media (width >= 40.0625rem)");
    expect(rules).toMatch(/table:not\(\[data-stacks\]\)/);
  });
});

describe("a table with many columns fits by sharing out its width", () => {
  function Wide() {
    return (
      <DataTable phone="list" label="Applications" stacksBelowTablet wraps>
        <tbody>
          <DataRow>
            <DataCell part="title" shrinks="medium">
              <OneLine>Sita Karki</OneLine>
            </DataCell>
            <DataCell part="line" shrinks="large">
              <OneLine>Western Sydney University</OneLine>
            </DataCell>
            <DataCell shrinks="small">
              <OneLine>Ramesh Adhikari</OneLine>
            </DataCell>
            <DataCell label="Applied">12 Oct 2026</DataCell>
          </DataRow>
        </tbody>
      </DataTable>
    );
  }

  it("marks each shrinking cell with its share, and the table as letting other cells wrap", () => {
    render(<Wide />);

    expect(screen.getByRole("table", { name: "Applications" })).toHaveAttribute("data-wraps");
    const [student, university, counsellor, applied] = screen.getAllByRole("cell");
    expect(student).toHaveAttribute("data-shrinks", "medium");
    expect(university).toHaveAttribute("data-shrinks", "large");
    expect(counsellor).toHaveAttribute("data-shrinks", "small");
    expect(applied).not.toHaveAttribute("data-shrinks");
  });

  it("gives each share its width, and leaves the other cells free to wrap", () => {
    const rules = fitRules();

    expect(rules).toMatch(/:is\(td, th\)\[data-shrinks="small"\][^{]*\{[^}]*width: 10%/);
    expect(rules).toMatch(/:is\(td, th\)\[data-shrinks="medium"\][^{]*\{[^}]*width: 15%/);
    expect(rules).toMatch(/:is\(td, th\)\[data-shrinks="large"\][^{]*\{[^}]*width: 20%/);
    expect(rules).toMatch(/:is\(td, th\)\[data-shrinks="quarter"\][^{]*\{[^}]*width: 25%/);
    expect(rules).toMatch(
      /:not\(\[data-wraps\]\)[^{]*td:not\(\[data-shrinks\]\)[^{]*\{[^}]*white-space: nowrap/,
    );
  });
});

describe("every table fits, not only the office lists", () => {
  it("lets a row's heading cell shrink too (Staff Progress names)", () => {
    expect(fitRules()).toMatch(/:is\(td, th\)\[data-shrinks="large"\][^{]*\{[^}]*width: 20%/);
  });

  it("gives tables that don't stack the same shares", () => {
    const rules = fitRules();
    const above640 = rules.slice(rules.indexOf("@media (width >= 40.0625rem)"));

    expect(above640).toMatch(/\[data-shrinks="small"\][^{]*\{[^}]*width: 10%/);
    expect(above640).toMatch(/\[data-shrinks="large"\][^{]*\{[^}]*width: 20%/);
  });

  it("has no table forced wider than its panel: the Catalogue's course table has no minimum width", () => {
    expect(GLOBALS_CSS).not.toContain("--container-course-table");
  });
});

describe("OneLine", () => {
  it("cuts the text with … and shows all of it on hover", () => {
    render(<OneLine>Bachelor of Information Technology at Western Sydney University</OneLine>);

    const text = screen.getByText(
      "Bachelor of Information Technology at Western Sydney University",
    );
    expect(text).toHaveClass("truncate");
    expect(text).toHaveAttribute(
      "title",
      "Bachelor of Information Technology at Western Sydney University",
    );
  });

  it("can be a block of its own, with extra classes", () => {
    render(
      <OneLine block className="font-semibold">
        Sita Karki
      </OneLine>,
    );

    const text = screen.getByText("Sita Karki");
    expect(text.tagName).toBe("DIV");
    expect(text).toHaveClass("truncate", "font-semibold");
  });

  it("keeps injection-shaped text as text", () => {
    const name = '<img src=x onerror="alert(1)">';
    render(<OneLine>{name}</OneLine>);

    expect(screen.getByText(name)).toHaveAttribute("title", name);
    expect(document.querySelector("img")).toBeNull();
  });
});
