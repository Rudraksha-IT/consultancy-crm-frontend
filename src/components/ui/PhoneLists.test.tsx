import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";

import { Button } from "./Button";
import { DataCell, DataRow, DataTable } from "./DataTable";
import { FigureTile } from "./FigureTile";
import { TileGrid } from "./TileGrid";

const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** The phone block of rules for tables (design system: Phones, Lists). */
function phoneTableRules(): string {
  const start = GLOBALS_CSS.indexOf("Phone lists and cards");
  return GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("End of phone lists and cards", start));
}

function StudentList({ opensPage = true }: { opensPage?: boolean }) {
  return (
    <DataTable phone="list" label="Students" stacksBelowTablet>
      <thead>
        <tr>
          <th>Student</th>
          <th>Stage</th>
          <th>Counsellor</th>
          <th>Going to</th>
        </tr>
      </thead>
      <tbody>
        <DataRow opensPage={opensPage}>
          <DataCell part="title">Sita Karki</DataCell>
          <DataCell part="fact">Applying</DataCell>
          <DataCell label="Counsellor">Ramesh</DataCell>
          <DataCell part="line" label="Going to">
            Australia
          </DataCell>
        </DataRow>
      </tbody>
    </DataTable>
  );
}

function cellOf(text: string): HTMLElement {
  const cell = screen.getByText(text).closest("td");
  if (cell === null) throw new Error(`no cell holds ${text}`);
  return cell;
}

describe("a phone list row shows only what the list declares", () => {
  it("marks the name, the line under it and the fact; everything else has no part", () => {
    render(<StudentList />);

    expect(screen.getByRole("table", { name: "Students" })).toHaveAttribute("data-phone", "list");
    expect(cellOf("Sita Karki")).toHaveAttribute("data-part", "title");
    expect(cellOf("Applying")).toHaveAttribute("data-part", "fact");
    expect(cellOf("Australia")).toHaveAttribute("data-part", "line");
    expect(cellOf("Ramesh")).not.toHaveAttribute("data-part");
  });

  it("hides every undeclared cell and the headings at 640 and below", () => {
    const rules = phoneTableRules();

    expect(rules).toContain("@media (width < 40.0625rem)");
    expect(rules).toMatch(/table\[data-phone="list"\] > tbody > tr > td:not\(\[data-part\]\)/);
    expect(rules).toMatch(/table\[data-phone\] > thead/);
  });

  it("draws an arrow on a row that opens a page, and none on a row with its own button", () => {
    const { unmount } = render(<StudentList />);
    expect(cellOf("Sita Karki").closest("tr")).toHaveAttribute("data-opens-page");
    unmount();

    render(<StudentList opensPage={false} />);
    expect(cellOf("Sita Karki").closest("tr")).not.toHaveAttribute("data-opens-page");
    expect(phoneTableRules()).toMatch(/tr\[data-opens-page\]::after/);
  });

  it("opens the page from anywhere on the row at every width, buttons and checkboxes still their own", () => {
    const start = GLOBALS_CSS.indexOf("A row that opens a page");
    const rules = GLOBALS_CSS.slice(start, GLOBALS_CSS.indexOf("Phone lists and cards", start));

    expect(rules).not.toContain("@media");
    expect(rules).toMatch(/tr\[data-opens-page\] td\[data-part="title"\] a::after \{[^}]*inset: 0/);
    expect(rules).toMatch(
      /tr\[data-opens-page\] :is\(button, input, label, select, a\)[^{]*\{[^}]*z-index: 1/,
    );
  });

  it("keeps the name's room: the fact takes half the row at most and is cut with … (ticket 25)", () => {
    const rules = phoneTableRules();

    expect(rules).toMatch(
      /table\[data-phone="list"\] > tbody > tr \{[^}]*grid-template-columns: minmax\(0, 1fr\) fit-content\(50%\) auto/,
    );
    expect(rules).toMatch(
      /td\[data-part="fact"\] \{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis/,
    );
  });

  it("puts one button at the right, and two buttons on their own line", () => {
    render(
      <DataTable phone="list" label="Employees">
        <tbody>
          <DataRow>
            <DataCell part="title">Sita</DataCell>
            <DataCell part="action">
              <Button>Manage</Button>
            </DataCell>
          </DataRow>
          <DataRow>
            <DataCell part="title">Hari</DataCell>
            <DataCell part="actions">
              <Button>Send the code again</Button>
              <Button>Cancel invite</Button>
            </DataCell>
          </DataRow>
        </tbody>
      </DataTable>,
    );

    expect(screen.getByRole("button", { name: "Manage" }).closest("td")).toHaveAttribute(
      "data-part",
      "action",
    );
    expect(screen.getByRole("button", { name: "Cancel invite" }).closest("td")).toHaveAttribute(
      "data-part",
      "actions",
    );
    const rules = phoneTableRules();
    expect(rules).toMatch(/td\[data-part="actions"\][^{]*\{[^}]*grid-column: 1 \/ -1/);
  });

  it("hides a column's own name inside the row's line, and keeps it for screen readers", () => {
    render(<StudentList />);

    const name = within(cellOf("Australia")).getByText("Going to");
    expect(name).toHaveAttribute("data-cell-label");
    expect(phoneTableRules()).toMatch(/table\[data-phone="list"\] \[data-cell-label\]/);
  });
});

describe("an undeclared table shows as cards on a phone, with every column", () => {
  function showReport() {
    render(
      <DataTable label="Countries">
        <thead>
          <tr>
            <th>Country</th>
            <th>Applied</th>
            <th>Offers</th>
          </tr>
        </thead>
        <tbody>
          <DataRow>
            <DataCell>Australia</DataCell>
            <DataCell label="Applied">12</DataCell>
            <DataCell label="Offers">7</DataCell>
          </DataRow>
        </tbody>
      </DataTable>,
    );
  }

  it("is cards by default, and every cell is shown with its column's name", () => {
    showReport();

    expect(screen.getByRole("table", { name: "Countries" })).toHaveAttribute("data-phone", "cards");
    expect(cellOf("12")).toHaveAttribute("data-label", "Applied");
    expect(cellOf("7")).toHaveAttribute("data-label", "Offers");
    expect(cellOf("Australia")).not.toHaveAttribute("data-label");
    expect(phoneTableRules()).toMatch(
      /table\[data-phone="cards"\] td\[data-label\]::before \{\s*content: attr\(data-label\)/,
    );
  });

  it("never scrolls sideways: rows are blocks and no cell is hidden", () => {
    const rules = phoneTableRules();

    expect(rules).toMatch(/table\[data-phone="cards"\] > tbody > tr[^{]*\{[^}]*display: block/);
    expect(rules).not.toMatch(/table\[data-phone="cards"\][^{]*td[^{]*\{[^}]*display: none/);
  });

  it("leaves the cells' text alone above 640: the headings name each cell", () => {
    showReport();

    expect(cellOf("12")).toHaveTextContent(/^12$/);
    expect(screen.getByRole("row", { name: "Australia 12 7" })).toBeInTheDocument();
  });

  it("writes the column's name into the cell in a table that stacks below tablet width", () => {
    render(
      <DataTable label="Applications" stacksBelowTablet>
        <tbody>
          <DataRow>
            <DataCell>Sita</DataCell>
            <DataCell label="Intake">Feb 2027</DataCell>
          </DataRow>
        </tbody>
      </DataTable>,
    );

    const name = within(cellOf("Feb 2027")).getByText("Intake");
    expect(name).toHaveAttribute("data-cell-label");
    expect(name).toHaveClass("tablet:sr-only");
    expect(cellOf("Feb 2027")).not.toHaveAttribute("data-label");
  });
});

describe("number tiles on a phone", () => {
  function showTiles(count: number) {
    render(
      <TileGrid label="Totals">
        {Array.from({ length: count }, (_, index) => (
          <FigureTile
            key={index}
            label={`Tile ${String(index)}`}
            value="NPR 1,80,000"
            footnote="for 4 Students"
          />
        ))}
      </TileGrid>,
    );
    return screen.getByRole("group", { name: "Totals" });
  }

  it("sit two per row, and an odd first tile takes the whole row", () => {
    const grid = showTiles(3);

    expect(grid).toHaveClass(
      "max-phone:grid-cols-2",
      "max-phone:[&>:first-child:nth-last-child(odd)]:col-span-2",
    );
  });

  it("keep the laptop and tablet layout above 640", () => {
    const grid = showTiles(3);

    expect(grid).toHaveClass("phone:grid-cols-2", "wide:grid-cols-3");
  });

  it("can have four across on wide screens", () => {
    render(
      <TileGrid label="Documents" columns={4}>
        <FigureTile label="To check" value={3} />
      </TileGrid>,
    );

    expect(screen.getByRole("group", { name: "Documents" })).toHaveClass("wide:grid-cols-4");
  });

  it("drop the small grey line under the number, and shrink the number to fit", () => {
    showTiles(2);

    expect(screen.getAllByText("for 4 Students")[0]).toHaveClass("max-phone:hidden");
    const number = screen.getAllByText("NPR 1,80,000")[0];
    expect(number).toHaveClass("max-phone:text-figure-phone");
    expect(number?.closest("[data-tile]")).toHaveClass("max-phone:@container");
    expect(GLOBALS_CSS).toMatch(/--text-figure-phone: min\([^)]*cqi\)/);
  });
});
