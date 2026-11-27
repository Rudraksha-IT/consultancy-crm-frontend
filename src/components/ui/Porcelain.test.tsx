import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

import { Button } from "./Button";
import { Chip } from "./Chip";
import { FigureTile } from "./FigureTile";
import { Panel } from "./Panel";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";
import { TileGrid } from "./TileGrid";

/** The Porcelain look (UI revamp, ticket 03): no box around everything, lines and words instead. */
const GLOBALS_CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("Sheets (ticket 21)", () => {
  it("draw a section's content as a white sheet, with no title line", () => {
    render(<Panel>rows</Panel>);

    const panel = screen.getByText("rows");
    expect(panel).toHaveAttribute("data-panel");
    expect(panel).toHaveClass(
      "bg-paper",
      "border",
      "border-sheet-rule",
      "rounded-panel",
      "shadow-raise",
      "overflow-hidden",
    );
    expect(panel.className).not.toMatch(/border-t-2|rule-strong|-mx-gutter/);
  });

  it("keep a padded sheet's content 20 from its edges, 14 from its sides on phones", () => {
    render(<Panel isPadded>form</Panel>);

    expect(screen.getByText("form")).toHaveClass("p-5", "max-phone:px-gutter", "max-phone:py-4");
  });

  it("have no rules left about a title line after tabs or figures", () => {
    expect(GLOBALS_CSS).not.toContain("border-top-width: 0");
    expect(GLOBALS_CSS).not.toContain("rule-strong");
    expect(GLOBALS_CSS).not.toContain("data-no-line");
  });

  it("round a sheet's corners 14 on every width", () => {
    expect(GLOBALS_CSS.match(/--size-panel-corner: [^;]+;/g)).toEqual([
      "--size-panel-corner: 0.875rem;",
    ]);
  });
});

describe("Porcelain buttons", () => {
  it("fill only the main button; the others are words with no box", () => {
    render(
      <>
        <Button variant="primary">Save</Button>
        <Button>Export</Button>
        <Button variant="danger">Remove</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("bg-accent");
    for (const name of ["Export", "Remove"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "border-transparent",
        "bg-transparent",
      );
    }
    expect(screen.getByRole("button", { name: "Remove" })).toHaveClass("text-bad");
  });

  it("keep every button 44 tall to tap", () => {
    render(<Button size="sm">Copy</Button>);

    expect(screen.getByRole("button", { name: "Copy" })).toHaveClass("min-h-control-sm");
    expect(GLOBALS_CSS).toContain("--spacing-control-sm: 2.75rem;");
  });
});

describe("Porcelain statuses", () => {
  it("show a status as a dot and a word, with no filled badge", () => {
    render(<Chip tone="bad">Rejected</Chip>);

    const chip = screen.getByText("Rejected").parentElement;
    expect(chip).toHaveClass("text-bad");
    expect(chip?.className).not.toMatch(/(^|\s)bg-/);
  });

  it("never use the accent for a status: in progress is ink with a hollow ring (ticket 21)", () => {
    render(<Chip tone="accent">Applied</Chip>);

    const chip = screen.getByText("Applied").parentElement;
    expect(chip).toHaveClass("text-ink");
    expect(chip?.outerHTML).not.toContain("accent");
    expect(chip?.firstElementChild).toHaveClass("border-2", "border-ink-3");
    expect(chip?.firstElementChild).not.toHaveClass("bg-current");
  });

  it("keep a filled dot for good, warning and problem", () => {
    render(<Chip tone="good">Verified</Chip>);

    expect(screen.getByText("Verified").parentElement?.firstElementChild).toHaveClass("bg-current");
  });
});

describe("Porcelain tabs and switches", () => {
  it("draw tabs as words with an underline", () => {
    render(
      <Tabs
        label="Student"
        tabs={[
          { id: "a", label: "Applications" },
          { id: "b", label: "Visas" },
        ]}
        selected="a"
        onSelect={vi.fn()}
      >
        <p>Content</p>
      </Tabs>,
    );

    const tab = screen.getByRole("tab", { name: "Applications" });
    expect(tab).toHaveClass("border-b-2", "border-transparent", "aria-selected:text-ink");
    expect(tab.className).not.toMatch(/(^|\s)bg-/);
    // The underline is a line of its own under the chosen tab, so it can slide (ticket 22).
    expect(tab.querySelector("[data-marker]")).toHaveClass("bg-accent", "h-0.5", "-bottom-0.5");
    expect(screen.getByRole("tab", { name: "Visas" }).querySelector("[data-marker]")).toBeNull();
  });

  it("draw a switch as words with an underline, not a sliding box", () => {
    render(
      <SegmentedControl
        label="Tasks"
        options={[
          { value: "todo", label: "To do" },
          { value: "done", label: "Done" },
        ]}
        value="todo"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "Tasks" })).not.toHaveClass("bg-fill-2");
    expect(
      screen.getByRole("button", { name: "To do" }).querySelector("[data-marker]"),
    ).toHaveClass("bg-accent", "h-0.5");
    expect(screen.getByRole("button", { name: "Done" }).querySelector("[data-marker]")).toBeNull();
  });
});

describe("Figures (ticket 21)", () => {
  function grid(columns?: 3 | 4): HTMLElement {
    render(
      <TileGrid label="Money" {...(columns === undefined ? {} : { columns })}>
        <FigureTile label="Collected" value="NPR 10" />
        <FigureTile label="Still to pay" value="NPR 5" />
        <FigureTile label="Owed" value="NPR 1" />
      </TileGrid>,
    );
    return screen.getByRole("group", { name: "Money" });
  }

  it("stand on one sheet", () => {
    const tiles = grid();

    expect(tiles).toHaveAttribute("data-tiles");
    expect(tiles).toHaveClass(
      "bg-paper",
      "border",
      "border-sheet-rule",
      "rounded-panel",
      "shadow-raise",
    );
  });

  it("drop the left line of the first figure of each row, at any number of columns", () => {
    const tiles = grid(4);

    // Lines are only on a figure's right and under it, reaching one pixel out; the sheet cuts off
    // what falls outside it. So no figure has a line on its left, however many fit across.
    expect(tiles).toHaveClass(
      "overflow-hidden",
      "phone:*:border-r",
      "phone:*:border-b",
      "phone:*:-mr-px",
      "phone:*:-mb-px",
    );
    expect(tiles.className).not.toMatch(/border-l(\s|$)/);
    expect(tiles.className).not.toMatch(/nth-child\(\dn\+1\)|nth-child\(odd\)\]:border-l-0/);
  });

  it("have no side lines on phones, inside the sheet's padding", () => {
    expect(grid()).toHaveClass("max-phone:px-gutter", "max-phone:grid-cols-2");
  });
});

describe("Tables on a sheet (ticket 21)", () => {
  const tables = GLOBALS_CSS.slice(GLOBALS_CSS.indexOf("Tables on a sheet (ticket 21)"));

  it("put column heads on a faint band, 42 tall, with a line under them", () => {
    expect(GLOBALS_CSS).toContain("--band: color-mix(in srgb, var(--fill) 55%, var(--paper));");
    expect(tables).toMatch(
      /thead th \{[^}]*height: 2\.625rem;[^}]*border-bottom: 1px solid var\(--rule\);[^}]*background: var\(--band\);/,
    );
  });

  it("keep the first and last cells the sheet's padding from its sides", () => {
    expect(tables).toMatch(/:first-child \{\s*padding-left: var\(--size-gutter\);/);
    expect(tables).toMatch(/:last-child \{\s*padding-right: var\(--size-gutter\);/);
  });

  it("show a soft fill under the pointer on a row that opens something, not under a finger", () => {
    expect(tables).toMatch(
      /@media \(hover: hover\) \{\s*tr\[data-opens-page\]:hover \{\s*background: var\(--row-hover\);/,
    );
  });

  it("show the same fill on a Documents page row, which opens a checklist (ticket 12)", () => {
    expect(tables).toMatch(
      /@media \(hover: hover\) \{[^@]*li\[data-opens-checklist\]:hover \{\s*background: var\(--row-hover\);/,
    );
  });

  it("sit a wide table's cells closer on tablets, so it never runs past its sheet", () => {
    expect(tables).toMatch(
      /@media \(width >= 40\.0625rem\) and \(width < 64\.0625rem\) \{[\s\S]*padding-inline: 0\.5rem;/,
    );
  });
});
